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

    // Use OpenAI to check grammar
    const prompt = `You are a grammar and writing quality checker. Analyze the following text for grammar, spelling, punctuation, style, clarity, and academic writing quality.

Text to check:
"""
${text}
"""

Provide a JSON response with the following structure:
{
  "score": <number from 0-100>,
  "issues": [
    {
      "type": "<grammar|spelling|style|clarity|punctuation>",
      "message": "<brief description of the issue>",
      "severity": "<low|medium|high>"
    }
  ],
  "suggestions": [
    "<specific improvement suggestions>"
  ],
  "summary": "<brief overall assessment>"
}

Focus on:
- Grammar and syntax errors
- Spelling mistakes
- Punctuation issues
- Academic writing style
- Sentence structure and clarity
- Passive voice usage
- Word choice and verb strength
- Sentence length
- Overall readability

Return ONLY the JSON object, no other text.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a grammar checker. Return only valid JSON objects.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
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
      // Fallback: calculate basic score and provide default issues
      const wordCount = text.split(/\s+/).length;
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
      
      const issues = [];
      if (avgSentenceLength > 25) {
        issues.push({
          type: 'style',
          message: 'Sentence may be too long',
          severity: 'medium',
        });
      }
      
      const score = Math.max(0, 100 - (issues.length * 10));
      
      result = {
        score,
        issues: issues.length > 0 ? issues : [],
        suggestions: ['Review sentence structure', 'Check for passive voice'],
        summary: 'Basic grammar check completed',
      };
    }

    // Ensure score is between 0-100
    result.score = Math.max(0, Math.min(100, result.score || 80));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error checking grammar:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to check grammar' },
      { status: 500 }
    );
  }
}

