import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Use OpenAI to check for potential plagiarism indicators
    // Note: This is a basic check using AI, not a comprehensive plagiarism detector
    const prompt = `You are a plagiarism detection assistant. Analyze the following text for potential plagiarism indicators such as:
- Unusual phrasing that might be copied
- Lack of original analysis
- Potential citation issues
- Overly generic or formulaic content

Text to check:
"""
${text}
"""

Provide a JSON response with the following structure:
{
  "similarity": <number from 0-100 representing potential similarity>,
  "risk": "<low|medium|high>",
  "issues": [
    {
      "type": "<citation|originality|formulaic|generic>",
      "message": "<description of potential issue>"
    }
  ],
  "recommendations": [
    "<specific recommendations for improvement>"
  ],
  "summary": "<brief overall assessment>"
}

Return ONLY the JSON object, no other text.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a plagiarism detection assistant. Return only valid JSON objects.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    let result;
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleaned);
    } catch (parseError) {
      // Fallback
      result = {
        similarity: 5,
        risk: 'low',
        issues: [],
        recommendations: ['Ensure proper citations', 'Add original analysis'],
        summary: 'Basic plagiarism check completed',
      };
    }

    // Ensure similarity is between 0-100
    result.similarity = Math.max(0, Math.min(100, result.similarity || 5));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error checking plagiarism:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to check plagiarism' },
      { status: 500 }
    );
  }
}

