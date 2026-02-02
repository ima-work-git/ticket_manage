import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { login } = useAuth();
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setLoading(true);
    try {
      await login(nickname.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div
        className="container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div className="text-center mb-6">
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 10h18" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>特典券管理</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            アイドルの特典券をオフラインで管理
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">ニックネーム</label>
            <input
              type="text"
              className="form-input"
              placeholder="表示名を入力"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={!nickname.trim() || loading}
          >
            {loading ? '作成中...' : 'はじめる'}
          </button>
        </form>

        <p
          className="text-center mt-4"
          style={{ fontSize: 12, color: 'var(--text-secondary)' }}
        >
          ニックネームは後から変更できます
        </p>
      </div>
    </div>
  );
}
