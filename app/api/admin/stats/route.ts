import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const parseDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toStartOfDayUTC = (date: Date) => {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy.toISOString();
};

const toEndOfDayUTC = (date: Date) => {
  const copy = new Date(date);
  copy.setUTCHours(23, 59, 59, 999);
  return copy.toISOString();
};

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

    // Use admin client for fetching all data (bypasses RLS)
    const adminClient = createAdminClient();

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') || 'day'; // day, month, year
    const hasDateFilter = Boolean(startDate || endDate);

    const now = new Date();
    let start = hasDateFilter ? parseDate(startDate) : null;
    let end = hasDateFilter ? parseDate(endDate) : null;

    if (start && start > now) start = new Date(now);
    if (end && end > now) end = new Date(now);

    if (hasDateFilter) {
      if (start && !end) end = new Date(now);
      if (!start && end) {
        const fallback = new Date(end);
        fallback.setDate(fallback.getDate() - 30);
        start = fallback;
      }
      if (start && end && start > end) {
        const temp = start;
        start = end;
        end = temp;
      }
    }

    const startIso = start && hasDateFilter ? toStartOfDayUTC(start) : null;
    const endIso = end && hasDateFilter ? toEndOfDayUTC(end) : null;

    // Get total users count
    const { count: totalUsers } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get new users count (within date range if provided)
    let newUsersQuery = adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (startIso || endIso) {
      if (startIso) newUsersQuery = newUsersQuery.gte('created_at', startIso);
      if (endIso) newUsersQuery = newUsersQuery.lte('created_at', endIso);
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      newUsersQuery = newUsersQuery.gte('created_at', thirtyDaysAgo.toISOString());
    }

    const { count: newUsers } = await newUsersQuery;

    // Get conversations count
    let conversationsQuery = adminClient
      .from('conversations')
      .select('*', { count: 'exact', head: true });
    
    if (startIso) conversationsQuery = conversationsQuery.gte('created_at', startIso);
    if (endIso) conversationsQuery = conversationsQuery.lte('created_at', endIso);

    const { count: totalConversations } = await conversationsQuery;

    // Get messages count
    let messagesQuery = adminClient
      .from('messages')
      .select('*', { count: 'exact', head: true });
    
    if (startIso) messagesQuery = messagesQuery.gte('created_at', startIso);
    if (endIso) messagesQuery = messagesQuery.lte('created_at', endIso);

    const { count: totalMessages } = await messagesQuery;

    // Get citations count
    let citationsQuery = adminClient
      .from('citations')
      .select('*', { count: 'exact', head: true });
    
    if (startIso) citationsQuery = citationsQuery.gte('created_at', startIso);
    if (endIso) citationsQuery = citationsQuery.lte('created_at', endIso);

    const { count: totalCitations } = await citationsQuery;

    // Get activity data grouped by period
    let activityData: any[] = [];
    
    // Build query for conversations with date filtering
    let activityQuery = adminClient
      .from('conversations')
      .select('created_at')
      .order('created_at', { ascending: true });
    
    if (startIso) activityQuery = activityQuery.gte('created_at', startIso);
    if (endIso) activityQuery = activityQuery.lte('created_at', endIso);
    
    const { data: conversations } = await activityQuery;

    // Build query for messages with date filtering
    let messagesActivityQuery = adminClient
      .from('messages')
      .select('created_at')
      .order('created_at', { ascending: true });
    
    if (startIso) messagesActivityQuery = messagesActivityQuery.gte('created_at', startIso);
    if (endIso) messagesActivityQuery = messagesActivityQuery.lte('created_at', endIso);
    
    const { data: messagesData } = await messagesActivityQuery;
    
    // Determine date range for filling gaps
    let rangeStart: Date;
    let rangeEnd: Date;
    
    if (hasDateFilter && start && end) {
      rangeStart = new Date(start);
      rangeEnd = new Date(end);
    } else if (hasDateFilter && start) {
      rangeStart = new Date(start);
      rangeEnd = new Date(now);
    } else if (hasDateFilter && end) {
      rangeEnd = new Date(end);
      rangeStart = new Date(end);
      rangeStart.setDate(rangeStart.getDate() - 30);
    } else {
      // Default to last 30 days
      rangeEnd = new Date(now);
      rangeStart = new Date(now);
      rangeStart.setDate(rangeStart.getDate() - 30);
    }

    const conversationMap = new Map<string, number>();
    const messagesMap = new Map<string, number>();

    // Process conversations
    if (conversations && conversations.length > 0) {
      if (period === 'day') {
        conversations.forEach(conv => {
          const date = new Date(conv.created_at).toISOString().split('T')[0];
          conversationMap.set(date, (conversationMap.get(date) || 0) + 1);
        });
      } else if (period === 'month') {
        conversations.forEach(conv => {
          const date = new Date(conv.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          conversationMap.set(monthKey, (conversationMap.get(monthKey) || 0) + 1);
        });
      } else if (period === 'year') {
        conversations.forEach(conv => {
          const year = new Date(conv.created_at).getFullYear().toString();
          conversationMap.set(year, (conversationMap.get(year) || 0) + 1);
        });
      }
    }

    // Process messages
    if (messagesData && messagesData.length > 0) {
      if (period === 'day') {
        messagesData.forEach(msg => {
          const date = new Date(msg.created_at).toISOString().split('T')[0];
          messagesMap.set(date, (messagesMap.get(date) || 0) + 1);
        });
      } else if (period === 'month') {
        messagesData.forEach(msg => {
          const date = new Date(msg.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          messagesMap.set(monthKey, (messagesMap.get(monthKey) || 0) + 1);
        });
      } else if (period === 'year') {
        messagesData.forEach(msg => {
          const year = new Date(msg.created_at).getFullYear().toString();
          messagesMap.set(year, (messagesMap.get(year) || 0) + 1);
        });
      }
    }

    // Build activity data with both conversations and messages
    if (period === 'day') {
      const current = new Date(rangeStart);
      while (current <= rangeEnd) {
        const dateStr = current.toISOString().split('T')[0];
        activityData.push({
          date: dateStr,
          conversations: conversationMap.get(dateStr) || 0,
          messages: messagesMap.get(dateStr) || 0,
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (period === 'month') {
      const current = new Date(rangeStart);
      current.setDate(1);
      const endMonth = new Date(rangeEnd);
      endMonth.setDate(1);
      while (current <= endMonth) {
        const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        activityData.push({
          date: monthKey,
          conversations: conversationMap.get(monthKey) || 0,
          messages: messagesMap.get(monthKey) || 0,
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else if (period === 'year') {
      const startYear = rangeStart.getFullYear();
      const endYear = rangeEnd.getFullYear();
      for (let year = startYear; year <= endYear; year++) {
        activityData.push({
          date: year.toString(),
          conversations: conversationMap.get(year.toString()) || 0,
          messages: messagesMap.get(year.toString()) || 0,
        });
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
