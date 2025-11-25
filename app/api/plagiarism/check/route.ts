import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detectMatches } from '@/lib/plagiarism/detector';
import { gatherWebSources } from '@/lib/plagiarism/web';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { text } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const dynamicSources = await gatherWebSources(text, {
      maxQueries: 3,
      resultsPerQuery: 2,
    });

    const { matches, summary: sourceSummary } = detectMatches(text, dynamicSources);
    const totalMatchedChars = matches.reduce((sum, segment) => sum + (segment.end - segment.start), 0);
    const similarity = Math.round(Math.min(100, (totalMatchedChars / Math.max(1, text.length)) * 100));
    const risk = similarity > 45 ? 'high' : similarity > 20 ? 'medium' : 'low';

    const recommendations: string[] = [];
    if (matches.length > 0) {
      recommendations.push('Rephrase or cite the highlighted sections that overlap with external sources.');
      const uniqueSources = Array.from(new Set(matches.map((m) => m.sourceTitle)));
      recommendations.push(`Review the following sources for proper attribution: ${uniqueSources.join(', ')}.`);
    } else {
      recommendations.push('No overlaps detected in the current reference set. Maintain detailed citations for originality.');
    }

    const summary =
      matches.length === 0
        ? 'No overlapping passages were found in the reference corpus.'
        : `Detected ${matches.length} overlapping passage${matches.length > 1 ? 's' : ''} across ${sourceSummary.length} source${sourceSummary.length === 1 ? '' : 's'}.`;

    return NextResponse.json({
      similarity,
      risk,
      matches,
      sources: sourceSummary,
      recommendations,
      summary,
    });
  } catch (error: any) {
    console.error('Error checking plagiarism:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to check plagiarism' },
      { status: 500 }
    );
  }
}

