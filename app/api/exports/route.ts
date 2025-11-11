import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // body: { kind, itemId, format, timestamp }
    // TODO: persist to DB (Prisma/your DB) - keep this lightweight for now
    console.log('Export logged:', body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Export log failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
