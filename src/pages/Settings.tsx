import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

export function Settings() {
  const { user, updateNickname } = useAuth();
  const [showEditName, setShowEditName] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) return;

    setSaving(true);
    try {
      await updateNickname(nickname.trim());
      setShowEditName(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="設定">
      <div className="container">
        <div className="section">
          <h3 className="section-title">アカウント</h3>
          <div className="card">
            <div
              className="list-item list-item-clickable"
              onClick={() => {
                setNickname(user?.nickname || '');
                setShowEditName(true);
              }}
            >
              <div className="flex-1">
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  ニックネーム
                </div>
                <div style={{ fontWeight: 500 }}>{user?.nickname}</div>
              </div>
              <span style={{ color: 'var(--text-secondary)' }}>→</span>
            </div>
            <div className="list-item">
              <div className="flex-1">
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  ユーザーID
                </div>
                <div
                  style={{
                    fontWeight: 500,
                    fontSize: 12,
                    fontFamily: 'monospace',
                  }}
                >
                  {user?.id}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <h3 className="section-title">アプリについて</h3>
          <div className="card">
            <div className="list-item">
              <div className="flex-1">
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  バージョン
                </div>
                <div style={{ fontWeight: 500 }}>1.0.0</div>
              </div>
            </div>
            <div className="list-item">
              <div className="flex-1">
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  オフライン対応
                </div>
                <div style={{ fontWeight: 500, color: 'var(--success)' }}>
                  有効
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <h3 className="section-title">使い方</h3>
          <div className="card">
            <div style={{ fontSize: 14, lineHeight: 1.8 }}>
              <p>
                <strong>ファンの方：</strong>
              </p>
              <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                <li>運営のQRをスキャンしてチケットを受け取る</li>
                <li>チケット詳細画面のQRを見せて特典を受ける</li>
              </ul>
              <p>
                <strong>運営の方：</strong>
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li>グループを作成してメンバーを登録</li>
                <li>チケット種類を作成</li>
                <li>発行QRを表示してファンに読み取ってもらう</li>
                <li>消費画面でファンのQRをスキャン</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="section">
          <h3 className="section-title">運営の方へ</h3>
          <div className="card">
            <div style={{ padding: 16, textAlign: 'center' }}>
              <p style={{ fontSize: 14, marginBottom: 8 }}>
                運営としてご利用希望の方はXでDMください
              </p>
              <a
                href="https://x.com/2016731JST"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--primary)', fontWeight: 500 }}
              >
                @2016731JST
              </a>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showEditName}
        onClose={() => setShowEditName(false)}
        title="ニックネームを変更"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowEditName(false)}
            >
              キャンセル
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!nickname.trim() || saving}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">ニックネーム</label>
          <input
            type="text"
            className="form-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>
      </Modal>
    </Layout>
  );
}
