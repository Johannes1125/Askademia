import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Note: This is a placeholder for feedback. You'll need to create a feedback table in Supabase
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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Fetch conversations with feedback from database
    const { data: conversationsWithFeedback, error: feedbackError } = await supabase
      .from('conversations')
      .select('id, title, rating, feedback, rated_at, user_id')
      .not('rating', 'is', null)
      .order('rated_at', { ascending: false });

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set((conversationsWithFeedback || []).map((c: any) => c.user_id))];
    
    // Fetch profiles for these users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds);

    // Create a map of user_id to username
    const userMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));

    const feedback = (conversationsWithFeedback || []).map((conv: any) => ({
      id: conv.id,
      user: userMap.get(conv.user_id) || 'Anonymous',
      message: conv.feedback || '',
      rating: conv.rating,
      createdAt: conv.rated_at,
    }));

    return NextResponse.json({ feedback, total: feedback.length });
  } catch (error: any) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

