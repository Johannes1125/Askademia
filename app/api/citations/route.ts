import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type CitationFormat = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE';

type ExtractedMetadata = {
  title?: string;
  authors: string[];
  year?: string;
  publishedAt?: string;
  siteName?: string;
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36 AskademiaBot/1.0';

const TITLE_META_FIELDS = ['og:title', 'twitter:title', 'dc.title', 'dcterms.title', 'citation_title'];
const AUTHOR_META_FIELDS = [
  'citation_author',
  'citation_authors',
  'author',
  'article:author',
  'og:author',
  'dc.creator',
  'dcterms.creator',
  'byl',
  'sailthru.author',
];
const DATE_META_FIELDS = [
  'article:published_time',
  'article:modified_time',
  'og:published_time',
  'publication_date',
  'pubdate',
  'dc.date',
  'dcterms.date',
  'citation_publication_date',
  'citation_date',
  'citation_year',
  'date',
  'sailthru.date',
];
const JSON_LD_TYPES = ['Article', 'NewsArticle', 'BlogPosting', 'ScholarlyArticle', 'CreativeWork', 'WebPage'];

function normalizeText(value?: string | null): string {
  return value ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizeAuthor(value?: string | null): string {
  const cleaned = normalizeText(value);
  if (!cleaned) return '';
  return cleaned.replace(/^by\s+/i, '').trim();
}

function extractYearFromString(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const explicitYear = trimmed.match(/(19|20)\d{2}/);
  if (explicitYear) {
    return explicitYear[0];
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return String(parsed.getFullYear());
  }
  return undefined;
}

function getMetaContent($: cheerio.CheerioAPI, name: string): string | undefined {
  const selectors = [`meta[name="${name}"]`, `meta[property="${name}"]`, `meta[itemprop="${name}"]`];
  for (const selector of selectors) {
    const content = $(selector).attr('content');
    if (content && content.trim()) {
      return content.trim();
    }
  }
  return undefined;
}

function addAuthor(metadata: ExtractedMetadata, value?: string | null) {
  const normalized = normalizeAuthor(value);
  if (!normalized) return;
  if (!metadata.authors.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
    metadata.authors.push(normalized);
  }
}

function addAuthorFromJsonLd(authorData: any, metadata: ExtractedMetadata) {
  if (!authorData) return;
  if (Array.isArray(authorData)) {
    authorData.forEach((entry) => addAuthorFromJsonLd(entry, metadata));
    return;
  }
  if (typeof authorData === 'string') {
    addAuthor(metadata, authorData);
    return;
  }
  if (typeof authorData === 'object') {
    if (Array.isArray(authorData.name)) {
      authorData.name.forEach((name) => {
        if (typeof name === 'string') {
          addAuthor(metadata, name);
        }
      });
      return;
    }
    if (typeof authorData.name === 'string') {
      addAuthor(metadata, authorData.name);
      return;
    }
    const combined = [authorData.givenName, authorData.familyName].filter(Boolean).join(' ');
    if (combined) {
      addAuthor(metadata, combined);
      return;
    }
    if (typeof authorData['@value'] === 'string') {
      addAuthor(metadata, authorData['@value']);
    }
  }
}

function unwrapJsonLd(node: any): any[] {
  if (!node) return [];
  if (Array.isArray(node)) {
    return node.flatMap((entry) => unwrapJsonLd(entry));
  }
  if (typeof node === 'object') {
    const list: any[] = [node];
    if (Array.isArray(node['@graph'])) {
      list.push(...unwrapJsonLd(node['@graph']));
    }
    return list;
  }
  return [];
}

function collectDateCandidates($: cheerio.CheerioAPI): string[] {
  const candidates: string[] = [];
  DATE_META_FIELDS.forEach((field) => {
    const value = getMetaContent($, field);
    if (value) {
      candidates.push(value);
    }
  });
  const timeWithAttr = $('time[datetime]').first().attr('datetime');
  if (timeWithAttr) {
    candidates.push(timeWithAttr);
  }
  const timeText = normalizeText($('time').first().text());
  if (timeText) {
    candidates.push(timeText);
  }
  return candidates;
}

function applyJsonLdMetadata($: cheerio.CheerioAPI, metadata: ExtractedMetadata) {
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const nodes = unwrapJsonLd(parsed);
      nodes.forEach((node) => {
        if (!node || typeof node !== 'object') return;
        const typeValue = String(node['@type'] || node.type || '').toLowerCase();
        if (
          typeValue &&
          !JSON_LD_TYPES.some((allowed) => typeValue.includes(allowed.toLowerCase()))
        ) {
          return;
        }
        if (!metadata.title && typeof node.headline === 'string') {
          metadata.title = normalizeText(node.headline);
        }
        if (!metadata.title && typeof node.name === 'string') {
          metadata.title = normalizeText(node.name);
        }
        const dateValue: string | undefined =
          (typeof node.datePublished === 'string' && node.datePublished) ||
          (typeof node.dateCreated === 'string' && node.dateCreated) ||
          (typeof node.dateModified === 'string' && node.dateModified);
        if (dateValue) {
          if (!metadata.publishedAt) {
            metadata.publishedAt = dateValue;
          }
          if (!metadata.year) {
            const yr = extractYearFromString(dateValue);
            if (yr) {
              metadata.year = yr;
            }
          }
        }
        if (node.author) {
          addAuthorFromJsonLd(node.author, metadata);
        }
      });
    } catch (err) {
      // Ignore malformed JSON-LD blocks
    }
  });
}

