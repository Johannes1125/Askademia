import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function isValidUuid(id: string | undefined) {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 });
    }

    const { section, title, content, tags } = await request.json();
    if (!['notes','drafts','references'].includes(section)) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: ws, error } = await supabase
      .from('workspaces')
      .select('id, data, user_id')
      .eq('id', id)
      .single();
    if (error || !ws || ws.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const now = new Date().toISOString();
    const item = {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      title: (title || '').toString(),
      content: (content || '').toString(),
      tags: Array.isArray(tags) ? tags.slice(0, 20) : [],
      updatedAt: now,
    };

    const nextData: any = { ...(ws as any).data };
    const list: any[] = Array.isArray(nextData?.[section]) ? nextData[section] : [];
    nextData[section] = [item, ...list];

    const { data: updated, error: upErr } = await supabase
      .from('workspaces')
      .update({ data: nextData, updated_at: now })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, data')
      .single();

    if (upErr) throw upErr;
    return NextResponse.json({ ok: true, item, workspace: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to add item' }, { status: 500 });
  }
}
