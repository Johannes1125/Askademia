import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: Add a message to a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: conversationId } = await params;
    const { role, content } = await request.json();

    // Validate input
    if (!role || !['user', 'assistant'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "user" or "assistant"' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Limit message content length to 5000 characters to save storage space
    const MAX_MESSAGE_LENGTH = 5000;
    const trimmedContent = content.trim();
    const contentToSave = trimmedContent.length > MAX_MESSAGE_LENGTH 
      ? trimmedContent.substring(0, MAX_MESSAGE_LENGTH) + '\n\n[... Message truncated for storage ...]'
      : trimmedContent;

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (convError) {
      console.error('Error fetching conversation:', convError);
      let errorMessage = 'Conversation not found';
      if (convError.code === 'PGRST116' || convError.message?.includes('relation') || convError.message?.includes('does not exist')) {
        errorMessage = 'Database tables not found. Please run the schema in Supabase SQL Editor.';
      }
      return NextResponse.json(
        { error: errorMessage, details: convError.code || convError.message },
        { status: convError.code === 'PGRST116' ? 500 : 404 }
      );
    }

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content: contentToSave,
      })
      .select('id, role, content, created_at')
      .single();

    if (error) {
      console.error('Error creating message:', error);
      // Provide more detailed error message
      let errorMessage = 'Failed to create message';
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        errorMessage = 'Database tables not found. Please run the schema in Supabase SQL Editor.';
      } else if (error.code === '23503' || error.message?.includes('foreign key')) {
        errorMessage = 'Conversation not found or invalid.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      return NextResponse.json(
        { error: errorMessage, details: error.code || error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: {
        id: message.id,
        role: message.role,
        content: message.content,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/conversations/[id]/messages:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Add multiple messages at once (for batch updates)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: conversationId } = await params;
    const { messages } = await request.json();

    // Validate input
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages must be an array' },
        { status: 400 }
      );
    }

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Validate and format messages
    const MAX_MESSAGE_LENGTH = 5000;
    const messagesToInsert = messages.map((msg: any) => {
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        throw new Error('Invalid role in messages');
      }
      if (!msg.content || typeof msg.content !== 'string') {
        throw new Error('Invalid content in messages');
      }
      const trimmedContent = msg.content.trim();
      const contentToSave = trimmedContent.length > MAX_MESSAGE_LENGTH 
        ? trimmedContent.substring(0, MAX_MESSAGE_LENGTH) + '\n\n[... Message truncated for storage ...]'
        : trimmedContent;
      return {
        conversation_id: conversationId,
        role: msg.role,
        content: contentToSave,
      };
    });

    // Insert messages
    const { data: insertedMessages, error } = await supabase
      .from('messages')
      .insert(messagesToInsert)
      .select('id, role, content, created_at');

    if (error) {
      console.error('Error creating messages:', error);
      return NextResponse.json(
        { error: 'Failed to create messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      messages: (insertedMessages || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
    });
  } catch (error: any) {
    console.error('Error in PUT /api/conversations/[id]/messages:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

