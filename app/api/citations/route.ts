import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type CitationFormat = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE';

function buildPrompt(
  format: CitationFormat,
  title: string,
  authors: string,
  year: string,
  url: string
) {
  return `You are a strict citation formatter. Output ONE citation ONLY, no prose, no backticks.
Fields provided:
- Title: ${title}
- Authors (semicolon-separated): ${authors}
- Year: ${year}
- URL: ${url}

Style: ${format}.
Instructions:
- Validate and normalize author names to the style.
- If URL exists, include it per the style.
- If a field is missing, omit gracefully without placeholders.
- No additional text. Output a single line citation.`;
}

function fallbackFormat(
  format: CitationFormat,
  title: string,
  authors: string,
  year: string,
  url: string
): string {
  const authorList = authors
    .split(';')
    .map((a) => a.trim())
    .filter(Boolean);
  const joinedAuthors = authorList.join(', ');
  const urlPart = url ? ` ${url}` : '';

  switch (format) {
    case 'APA':
      return `${joinedAuthors} (${year}). ${title}.${urlPart}`.trim();
    case 'MLA':
      return `${joinedAuthors}. "${title}." ${year}.${urlPart}`.trim();
    case 'Chicago':
      return `${joinedAuthors}. ${title}. ${year}.${urlPart}`.trim();
    case 'Harvard':
      return `${joinedAuthors} (${year}) ${title}.${urlPart}`.trim();
    case 'IEEE':
      return `${joinedAuthors}, "${title}," ${year}.${urlPart}`.trim();
    default:
      return `${joinedAuthors} (${year}). ${title}.${urlPart}`.trim();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title = '', authors = '', year = '', url = '', format = 'APA' } = body || {} as {
      title: string;
      authors: string;
      year: string;
      url: string;
      format: CitationFormat;
    };

    if (!title && !authors) {
      return NextResponse.json({ error: 'Provide at least title or authors' }, { status: 400 });
    }

    // Small guardrails and trims
    const safeTitle = String(title || '').trim().slice(0, 500);
    const safeAuthors = String(authors || '').trim().slice(0, 500);
    const safeYear = String(year || '').trim().slice(0, 10);
    const safeUrl = String(url || '').trim().slice(0, 1000);
    const fmt = (String(format || 'APA').toUpperCase() as CitationFormat);

    // Try OpenAI first, fallback to simple template if unavailable or fails
    let citation: string | undefined;
    if (process.env.OPENAI_API_KEY) {
      try {
        const prompt = buildPrompt(fmt, safeTitle, safeAuthors, safeYear, safeUrl);
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You return only formatted citations. No extra text.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 120,
          temperature: 0.2,
        });
        citation = completion.choices[0]?.message?.content?.trim();
      } catch (e) {
        // fall back below
      }
    }

    if (!citation) {
      citation = fallbackFormat(fmt, safeTitle, safeAuthors, safeYear, safeUrl);
    }

    return NextResponse.json({ citation });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create citation' }, { status: 500 });
  }
}