async function extractMetadataFromUrl(url: string): Promise<ExtractedMetadata | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const metadata: ExtractedMetadata = { authors: [] };

    for (const field of TITLE_META_FIELDS) {
      if (!metadata.title) {
        const value = getMetaContent($, field);
        if (value) {
          metadata.title = normalizeText(value);
        }
      }
    }

    if (!metadata.title) {
      const h1 = normalizeText($('h1').first().text());
      if (h1) {
        metadata.title = h1;
      }
    }

    if (!metadata.title) {
      metadata.title = normalizeText($('title').first().text());
    }

    AUTHOR_META_FIELDS.forEach((field) => {
      $(`meta[name="${field}"], meta[property="${field}"], meta[itemprop="${field}"]`).each((_, el) => {
        const content = $(el).attr('content');
        if (!content) return;
        if (field.startsWith('citation_')) {
          addAuthor(metadata, content);
          return;
        }
        if (content.includes(';')) {
          content.split(';').forEach((part) => addAuthor(metadata, part));
          return;
        }
        if (/ and /i.test(content)) {
          content.split(/ and /i).forEach((part) => addAuthor(metadata, part));
          return;
        }
        addAuthor(metadata, content);
      });
    });

    if (metadata.authors.length === 0) {
      $('a[rel="author"], .author, .byline, .by-author').each((_, el) => {
        const text = $(el).text();
        if (text) {
          addAuthor(metadata, text);
        }
      });
    }

    const dateCandidates = collectDateCandidates($);
    if (dateCandidates.length > 0) {
      metadata.publishedAt = metadata.publishedAt || dateCandidates[0];
      for (const candidate of dateCandidates) {
        const yr = extractYearFromString(candidate);
        if (yr) {
          metadata.year = yr;
          break;
        }
      }
    }

    metadata.siteName =
      getMetaContent($, 'og:site_name') ||
      getMetaContent($, 'twitter:site') ||
      metadata.siteName ||
      undefined;

    applyJsonLdMetadata($, metadata);

    if (!metadata.year && metadata.publishedAt) {
      const derived = extractYearFromString(metadata.publishedAt);
      if (derived) {
        metadata.year = derived;
      }
    }

    return metadata;
  } catch (error) {
    console.warn('Failed to fetch metadata from URL:', error);
    return null;
  }
}

async function extractMetadataWithAI(url: string) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  try {
    const extractionPrompt = `Extract citation information from this URL: ${url}

Return ONLY a JSON object with these fields (use empty strings if not available):
{
  "title": "article or page title",
  "authors": "author names separated by semicolons, e.g., 'Smith, J.; Johnson, A.'",
  "year": "publication year (YYYY)",
  "url": "${url}"
}

Return ONLY the JSON object, no other text, no markdown, no explanation.`;

    const extraction = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You extract citation metadata from URLs. Return only valid JSON.' },
        { role: 'user', content: extractionPrompt },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const extractedText = extraction.choices[0]?.message?.content?.trim();
    if (!extractedText) {
      return null;
    }
    const cleaned = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const metadata = JSON.parse(cleaned);
    return {
      title: metadata.title || '',
      authors: metadata.authors || '',
      year: metadata.year || '',
    };
  } catch (error) {
    console.error('AI metadata extraction failed:', error);
    return null;
  }
}

