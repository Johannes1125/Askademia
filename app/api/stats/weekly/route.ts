import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the start of the current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Get daily counts for prompts/messages
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyData: { day: string; count: number; date: string }[] = [];

    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(startOfWeek);
      dayStart.setDate(startOfWeek.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      // Count messages for this day
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString());

      // Count citations for this day
      const { count: citationCount } = await supabase
        .from('citations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString());

      dailyData.push({
        day: weekDays[i],
        count: (messageCount || 0) + (citationCount || 0),
        date: dayStart.toISOString().split('T')[0]
      });
    }

    // Calculate max for percentage
    const maxCount = Math.max(...dailyData.map(d => d.count), 1);
    const weeklyTotal = dailyData.reduce((sum, d) => sum + d.count, 0);
    
    // Calculate percentages (relative to max activity day)
    const result = dailyData.map(d => ({
      ...d,
      percentage: maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0
    }));

    return NextResponse.json({ 
      daily: result, 
      total: weeklyTotal,
      average: Math.round(weeklyTotal / 7)
    });
  } catch (error: any) {
    console.error("Weekly stats error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch stats" }, { status: 500 });
  }
}

