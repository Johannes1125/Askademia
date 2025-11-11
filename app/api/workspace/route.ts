import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Expected table schema:
// table: workspaces
// columns: id (uuid), user_id (uuid), name (text), data (jsonb), created_at (timestamptz), updated_at (timestamptz)

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('workspaces')
      .select('id, name, data, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ workspaces: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load workspaces' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await request.json();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('workspaces')
      .insert({ user_id: user.id, name: name?.trim() || 'Untitled Workspace', data: { notes: [], drafts: [], references: [] }, created_at: now, updated_at: now })
      .select('id, name, data, created_at, updated_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ workspace: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create workspace' }, { status: 500 });
  }
}
