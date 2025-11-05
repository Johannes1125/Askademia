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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { firstMessage } = await request.json();

    if (!firstMessage || typeof firstMessage !== 'string') {
      return NextResponse.json(
        { error: 'First message is required' },
        { status: 400 }
      );
    }

    // Generate a memorable, concise title using AI
    if (process.env.OPENAI_API_KEY) {
      try {
        const prompt = `Generate a concise, memorable title (max 6 words) for a research/academic conversation based on this first message: "${firstMessage}"

Requirements:
- Be specific and descriptive
- Capture the main topic or question
- Be memorable and easy to identify
- Keep it under 6 words
- Make it professional and academic

Return ONLY the title, no quotes, no explanation, no additional text.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'You generate concise, memorable conversation titles. Return only the title text, no quotes or explanations.' 
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 30,
          temperature: 0.7,
        });

        const aiTitle = completion.choices[0]?.message?.content?.trim();
        
        if (aiTitle) {
          // Clean up the title (remove quotes if present, limit length)
          let cleanedTitle = aiTitle.replace(/^["']|["']$/g, '').trim();
          if (cleanedTitle.length > 60) {
            cleanedTitle = cleanedTitle.slice(0, 57) + '...';
          }
          
          if (cleanedTitle) {
            return NextResponse.json({ title: cleanedTitle });
          }
        }
      } catch (error) {
        console.error('Error generating AI title:', error);
        // Fall through to fallback
      }
    }

    // Fallback: Create a better title from the first message
    const trimmed = firstMessage.trim();
    let fallbackTitle = trimmed.slice(0, 40);
    
    // Try to create a better title by finding the first sentence or question
    const sentences = trimmed.match(/[^.!?]+[.!?]+/);
    if (sentences && sentences[0]) {
      const firstSentence = sentences[0].trim();
      if (firstSentence.length <= 50) {
        fallbackTitle = firstSentence;
      } else {
        // Take first meaningful words
        const words = trimmed.split(/\s+/).slice(0, 6).join(' ');
        fallbackTitle = words + (words.length < trimmed.length ? '...' : '');
      }
    }

    return NextResponse.json({ title: fallbackTitle });
  } catch (error: any) {
    console.error('Error in generate-title:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate title' },
      { status: 500 }
    );
  }
}