async function generateCitationWithAI(
  format: CitationFormat,
  fields: { title: string; authors: string; year: string; url: string }
): Promise<{ fullCitation: string; inTextCitation: string } | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  try {
    const prompt = buildPrompt(format, fields.title, fields.authors, fields.year, fields.url);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You return only JSON objects with fullCitation and inTextCitation fields. No other text.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 200,
      temperature: 0.2,
    });
    const citationText = completion.choices[0]?.message?.content?.trim();
    if (!citationText) {
      return null;
    }
    const cleaned = citationText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.fullCitation && parsed.inTextCitation) {
      return {
        fullCitation: parsed.fullCitation,
        inTextCitation: parsed.inTextCitation,
      };
    }
    return null;
  } catch (error) {
    console.warn('AI citation formatting failed:', error);
    return null;
  }
}

function buildPrompt(
  format: CitationFormat,
  title: string,
  authors: string,
  year: string,
  url: string
) {
  return `You are a strict citation formatter. Generate TWO citations in the specified format.

Fields provided:
- Title: ${title}
- Authors (semicolon-separated): ${authors}
- Year: ${year}
- URL: ${url}

Style: ${format}.

Return ONLY a JSON object with two fields:
{
  "fullCitation": "complete reference list citation",
  "inTextCitation": "in-text/parenthetical citation"
}

Instructions:
- Full citation: Complete reference list format with all details (title, authors, year, URL if applicable)
- In-text citation: Short parenthetical format used within the text body (typically author and year)
- Validate and normalize author names to the style
- If URL exists, include it in full citation per the style
- If a field is missing, omit gracefully without placeholders
- Return ONLY the JSON object, no other text, no markdown code blocks`;
}

function fallbackFormat(
  format: CitationFormat,
  title: string,
  authors: string,
  year: string,
  url: string
): { fullCitation: string; inTextCitation: string } {
  const authorList = authors
    .split(';')
    .map((a) => a.trim())
    .filter(Boolean);
  const joinedAuthors = authorList.join(', ');
  const firstAuthor = authorList[0] || 'Unknown';
  const urlPart = url ? ` ${url}` : '';

  switch (format) {
    case 'APA':
      return {
        fullCitation: `${joinedAuthors} (${year}). ${title}.${urlPart}`.trim(),
        inTextCitation: `(${firstAuthor}, ${year})`
      };
    case 'MLA':
      return {
        fullCitation: `${joinedAuthors}. "${title}." ${year}.${urlPart}`.trim(),
        inTextCitation: `(${firstAuthor})`
      };
    case 'Chicago':
      return {
        fullCitation: `${joinedAuthors}. ${title}. ${year}.${urlPart}`.trim(),
        inTextCitation: `(${firstAuthor} ${year})`
      };
    case 'Harvard':
      return {
        fullCitation: `${joinedAuthors} (${year}) ${title}.${urlPart}`.trim(),
        inTextCitation: `(${firstAuthor}, ${year})`
      };
    case 'IEEE':
      return {
        fullCitation: `${joinedAuthors}, "${title}," ${year}.${urlPart}`.trim(),
        inTextCitation: `[1]`
      };
    default:
      return {
        fullCitation: `${joinedAuthors} (${year}). ${title}.${urlPart}`.trim(),
        inTextCitation: `(${firstAuthor}, ${year})`
      };
  }
}

