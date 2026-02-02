import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { validateAdminKey } from '../utils/staffMode';
import { getAnalyticsSummary, type AnalyticsSummary } from '../services/analytics';

export function Analytics() {
  const [searchParams] = useSearchParams();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    const key = searchParams.get('key');
    if (key && validateAdminKey(key)) {
      setAuthorized(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authorized) return;

    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      const days = parseInt(period);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const result = await getAnalyticsSummary(startDate, endDate);

      if (result.success && result.data) {
        setAnalytics(result.data);
      } else {
        setError(result.error || 'データの取得に失敗しました');
      }

      setLoading(false);
    };

    loadAnalytics();
  }, [authorized, period]);

  if (!authorized) {
    return (
      <Layout title="アクセス拒否" showNav={false}>
        <div className="container">
          <div className="empty-state">
            <p>このページにアクセスする権限がありません</p>
          </div>
        </div>
      </Layout>
    );
  }

  const formatPath = (path: string) => {
    const pathNames: { [key: string]: string } = {
      '/': 'ホーム',
      '/scan': 'QRスキャン',
      '/settings': '設定',
      '/manage': '管理',
    };
    return pathNames[path] || path;
  };

  return (
    <Layout title="分析ダッシュボード" showNav={false} showBack>
      <div className="container">
        {/* Period selector */}
        <div className="card mb-4">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['7', '30', '90'] as const).map((p) => (
              <button
                key={p}
                className={`btn ${period === p ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPeriod(p)}
                style={{ flex: 1 }}
              >
                {p}日間
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="card">
            <p style={{ color: 'var(--danger)', textAlign: 'center' }}>{error}</p>
          </div>
        ) : analytics ? (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
              <div className="card text-center">
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary)' }}>
                  {analytics.total_page_views.toLocaleString()}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  ページビュー
                </div>
              </div>
              <div className="card text-center">
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--secondary)' }}>
                  {analytics.unique_visitors.toLocaleString()}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  ユニーク訪問者
                </div>
              </div>
              <div className="card text-center">
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--success)' }}>
                  {analytics.registered_users.toLocaleString()}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  登録ユーザー数
                </div>
              </div>
              <div className="card text-center">
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--info)' }}>
                  {analytics.new_users.toLocaleString()}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  新規ユーザー
                </div>
              </div>
            </div>

            {/* Page views by day */}
            {analytics.page_views_by_day && analytics.page_views_by_day.length > 0 && (
              <div className="card mb-4">
                <h3 className="mb-4">日別ページビュー</h3>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, minHeight: 120, padding: '0 8px' }}>
                    {analytics.page_views_by_day.map((day) => {
                      const maxViews = Math.max(...analytics.page_views_by_day!.map(d => d.views));
                      const height = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
                      return (
                        <div
                          key={day.date}
                          style={{
                            flex: 1,
                            minWidth: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: `${Math.max(height, 4)}px`,
                              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                              borderRadius: 4,
                              minHeight: 4,
                            }}
                            title={`${day.date}: ${day.views}ビュー`}
                          />
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {new Date(day.date).getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Top pages */}
            {analytics.top_pages && analytics.top_pages.length > 0 && (
              <div className="card">
                <h3 className="mb-4">人気ページ</h3>
                {analytics.top_pages.map((page, index) => (
                  <div
                    key={page.path}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: index < analytics.top_pages!.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12, width: 20 }}>
                        {index + 1}.
                      </span>
                      <span style={{ fontSize: 14 }}>{formatPath(page.path)}</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                      {page.views.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* No data message */}
            {!analytics.page_views_by_day && !analytics.top_pages && (
              <div className="card text-center">
                <p style={{ color: 'var(--text-secondary)' }}>
                  この期間のページビューデータがありません
                </p>
              </div>
            )}
          </>
        ) : null}

        {/* Info card */}
        <div className="card mt-4" style={{ background: 'var(--surface-secondary)' }}>
          <h4 style={{ marginBottom: 8 }}>データについて</h4>
          <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 20, margin: 0 }}>
            <li>ページビューはサイト訪問時に自動的に記録されます</li>
            <li>ユニーク訪問者はブラウザセッション単位でカウントされます</li>
            <li>登録ユーザー数はGoogleアカウントでログインしたユーザーの総数です</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
