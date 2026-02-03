import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { isSupabaseConfigured } from '../lib/supabase';

export function Login() {
  const { loginWithGoogle, loginOffline, isFirstTimeUser, isOnline } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google login error:', err);
      const message = err instanceof Error ? err.message : 'Googleログインに失敗しました';
      setError(message);
      setLoading(false);
    }
  };

  const handleOfflineLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginOffline();
    } catch (err) {
      setError('ログインに失敗しました。Googleでログインしてください。');
      setLoading(false);
    }
  };

  // First-time user: Google login is mandatory
  const renderFirstTimeUI = () => (
    <>
      {!isOnline ? (
        // Offline and no local data - show helpful message
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--error)',
            padding: 16,
            borderRadius: 12,
            marginBottom: 24,
          }}
        >
          <p style={{ fontSize: 14, color: 'var(--error)', marginBottom: 8, fontWeight: 500 }}>
            インターネット接続が必要です
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
            以下のいずれかの状態です：
          </p>
          <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 20, margin: 0 }}>
            <li>初めてこのアプリを使う</li>
            <li>ブラウザのデータが削除された</li>
          </ul>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12 }}>
            インターネットに接続してGoogleでログインしてください。
            過去に受け取ったチケットは復元できます。
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--surface-secondary)',
            padding: 16,
            borderRadius: 12,
            marginBottom: 24,
          }}
        >
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
            初回ログインにはGoogleアカウントが必要です
          </p>
          <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 20, margin: 0 }}>
            <li>データがクラウドにバックアップされます</li>
            <li>機種変更してもデータが引き継がれます</li>
            <li>誤ってキャッシュクリアしても復元できます</li>
          </ul>
        </div>
      )}

      <button
        className="btn btn-primary btn-full"
        onClick={handleGoogleLogin}
        disabled={loading || !isOnline}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          opacity: isOnline ? 1 : 0.5,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {loading ? 'ログイン中...' : 'Googleでログイン'}
      </button>
    </>
  );

  // Returning user: Offline login is default, Google login is less prominent
  const renderReturningUserUI = () => (
    <>
      <button
        className="btn btn-primary btn-full"
        onClick={handleOfflineLogin}
        disabled={loading}
        style={{ marginBottom: 12 }}
      >
        {loading ? 'ログイン中...' : 'アプリを開く'}
      </button>

      <p
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginBottom: 24,
        }}
      >
        {isOnline
          ? 'オンライン時はクラウドと自動同期されます'
          : 'オフラインモード（後でオンラインになると同期されます）'}
      </p>

      {isSupabaseConfigured() && (
        <button
          onClick={handleGoogleLogin}
          disabled={loading || !isOnline}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 16px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--text-secondary)',
            fontSize: 14,
            cursor: isOnline ? 'pointer' : 'not-allowed',
            opacity: isOnline ? 1 : 0.5,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          別のGoogleアカウントでログイン
        </button>
      )}
    </>
  );

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
          <h1 style={{ fontSize: 28, marginBottom: 8, fontWeight: 700 }}>推しチケ</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            特典券をスマートに
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {isSupabaseConfigured() ? (
          isFirstTimeUser ? renderFirstTimeUI() : renderReturningUserUI()
        ) : (
          // Supabase not configured - show error
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              padding: 16,
              borderRadius: 8,
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            クラウド機能が設定されていません。管理者に連絡してください。
          </div>
        )}

        <p
          className="text-center mt-4"
          style={{ fontSize: 12, color: 'var(--text-secondary)' }}
        >
          利用開始で
          <button
            onClick={() => setShowTerms(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: 12,
              padding: 0,
            }}
          >
            利用規約
          </button>
          に同意したものとみなします
        </p>

        <div
          className="text-center mt-4"
          style={{
            padding: 16,
            background: 'var(--surface)',
            borderRadius: 12,
            marginTop: 24,
          }}
        >
          <p style={{ fontSize: 14, marginBottom: 8 }}>
            運営の方はこちら
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            XでDMください →{' '}
            <a
              href="https://x.com/2016731JST"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--primary)' }}
            >
              @2016731JST
            </a>
          </p>
        </div>
      </div>

      <Modal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        title="利用規約"
        footer={
          <button className="btn btn-primary" onClick={() => setShowTerms(false)}>
            閉じる
          </button>
        }
      >
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          <p style={{ marginBottom: 16 }}>
            本サービス「推しチケ」（以下「本サービス」）をご利用いただく前に、以下の利用規約をよくお読みください。本サービスを利用した時点で、本規約に同意したものとみなします。
          </p>

          <h4 style={{ marginBottom: 8, fontWeight: 600 }}>1. 免責事項</h4>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li>本サービスは「現状有姿」で提供され、いかなる保証もありません</li>
            <li>データの消失、破損、漏洩について一切責任を負いません</li>
            <li>サービスの中断、停止、変更、終了について一切責任を負いません</li>
            <li>本サービスの利用により生じた損害について、開発者は一切の法的責任を負いません</li>
          </ul>

          <h4 style={{ marginBottom: 8, fontWeight: 600 }}>2. 自己責任</h4>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li>本サービスの利用はすべて自己責任で行ってください</li>
            <li>端末の故障、紛失によるデータ消失は利用者の責任となります</li>
            <li>特典券の金銭的価値に関するトラブルは当事者間で解決してください</li>
          </ul>

          <h4 style={{ marginBottom: 8, fontWeight: 600 }}>3. 無保証・ベストエフォート</h4>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li>本サービスはベストエフォートで運営されます</li>
            <li>動作の完全性、正確性、継続性を保証しません</li>
            <li>バグ修正や機能追加の義務を負いません</li>
          </ul>

          <h4 style={{ marginBottom: 8, fontWeight: 600 }}>4. 賠償責任の否認</h4>
          <p style={{ marginBottom: 16 }}>
            本サービスに起因するいかなる損害（直接的、間接的、偶発的、特別、結果的損害を含む）についても、開発者は賠償責任を負いません。これには、利益の損失、データの損失、業務の中断などが含まれますが、これらに限定されません。
          </p>

          <h4 style={{ marginBottom: 8, fontWeight: 600 }}>5. 規約の変更</h4>
          <p>
            本規約は予告なく変更される場合があります。変更後も本サービスを利用した場合、変更後の規約に同意したものとみなします。
          </p>
        </div>
      </Modal>
    </div>
  );
}