// GET: Fetch all citations for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: citations, error } = await supabase
      .from('citations')
      .select('id, format, full_citation, in_text_citation, title, authors, year, url, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching citations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch citations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      citations: (citations || []).map((c) => ({
        id: c.id,
        fullCitation: c.full_citation,
        inTextCitation: c.in_text_citation,
        format: c.format,
        createdAt: c.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Error in GET /api/citations:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title = '', authors = '', year = '', url = '', urlOnly = '', format = 'APA' } = body || {} as {
      title?: string;
      authors?: string;
      year?: string;
      url?: string;
      urlOnly?: string;
      format: CitationFormat;
    };

    const fmt = (String(format || 'APA').toUpperCase() as CitationFormat);

    // Handle URL-only citation generation
    if (urlOnly && urlOnly.trim()) {
      const safeUrl = String(urlOnly).trim().slice(0, 1000);
      
      // Validate URL format
      try {
        new URL(safeUrl);
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }

      let extractedTitle = '';
      let extractedAuthors = '';
      let extractedYear = '';
      let siteName = '';

      try {
        const scraped = await extractMetadataFromUrl(safeUrl);
        if (scraped) {
          extractedTitle = scraped.title || '';
          extractedAuthors = scraped.authors.join('; ');
          extractedYear = scraped.year || '';
          siteName = scraped.siteName || '';
        }
      } catch (err) {
        console.warn('Failed to scrape metadata:', err);
      }

      if ((!extractedTitle || !extractedAuthors || !extractedYear) && process.env.OPENAI_API_KEY) {
        const aiMeta = await extractMetadataWithAI(safeUrl);
        if (aiMeta) {
          if (!extractedTitle && aiMeta.title) extractedTitle = aiMeta.title;
          if (!extractedAuthors && aiMeta.authors) extractedAuthors = aiMeta.authors;
          if (!extractedYear && aiMeta.year) extractedYear = aiMeta.year;
        }
      }

      const safeTitle = normalizeText(extractedTitle).slice(0, 500) || normalizeText(siteName) || 'Untitled';
      const safeAuthors = normalizeText(extractedAuthors).slice(0, 500);
      const safeYear = normalizeText(extractedYear).slice(0, 10) || 'n.d.';

      const aiCitation = await generateCitationWithAI(fmt, {
        title: safeTitle,
        authors: safeAuthors,
        year: safeYear === 'n.d.' ? '' : safeYear,
        url: safeUrl,
      });

      const citations =
        aiCitation ||
        fallbackFormat(
          fmt,
          safeTitle,
          safeAuthors || 'Unknown',
          safeYear || 'n.d.',
          safeUrl
        );

      const { data: savedCitation, error: dbError } = await supabase
        .from('citations')
        .insert({
          user_id: user.id,
          format: fmt,
          full_citation: citations.fullCitation,
          in_text_citation: citations.inTextCitation,
          title: safeTitle,
          authors: safeAuthors,
          year: safeYear,
          url: safeUrl,
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('Error saving citation:', dbError);
      }

      return NextResponse.json({
        id: savedCitation?.id,
        ...citations,
      });
    }

    // Handle manual entry (existing logic)
    // Validate all required fields for manual entry
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!authors || !authors.trim()) {
      return NextResponse.json({ error: 'Authors is required' }, { status: 400 });
    }
    if (!year || !year.trim()) {
      return NextResponse.json({ error: 'Year is required' }, { status: 400 });
    }
    if (!url || !url.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Small guardrails and trims
    const safeTitle = String(title || '').trim().slice(0, 500);
    const safeAuthors = String(authors || '').trim().slice(0, 500);
    const safeYear = String(year || '').trim().slice(0, 10);
    const safeUrl = String(url || '').trim().slice(0, 1000);

    // Try OpenAI first, fallback to simple template if unavailable or fails
    const citations =
      (await generateCitationWithAI(fmt, { title: safeTitle, authors: safeAuthors, year: safeYear, url: safeUrl })) ||
      fallbackFormat(fmt, safeTitle, safeAuthors, safeYear, safeUrl);

    // Save to database
    const { data: savedCitation, error: dbError } = await supabase
      .from('citations')
      .insert({
        user_id: user.id,
        format: fmt,
        full_citation: citations.fullCitation,
        in_text_citation: citations.inTextCitation,
        title: safeTitle,
        authors: safeAuthors,
        year: safeYear,
        url: safeUrl,
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Error saving citation:', dbError);
      // Still return the citation even if save fails
    }

    return NextResponse.json({
      id: savedCitation?.id,
      ...citations
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create citation' }, { status: 500 });
  }
}


