import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: Submit rating and feedback for a conversation
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

    const { id } = await params;
    const { rating, feedback } = await request.json();

    // Validate input
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      );
    }

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id, rating')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Check if already rated
    if (conversation.rating !== null) {
      return NextResponse.json(
        { error: 'This conversation has already been rated' },
        { status: 400 }
      );
    }

    // Update conversation with rating and feedback
    const { data: updated, error: updateError } = await supabase
      .from('conversations')
      .update({
        rating,
        feedback: feedback?.trim() || null,
        rated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, rating, feedback, rated_at')
      .single();

    if (updateError) {
      console.error('Error updating conversation rating:', updateError);
      return NextResponse.json(
        { error: 'Failed to save rating' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      conversation: updated 
    });
  } catch (error: any) {
    console.error('Error in POST /api/conversations/[id]/rating:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Check if conversation has been rated
export async function GET(
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

    const { id } = await params;

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('rating, feedback, rated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      rated: conversation.rating !== null,
      rating: conversation.rating,
      feedback: conversation.feedback,
      ratedAt: conversation.rated_at,
    });
  } catch (error: any) {
    console.error('Error in GET /api/conversations/[id]/rating:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

