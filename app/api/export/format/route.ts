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

    const { content, type, format } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Determine the formatting prompt based on type
    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'conversation') {
      systemPrompt = `You are an academic document formatter. Your task is to format conversation transcripts into well-structured, professional academic documents suitable for export as PDF or DOCX.

Format the conversation with:
- Clear section headers
- Proper academic tone and structure
- Well-organized dialogue presentation
- Professional formatting
- Maintain all important information
- Improve readability while preserving original content`;

      userPrompt = `Format the following conversation transcript into a well-structured academic document. Maintain all the information but improve the organization, clarity, and professional presentation.

Conversation:
"""
${content}
"""

Return the formatted content ready for document export. Use clear headings, proper spacing, and maintain the dialogue structure.`;
    } else if (type === 'citations') {
      systemPrompt = `You are a citation formatter. Your task is to format citation lists into well-structured, professional academic documents.

Format citations with:
- Clear organization by citation style or topic
- Professional academic presentation
- Proper spacing and structure
- Easy-to-read format
- Maintain all citation information`;

      userPrompt = `Format the following citations into a well-structured academic document. Organize them clearly and present them professionally.

Citations:
"""
${content}
"""

Return the formatted citations ready for document export. Use clear headings, proper spacing, and maintain all citation details.`;
    } else {
      systemPrompt = `You are an academic document formatter. Format the provided content into a well-structured, professional document suitable for export.`;
      userPrompt = `Format the following content into a well-structured academic document:

"""
${content}
"""

Return the formatted content ready for document export.`;
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: format === 'pdf' ? 4000 : 4000, // Adjust based on format if needed
    });

    const formattedContent = completion.choices[0]?.message?.content?.trim();
    
    if (!formattedContent) {
      throw new Error('No formatted content received from OpenAI');
    }

    return NextResponse.json({ formattedContent });
  } catch (error: any) {
    console.error('Error formatting content:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to format content' },
      { status: 500 }
    );
  }
}

