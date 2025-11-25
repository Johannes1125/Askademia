import { createHash, randomUUID } from "crypto";
import { PLAGIARISM_SOURCES, PlagiarismSource } from "@/data/plagiarism/sources";

type Token = {
  value: string;
  start: number;
  end: number;
};

type Shingle = {
  hash: string;
  start: number;
  end: number;
};

type SourceIndex = {
  source: PlagiarismSource;
  shingles: Shingle[];
  shingleMap: Map<string, Shingle[]>;
};

export type MatchSegment = {
  id: string;
  sourceId: string;
  sourceTitle: string;
  sourceUrl: string;
  snippet: string;
  matchedText: string;
  start: number;
  end: number;
  overlapRatio: number;
};

export type SourceSummary = {
  id: string;
  title: string;
  url: string;
  matchCount: number;
  totalOverlap: number;
};

const SHINGLE_SIZE = 6;

export function buildSourceIndex(sources: PlagiarismSource[]): SourceIndex[] {
  return sources.map((source) => {
    const tokens = tokenize(source.content);
    const shingles = buildShingles(tokens);
    const shingleMap = new Map<string, Shingle[]>();
    shingles.forEach((shingle) => {
      const list = shingleMap.get(shingle.hash) || [];
      list.push(shingle);
      shingleMap.set(shingle.hash, list);
    });
    return { source, shingles, shingleMap };
  });
}

const defaultIndex = buildSourceIndex(PLAGIARISM_SOURCES);

export function detectMatches(
  text: string,
  additionalSources: PlagiarismSource[] = []
) {
  const baseResult = compareAgainstIndexes(text, defaultIndex);
  if (!additionalSources.length) {
    return baseResult;
  }
  const extraIndex = buildSourceIndex(additionalSources);
  const extraResult = compareAgainstIndexes(text, extraIndex);
  return mergeResults(baseResult, extraResult);
}

function mergeResults(
  base: { matches: MatchSegment[]; summary: SourceSummary[] },
  extra: { matches: MatchSegment[]; summary: SourceSummary[] }
) {
  const combinedMatches = [...base.matches, ...extra.matches];
  const summaryMap = new Map<string, SourceSummary>();
  [...base.summary, ...extra.summary].forEach((item) => {
    const existing = summaryMap.get(item.id);
    if (existing) {
      existing.matchCount += item.matchCount;
      existing.totalOverlap += item.totalOverlap;
    } else {
      summaryMap.set(item.id, { ...item });
    }
  });
  return {
    matches: combinedMatches,
    summary: Array.from(summaryMap.values()).sort(
      (a, b) => b.totalOverlap - a.totalOverlap
    ),
  };
}

function compareAgainstIndexes(text: string, indexes: SourceIndex[]) {
  const tokens = tokenize(text);
  const shingles = buildShingles(tokens);
  if (shingles.length === 0) {
    return { matches: [] as MatchSegment[], summary: [] as SourceSummary[] };
  }

  const rawMatches: {
    source: PlagiarismSource;
    start: number;
    end: number;
    sourceStart: number;
    sourceEnd: number;
  }[] = [];

  for (const shingle of shingles) {
    for (const indexed of indexes) {
      const occurrences = indexed.shingleMap.get(shingle.hash);
      if (!occurrences || occurrences.length === 0) continue;
      occurrences.forEach((occ) => {
        rawMatches.push({
          source: indexed.source,
          start: shingle.start,
          end: shingle.end,
          sourceStart: occ.start,
          sourceEnd: occ.end,
        });
      });
    }
  }

  if (rawMatches.length === 0) {
    return { matches: [] as MatchSegment[], summary: [] as SourceSummary[] };
  }

  rawMatches.sort((a, b) => a.start - b.start);

  const collapsed: MatchSegment[] = [];
  for (const match of rawMatches) {
    const last = collapsed[collapsed.length - 1];
    if (
      last &&
      last.sourceId === match.source.id &&
      match.start <= last.end + 20
    ) {
      last.end = Math.max(last.end, match.end);
      last.snippet = extractSnippet(
        match.source.content,
        match.sourceStart,
        match.sourceEnd
      );
      last.matchedText = ""; // will recalc after loop
    } else {
      collapsed.push({
        id: randomUUID(),
        sourceId: match.source.id,
        sourceTitle: match.source.title,
        sourceUrl: match.source.url,
        start: match.start,
        end: match.end,
        snippet: extractSnippet(
          match.source.content,
          match.sourceStart,
          match.sourceEnd
        ),
        matchedText: "",
        overlapRatio: 0,
      });
    }
  }

  const textLength = text.length || 1;
  collapsed.forEach((segment) => {
    segment.matchedText = text.slice(segment.start, segment.end);
    segment.overlapRatio = (segment.end - segment.start) / textLength;
  });

  const filtered = collapsed.filter(
    (segment) => segment.matchedText.trim().length > 20
  );

  const sourceSummaryMap = new Map<string, SourceSummary>();
  filtered.forEach((segment) => {
    const summary = sourceSummaryMap.get(segment.sourceId) || {
      id: segment.sourceId,
      title: segment.sourceTitle,
      url: segment.sourceUrl,
      matchCount: 0,
      totalOverlap: 0,
    };
    summary.matchCount += 1;
    summary.totalOverlap += segment.end - segment.start;
    sourceSummaryMap.set(segment.sourceId, summary);
  });

  return {
    matches: filtered,
    summary: Array.from(sourceSummaryMap.values()).sort(
      (a, b) => b.totalOverlap - a.totalOverlap
    ),
  };
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      value: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return tokens;
}

function canonicalize(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function buildShingles(tokens: Token[]): Shingle[] {
  const shingles: Shingle[] = [];
  for (let i = 0; i <= tokens.length - SHINGLE_SIZE; i++) {
    const slice = tokens.slice(i, i + SHINGLE_SIZE);
    const canonical = slice
      .map((token) => canonicalize(token.value))
      .filter(Boolean)
      .join(" ");
    if (!canonical) continue;
    const hash = createHash("sha1").update(canonical).digest("hex");
    shingles.push({
      hash,
      start: slice[0].start,
      end: slice[slice.length - 1].end,
    });
  }
  return shingles;
}

function extractSnippet(content: string, start: number, end: number) {
  const padding = 80;
  const snippetStart = Math.max(0, start - padding);
  const snippetEnd = Math.min(content.length, end + padding);
  return content.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim();
}


