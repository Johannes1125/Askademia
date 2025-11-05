import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') || 'day'; // day, month, year

    // Get total users count
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get new users count (within date range if provided)
    let newUsersQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (startDate && endDate) {
      newUsersQuery = newUsersQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      newUsersQuery = newUsersQuery.gte('created_at', thirtyDaysAgo.toISOString());
    }

    const { count: newUsers } = await newUsersQuery;

    // Get conversations count
    let conversationsQuery = supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });
    
    if (startDate && endDate) {
      conversationsQuery = conversationsQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { count: totalConversations } = await conversationsQuery;

    // Get messages count
    let messagesQuery = supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
    
    if (startDate && endDate) {
      messagesQuery = messagesQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { count: totalMessages } = await messagesQuery;

    // Get citations count
    let citationsQuery = supabase
      .from('citations')
      .select('*', { count: 'exact', head: true });
    
    if (startDate && endDate) {
      citationsQuery = citationsQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { count: totalCitations } = await citationsQuery;

    // Get activity data grouped by period
    let activityData: any[] = [];
    
    if (period === 'day') {
      // Get daily activity for last 30 days
      const { data: conversations } = await supabase
        .from('conversations')
        .select('created_at')
        .order('created_at', { ascending: true });
      
      if (conversations) {
        const activityMap = new Map<string, number>();
        conversations.forEach(conv => {
          const date = new Date(conv.created_at).toISOString().split('T')[0];
          activityMap.set(date, (activityMap.get(date) || 0) + 1);
        });
        
        // Fill in missing days
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          activityData.push({
            date: dateStr,
            conversations: activityMap.get(dateStr) || 0,
          });
        }
      }
    } else if (period === 'month') {
      // Get monthly activity for last 12 months
      const { data: conversations } = await supabase
        .from('conversations')
        .select('created_at')
        .order('created_at', { ascending: true });
      
      if (conversations) {
        const activityMap = new Map<string, number>();
        conversations.forEach(conv => {
          const date = new Date(conv.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          activityMap.set(monthKey, (activityMap.get(monthKey) || 0) + 1);
        });
        
        // Fill in missing months
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
          const date = new Date(today);
          date.setMonth(date.getMonth() - i);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          activityData.push({
            date: monthKey,
            conversations: activityMap.get(monthKey) || 0,
          });
        }
      }
    } else if (period === 'year') {
      // Get yearly activity
      const { data: conversations } = await supabase
        .from('conversations')
        .select('created_at')
        .order('created_at', { ascending: true });
      
      if (conversations) {
        const activityMap = new Map<string, number>();
        conversations.forEach(conv => {
          const year = new Date(conv.created_at).getFullYear().toString();
          activityMap.set(year, (activityMap.get(year) || 0) + 1);
        });
        
        // Get last 5 years
        const currentYear = new Date().getFullYear();
        for (let i = 4; i >= 0; i--) {
          const year = (currentYear - i).toString();
          activityData.push({
            date: year,
            conversations: activityMap.get(year) || 0,
          });
        }
      }
    }

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      newUsers: newUsers || 0,
      totalConversations: totalConversations || 0,
      totalMessages: totalMessages || 0,
      totalCitations: totalCitations || 0,
      activityData,
      period,
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

