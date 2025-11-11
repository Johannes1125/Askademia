import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const conversationId = request.nextUrl.searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('message_feedback')
      .select('message_id, reaction')
      .eq('user_id', user.id)
      .eq('conversation_id', conversationId);

    if (error) throw error;
    return NextResponse.json({ feedback: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load feedback' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { conversationId, messageId, reaction } = await request.json();
    if (!conversationId || !messageId) {
      return NextResponse.json({ error: 'conversationId and messageId are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!reaction) {
      const { error } = await supabase
        .from('message_feedback')
        .delete()
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
        .eq('message_id', messageId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (!['like', 'dislike'].includes(reaction)) {
      return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 });
    }

    const { error } = await supabase
      .from('message_feedback')
      .upsert({
        user_id: user.id,
        conversation_id: conversationId,
        message_id: messageId,
        reaction,
      }, { onConflict: 'user_id,message_id' });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save feedback' }, { status: 500 });
  }
}
