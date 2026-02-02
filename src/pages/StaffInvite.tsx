import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { enableStaffMode, isStaffMode } from '../utils/staffMode';

export function StaffInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'error'>('loading');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      return;
    }

    // Check if already staff mode
    if (isStaffMode()) {
      setStatus('already');
      return;
    }

    // Enable staff mode
    enableStaffMode();
    setStatus('success');
  }, [searchParams]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoManage = () => {
    navigate('/manage');
  };

  return (
    <Layout title="運営招待" showNav={false}>
      <div className="container">
        <div className="card text-center">
          {status === 'loading' && (
            <div className="loading">
              <div className="spinner" />
            </div>
          )}

          {status === 'success' && (
            <>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <span style={{ color: 'white', fontSize: 32 }}>✓</span>
              </div>
              <h2 style={{ marginBottom: 8 }}>運営モードが有効になりました</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                グループの管理、チケットの発行・消費ができるようになりました。
              </p>
              <div className="flex gap-2" style={{ justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={handleGoHome}>
                  ホームへ
                </button>
                <button className="btn btn-primary" onClick={handleGoManage}>
                  管理画面へ
                </button>
              </div>
            </>
          )}

          {status === 'already' && (
            <>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <span style={{ color: 'white', fontSize: 32 }}>!</span>
              </div>
              <h2 style={{ marginBottom: 8 }}>既に運営モードです</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                このデバイスは既に運営モードが有効になっています。
              </p>
              <div className="flex gap-2" style={{ justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={handleGoHome}>
                  ホームへ
                </button>
                <button className="btn btn-primary" onClick={handleGoManage}>
                  管理画面へ
                </button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'var(--error)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <span style={{ color: 'white', fontSize: 32 }}>×</span>
              </div>
              <h2 style={{ marginBottom: 8 }}>無効な招待リンク</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                招待リンクが正しくありません。管理者に確認してください。
              </p>
              <button className="btn btn-secondary" onClick={handleGoHome}>
                ホームへ
              </button>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
