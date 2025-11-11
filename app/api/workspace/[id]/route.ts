import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function isValidUuid(id: string | undefined) {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('workspaces')
      .select('id, name, data, created_at, updated_at, user_id')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data || data.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { user_id, ...workspace } = data as any;
    return NextResponse.json({ workspace });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load workspace' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const update: any = { updated_at: new Date().toISOString() };
    if (typeof body.name === 'string') update.name = body.name.trim() || 'Untitled Workspace';
    if (body.data) update.data = body.data;

    const { data, error } = await supabase
      .from('workspaces')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, name, data, created_at, updated_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ workspace: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update workspace' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete workspace' }, { status: 500 });
  }
}
