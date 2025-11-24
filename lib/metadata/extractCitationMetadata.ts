import * as cheerio from 'cheerio';

export type CitationMetadata = {
  title?: string;
  authors: string[];
  publishedAt?: string;
  year?: string;
  siteName?: string;
  publisher?: string;
  description?: string;
  url: string;
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const clean = (value?: string | null) => (value ? value.replace(/\s+/g, ' ').trim() : undefined);

const uniqueNonEmpty = (values: (string | undefined)[]) =>
  Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim()))));

const parseYear = (input?: string) => {
  if (!input) return undefined;
  const match = input.match(/(19|20)\d{2}/);
  return match ? match[0] : undefined;
};

const normalizeAuthors = (authors: any): string[] => {
  if (!authors) return [];
  if (typeof authors === 'string') {
    return uniqueNonEmpty(
      authors
        .split(/[,;]+/)
        .map((piece) => clean(piece))
    );
  }
  if (Array.isArray(authors)) {
    return uniqueNonEmpty(
      authors
        .map((author) => {
          if (typeof author === 'string') return clean(author);
          if (author && typeof author === 'object') {
            return clean(author.name || author['@name'] || author['@id']);
          }
          return undefined;
        })
    );
  }
  if (typeof authors === 'object') {
    return uniqueNonEmpty([
      clean((authors as any).name),
      clean((authors as any)['@name']),
      clean((authors as any)['@id']),
    ]);
  }
  return [];
};

/**
 * Fetch metadata from a remote URL by reading its HTML markup.
 * Mirrors how tools like QuillBot extract citations—no generative AI involved.
 */
export async function extractCitationMetadata(url: string): Promise<CitationMetadata | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      // Prevent Next.js from caching arbitrary pages
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL metadata: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const getMeta = (attr: string, value: string) => clean($(`meta[${attr}="${value}"]`).attr('content'));

    let title =
      getMeta('property', 'og:title') ||
      getMeta('name', 'twitter:title') ||
      getMeta('name', 'citation_title') ||
      clean($('title').first().text());

    let description =
      getMeta('property', 'og:description') ||
      getMeta('name', 'description') ||
      getMeta('name', 'twitter:description');

    let siteName =
      getMeta('property', 'og:site_name') ||
      getMeta('name', 'application-name') ||
      clean($('meta[name="publisher"]').attr('content')) ||
      clean($('meta[name="dc.publisher"]').attr('content'));

    let publisher =
      clean($('meta[name="publisher"]').attr('content')) ||
      clean($('meta[name="dc.publisher"]').attr('content')) ||
      clean($('meta[property="article:publisher"]').attr('content'));

    let authors = uniqueNonEmpty([
      ...normalizeAuthors($('meta[name="citation_author"]').map((_, el) => $(el).attr('content')).get()),
      getMeta('name', 'author'),
      getMeta('property', 'article:author'),
      getMeta('name', 'dc.creator'),
      getMeta('name', 'dc.contributor'),
      getMeta('name', 'byl'),
    ]);

    let publishedAt =
      getMeta('property', 'article:published_time') ||
      getMeta('name', 'article:published_time') ||
      getMeta('name', 'citation_publication_date') ||
      getMeta('name', 'publication_date') ||
      getMeta('name', 'date') ||
      getMeta('name', 'dc.date') ||
      getMeta('name', 'dc.date.issued');

    let year = parseYear(publishedAt);

    // Parse structured JSON-LD data as a last resort
    if (!title || !authors.length || !publishedAt) {
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const jsonText = $(element).contents().text();
          if (!jsonText) return;
          const parsed = JSON.parse(jsonText);
          const nodes = Array.isArray(parsed) ? parsed : [parsed];
          nodes.forEach((node) => {
            if (!node || typeof node !== 'object') return;
            if (!authors.length) {
              const ldAuthors = normalizeAuthors((node as any).author || (node as any).creator);
              if (ldAuthors.length) {
                authors = uniqueNonEmpty([...authors, ...ldAuthors]);
              }
            }
            if (!publishedAt) {
              const candidate = (node as any).datePublished || (node as any).dateCreated;
              if (candidate) {
                const cleaned = clean(candidate);
                if (cleaned) {
                  publishedAt = cleaned;
                  year = parseYear(cleaned);
                }
              }
            }
            if (!siteName && (node as any).publisher?.name) {
              siteName = clean((node as any).publisher?.name);
            }
            if (!publisher && (node as any).publisher?.name) {
              publisher = clean((node as any).publisher?.name);
            }
            if (!title) {
              title = clean((node as any).headline || (node as any).name);
            }
          });
        } catch {
          // ignore malformed JSON-LD blocks
        }
      });
    }

    const normalizedAuthors = uniqueNonEmpty(authors);

    if (!title && !normalizedAuthors.length && !publishedAt) {
      // Not enough metadata extracted
      return null;
    }

    return {
      url,
      title,
      authors: normalizedAuthors,
      description,
      siteName,
      publisher,
      publishedAt,
      year,
    };
  } catch (error) {
    console.warn('extractCitationMetadata error:', error);
    return null;
  }
}


