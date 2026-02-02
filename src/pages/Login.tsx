import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';

export function Login() {
  const { login } = useAuth();
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

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
          <h1 style={{ fontSize: 28, marginBottom: 8, fontWeight: 700 }}>推しチケ</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            特典券をスマートに
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
          「はじめる」を押すと
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
