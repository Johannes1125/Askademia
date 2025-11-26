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

    const { researchObjectives, questionType, numberOfQuestions } = await request.json();

    if (!researchObjectives || typeof researchObjectives !== 'string' || !researchObjectives.trim()) {
      return NextResponse.json(
        { error: 'Research objectives are required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const questionTypeLabel = questionType === 'survey' ? 'survey' : 'interview';
    const numQuestions = numberOfQuestions || 10;

    const systemPrompt = `You are an expert research methodology assistant specializing in ${questionTypeLabel} question design. Your task is to generate high-quality, research-aligned questions that help researchers gather meaningful data.

Guidelines for question generation:
- Questions should directly align with the stated research objectives
- Use clear, unambiguous language
- Avoid leading or biased questions
- Ensure questions are answerable and measurable
- Consider ethical implications
- For surveys: Use appropriate question types (multiple choice, Likert scale, open-ended)
- For interviews: Create open-ended questions that encourage detailed responses
- Questions should progress logically from general to specific
- Include demographic/contextual questions when relevant
- Ensure questions are culturally sensitive and inclusive`;

    const userPrompt = `Generate ${numQuestions} ${questionTypeLabel} questions based on the following research objectives:

Research Objectives:
"""
${researchObjectives.trim()}
"""

Requirements:
- Generate exactly ${numQuestions} questions
- Questions should be numbered (1, 2, 3, etc.)
- Each question should be on a new line
- Questions should be well-structured and research-appropriate
- For surveys: Create standalone questions that can be answered directly. Do NOT include response scales (like Likert scales) as separate items - if a question uses a scale, include it in parentheses at the end of the same question line, e.g., "I enjoy using technology for research. (1=Strongly Disagree to 5=Strongly Agree)"
- For interviews: focus on open-ended, exploratory questions
- Ensure questions directly relate to the research objectives
- IMPORTANT: Each numbered item must be a complete, answerable question. Do not output scale descriptions or response options as separate numbered items.

Return the questions in a clear, numbered list format. Each question should be on its own line.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const generatedText = completion.choices[0]?.message?.content?.trim();
    
    if (!generatedText) {
      throw new Error('No questions generated from OpenAI');
    }

    // Parse questions from the response
    const questions = generatedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Filter out empty lines and lines that don't look like questions
        if (!line) return false;
        // Filter out standalone scale descriptions (e.g., "(1 - Strongly Disagree, 2 - Disagree...)")
        if (/^\(?1\s*[-=]\s*(strongly\s*)?disagree/i.test(line)) return false;
        if (/^\(?\d+\s*[-=]\s*(strongly\s*)?(disagree|agree|neutral)/i.test(line)) return false;
        if (/^(scale|rating|options?):/i.test(line)) return false;
        // Check if line starts with a number or bullet point
        return /^(\d+[\.\)]\s+|[-*•]\s+|Q\d*[\.\):]\s*)/i.test(line) || line.length > 20;
      })
      .map(line => {
        // Clean up numbering/bullets
        return line.replace(/^(\d+[\.\)]\s+|[-*•]\s+|Q\d*[\.\):]\s*)/i, '').trim();
      })
      .filter(q => q.length > 0);

    // If parsing didn't work well, try splitting by common patterns
    let finalQuestions = questions;
    if (questions.length < numQuestions * 0.5) {
      // Try alternative parsing
      const altQuestions = generatedText
        .split(/(?=\d+[\.\)]\s+)/)
        .map(q => q.trim())
        .filter(q => q.length > 10)
        .map(q => q.replace(/^\d+[\.\)]\s+/, '').trim())
        .filter(q => q.length > 0);
      
      if (altQuestions.length > questions.length) {
        finalQuestions = altQuestions;
      }
    }

    // Ensure we have at least some questions
    if (finalQuestions.length === 0) {
      // Fallback: split by sentences that look like questions
      finalQuestions = generatedText
        .split(/[.!?]+/)
        .map(q => q.trim())
        .filter(q => q.length > 20 && (q.includes('?') || q.match(/^(what|how|why|when|where|which|who)/i)))
        .slice(0, numQuestions);
    }

    return NextResponse.json({ 
      questions: finalQuestions.slice(0, numQuestions),
      rawResponse: generatedText 
    });
  } catch (error: any) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate questions' },
      { status: 500 }
    );
  }
}

