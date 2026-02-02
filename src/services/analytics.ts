import { supabase } from '../lib/supabase';

// Generate a unique session ID
function getSessionId(): string {
  const key = 'oshitike_session_id';
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

// Track a page view
export async function trackPageView(
  path: string,
  userId?: string
): Promise<void> {
  if (!supabase) return;

  try {
    const sessionId = getSessionId();
    await (supabase.from('page_views') as any).insert({
      path,
      user_id: userId || null,
      session_id: sessionId,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent || null,
    });
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.warn('Failed to track page view:', error);
  }
}

export interface AnalyticsSummary {
  total_page_views: number;
  unique_visitors: number;
  registered_users: number;
  new_users: number;
  page_views_by_day: Array<{ date: string; views: number }> | null;
  top_pages: Array<{ path: string; views: number }> | null;
}

export interface AnalyticsResult {
  success: boolean;
  data?: AnalyticsSummary;
  error?: string;
}

// Get analytics summary
export async function getAnalyticsSummary(
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const { data, error } = await (supabase.rpc as any)('get_analytics_summary', {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    });

    if (error) {
      // Fallback to manual query if RPC doesn't exist
      return await getAnalyticsSummaryManual(start, end);
    }

    return { success: true, data: data as AnalyticsSummary };
  } catch (error) {
    console.error('Failed to get analytics:', error);
    return await getAnalyticsSummaryManual(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate || new Date()
    );
  }
}

// Manual query fallback if RPC not available
async function getAnalyticsSummaryManual(
  startDate: Date,
  endDate: Date
): Promise<AnalyticsResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Get total page views
    const { count: totalViews } = await (supabase.from('page_views') as any)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get unique visitors
    const { data: sessions } = await (supabase.from('page_views') as any)
      .select('session_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('session_id', 'is', null);

    const uniqueVisitors = new Set(sessions?.map((s: any) => s.session_id)).size;

    // Get registered users count
    const { count: registeredUsers } = await (supabase.from('profiles') as any)
      .select('*', { count: 'exact', head: true });

    // Get new users count
    const { count: newUsers } = await (supabase.from('profiles') as any)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get page views by day
    const { data: pageViewsData } = await (supabase.from('page_views') as any)
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    const viewsByDay: { [key: string]: number } = {};
    pageViewsData?.forEach((pv: any) => {
      const date = new Date(pv.created_at).toISOString().split('T')[0];
      viewsByDay[date] = (viewsByDay[date] || 0) + 1;
    });

    const pageViewsByDay = Object.entries(viewsByDay)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get top pages
    const { data: pagesData } = await (supabase.from('page_views') as any)
      .select('path')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const pathCounts: { [key: string]: number } = {};
    pagesData?.forEach((pv: any) => {
      pathCounts[pv.path] = (pathCounts[pv.path] || 0) + 1;
    });

    const topPages = Object.entries(pathCounts)
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return {
      success: true,
      data: {
        total_page_views: totalViews || 0,
        unique_visitors: uniqueVisitors,
        registered_users: registeredUsers || 0,
        new_users: newUsers || 0,
        page_views_by_day: pageViewsByDay.length > 0 ? pageViewsByDay : null,
        top_pages: topPages.length > 0 ? topPages : null,
      },
    };
  } catch (error) {
    console.error('Failed to get analytics manually:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
