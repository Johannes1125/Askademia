import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type CitationFormat = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE';

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

      if (process.env.OPENAI_API_KEY) {
        try {
          // Use OpenAI to extract citation metadata from URL
          const extractionPrompt = `Extract citation information from this URL: ${safeUrl}

Return ONLY a JSON object with these fields (use empty strings if not available):
{
  "title": "article or page title",
  "authors": "author names separated by semicolons, e.g., 'Smith, J.; Johnson, A.'",
  "year": "publication year (YYYY)",
  "url": "${safeUrl}"
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
          if (extractedText) {
            // Try to parse JSON (might be wrapped in markdown code blocks)
            let metadata: any = {};
            try {
              const cleaned = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              metadata = JSON.parse(cleaned);
            } catch {
              // If parsing fails, try to extract fields manually or use defaults
              metadata = { url: safeUrl, title: '', authors: '', year: '' };
            }

            // Now format the citation with extracted data
            const citationPrompt = buildPrompt(
              fmt,
              metadata.title || '',
              metadata.authors || '',
              metadata.year || '',
              metadata.url || safeUrl
            );

            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You return only JSON objects with fullCitation and inTextCitation fields. No other text.' },
                { role: 'user', content: citationPrompt },
              ],
              max_tokens: 200,
              temperature: 0.2,
            });

            const citationText = completion.choices[0]?.message?.content?.trim();
            if (citationText) {
              try {
                const cleaned = citationText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const citations = JSON.parse(cleaned);
                if (citations.fullCitation && citations.inTextCitation) {
                  // Save to database
                  const { data: savedCitation, error: dbError } = await supabase
                    .from('citations')
                    .insert({
                      user_id: user.id,
                      format: fmt,
                      full_citation: citations.fullCitation,
                      in_text_citation: citations.inTextCitation,
                      title: metadata.title || '',
                      authors: metadata.authors || '',
                      year: metadata.year || '',
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
                    fullCitation: citations.fullCitation,
                    inTextCitation: citations.inTextCitation
                  });
                }
              } catch {
                // Fall through to fallback
              }
            }
          }
        } catch (e) {
          console.error('Error extracting from URL:', e);
        }
      }

      // Fallback: create a basic citation from URL only
      const fallbackCitation = {
        fullCitation: `${safeUrl} (n.d.).`,
        inTextCitation: `(n.d.)`
      };

      // Save to database
      const { data: savedCitation, error: dbError } = await supabase
        .from('citations')
        .insert({
          user_id: user.id,
          format: fmt,
          full_citation: fallbackCitation.fullCitation,
          in_text_citation: fallbackCitation.inTextCitation,
          url: safeUrl,
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('Error saving citation:', dbError);
      }

      return NextResponse.json({
        id: savedCitation?.id,
        ...fallbackCitation
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
    let citations: { fullCitation: string; inTextCitation: string } | undefined;
    if (process.env.OPENAI_API_KEY) {
      try {
        const prompt = buildPrompt(fmt, safeTitle, safeAuthors, safeYear, safeUrl);
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
        if (citationText) {
          try {
            const cleaned = citationText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            if (parsed.fullCitation && parsed.inTextCitation) {
              citations = {
                fullCitation: parsed.fullCitation,
                inTextCitation: parsed.inTextCitation
              };
            }
          } catch {
            // Fall through to fallback
          }
        }
      } catch (e) {
        // fall back below
      }
    }

    if (!citations) {
      citations = fallbackFormat(fmt, safeTitle, safeAuthors, safeYear, safeUrl);
    }

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


