import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { PlagiarismSource } from "@/data/plagiarism/sources";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36 AskademiaBot/1.0";

type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
};

export async function gatherWebSources(
  text: string,
  options: { maxQueries?: number; resultsPerQuery?: number } = {}
): Promise<PlagiarismSource[]> {
  const { maxQueries = 3, resultsPerQuery = 2 } = options;
  const queries = extractQueries(text, maxQueries);
  const collected: PlagiarismSource[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    try {
      const results = await searchDuckDuckGo(query, resultsPerQuery);
      for (const result of results) {
        const normalized = normalizeDuckUrl(result.url);
        if (!normalized || seenUrls.has(normalized)) continue;
        seenUrls.add(normalized);
        const pageText = await fetchPageText(normalized);
        if (!pageText || pageText.length < 400) continue;
        collected.push({
          id: `web-${createHash("sha1").update(normalized).digest("hex")}`,
          title: result.title || normalized,
          url: normalized,
          content: pageText.slice(0, 20000),
        });
      }
    } catch (error) {
      console.warn("Search query failed:", query, error);
    }
  }
  return collected;
}

function extractQueries(text: string, maxQueries: number): string[] {
  const sentences = text
    .split(/[\.\?\!]|[\n\r]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30);
  const queries: string[] = [];
  for (const sentence of sentences) {
    if (queries.length >= maxQueries) break;
    queries.push(sentence.slice(0, 160));
  }
  if (queries.length === 0 && text.trim().length > 30) {
    queries.push(text.trim().slice(0, 160));
  }
  return queries;
}

async function searchDuckDuckGo(
  query: string,
  limit: number
): Promise<SearchResult[]> {
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(
    query
  )}&ia=web`;
  const res = await fetch(searchUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
    },
  });
  if (!res.ok) {
    throw new Error(`Search request failed with ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  $(".result__body").each((_, el) => {
    if (results.length >= limit) return;
    const link = $(el).find(".result__title a, .result__a").attr("href");
    const title = $(el).find(".result__title").text().trim();
    const snippet = $(el).find(".result__snippet").text().trim();
    if (link) {
      results.push({ title, url: link, snippet });
    }
  });
  return results;
}

function normalizeDuckUrl(url: string): string | null {
  if (!url) return null;
  const uddgMatch = url.match(/uddg=([^&]+)/);
  if (uddgMatch) {
    try {
      return decodeURIComponent(uddgMatch[1]);
    } catch {
      return null;
    }
  }
  return url;
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    const html = await res.text();
    return extractReadableText(html);
  } catch (error) {
    console.warn("Primary fetch failed, trying proxy", url, error);
    try {
      const proxyUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
      const res = await fetch(proxyUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        },
      });
      if (!res.ok) throw new Error(`Proxy fetch failed ${res.status}`);
      const html = await res.text();
      return extractReadableText(html);
    } catch (proxyError) {
      console.warn("Proxy fetch failed", proxyError);
      return null;
    }
  }
}

function extractReadableText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text;
}


