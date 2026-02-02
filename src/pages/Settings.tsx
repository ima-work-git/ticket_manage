import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  requestPersistentStorage,
  checkStorageStatus,
  formatBytes,
  type StorageStatus,
} from '../utils/storage';
import { restoreTicketsByEmail } from '../services/sync';

export function Settings() {
  const { user, supabaseUser, isOnline, updateNickname, syncNow, logout, loginWithGoogle } = useAuth();
  const [showEditName, setShowEditName] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Storage status
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [requestingPersist, setRequestingPersist] = useState(false);

  // Restore modal
  const [showRestore, setShowRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load storage status on mount
  useEffect(() => {
    checkStorageStatus().then(setStorageStatus);
  }, []);

  const handleRequestPersist = async () => {
    setRequestingPersist(true);
    try {
      await requestPersistentStorage();
      const status = await checkStorageStatus();
      setStorageStatus(status);
    } finally {
      setRequestingPersist(false);
    }
  };

  const handleRestore = async () => {
    if (!supabaseUser?.email) return;

    setRestoring(true);
    setRestoreResult(null);

    try {
      const result = await restoreTicketsByEmail(supabaseUser.email);
      if (result.success) {
        setRestoreResult({
          success: true,
          message: `${result.ticketsRestored}件のチケットを復元しました`,
        });
        if (result.ticketsRestored > 0) {
          setShowRestore(false);
        }
      } else {
        setRestoreResult({
          success: false,
          message: result.error || '復元に失敗しました',
        });
      }
    } finally {
      setRestoring(false);
    }
  };

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

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('ログアウトしますか？ローカルデータは保持されます。')) {
      await logout();
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
            {supabaseUser && (
              <div className="list-item">
                <div className="flex-1">
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    Googleアカウント
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {supabaseUser.email}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {isSupabaseConfigured() && (
          <div className="section">
            <h3 className="section-title">クラウド同期</h3>
            <div className="card">
              <div className="list-item">
                <div className="flex-1">
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    接続状態
                  </div>
                  <div
                    style={{
                      fontWeight: 500,
                      color: isOnline ? 'var(--success)' : 'var(--error)',
                    }}
                  >
                    {isOnline ? 'オンライン' : 'オフライン'}
                  </div>
                </div>
              </div>
              <div className="list-item">
                <div className="flex-1">
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    ログイン状態
                  </div>
                  <div
                    style={{
                      fontWeight: 500,
                      color: supabaseUser ? 'var(--success)' : 'var(--warning)',
                    }}
                  >
                    {supabaseUser ? 'クラウド同期有効' : 'ローカルのみ'}
                  </div>
                </div>
              </div>
              {supabaseUser && isOnline && (
                <div className="list-item">
                  <button
                    className="btn btn-secondary btn-full"
                    onClick={handleSync}
                    disabled={syncing}
                  >
                    {syncing ? '同期中...' : '今すぐ同期'}
                  </button>
                </div>
              )}
              {supabaseUser && (
                <div className="list-item">
                  <button
                    className="btn btn-full"
                    onClick={handleLogout}
                    style={{
                      background: 'transparent',
                      color: 'var(--error)',
                      border: '1px solid var(--error)',
                    }}
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Storage Section */}
        <div className="section">
          <h3 className="section-title">データ保存</h3>
          <div className="card">
            <div className="list-item">
              <div className="flex-1">
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  永続ストレージ
                </div>
                <div
                  style={{
                    fontWeight: 500,
                    color: storageStatus?.persisted ? 'var(--success)' : 'var(--warning)',
                  }}
                >
                  {storageStatus?.persisted ? '有効（データ保護済み）' : '無効'}
                </div>
              </div>
              {!storageStatus?.persisted && (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={handleRequestPersist}
                  disabled={requestingPersist}
                >
                  {requestingPersist ? '...' : '有効化'}
                </button>
              )}
            </div>
            {storageStatus?.usage !== undefined && (
              <div className="list-item">
                <div className="flex-1">
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    使用容量
                  </div>
                  <div style={{ fontWeight: 500 }}>
                    {formatBytes(storageStatus.usage)}
                    {storageStatus.quota && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        {' '}/ {formatBytes(storageStatus.quota)} ({storageStatus.usagePercent}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div
              style={{
                padding: '8px 16px',
                fontSize: 12,
                color: 'var(--text-secondary)',
                background: 'var(--surface-secondary)',
                borderRadius: '0 0 12px 12px',
              }}
            >
              永続ストレージを有効にすると、ブラウザがデータを自動削除しなくなります。
              ただし手動でデータを消去した場合は削除されます。
            </div>
          </div>
        </div>

        {/* Data Restore Section */}
        {isSupabaseConfigured() && (
          <div className="section">
            <h3 className="section-title">データ復元</h3>
            <div className="card">
              <div style={{ padding: 16 }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  誤ってデータを削除してしまった場合、運営がクラウドに同期したデータから復元できます。
                </p>
                <button
                  className="btn btn-primary btn-full"
                  onClick={() => {
                    setRestoreResult(null);
                    setShowRestore(true);
                  }}
                >
                  チケットを復元する
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="section">
          <h3 className="section-title">アプリについて</h3>
          <div className="card">
            <div className="list-item">
              <div className="flex-1">
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  バージョン
                </div>
                <div style={{ fontWeight: 500 }}>1.1.0</div>
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
            <div className="list-item">
              <div className="flex-1">
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  クラウド同期
                </div>
                <div
                  style={{
                    fontWeight: 500,
                    color: isSupabaseConfigured() ? 'var(--success)' : 'var(--text-secondary)',
                  }}
                >
                  {isSupabaseConfigured() ? '有効' : '無効'}
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

      {/* Restore Modal */}
      <Modal
        isOpen={showRestore}
        onClose={() => setShowRestore(false)}
        title="チケット復元"
        footer={
          supabaseUser ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setShowRestore(false)}
              >
                キャンセル
              </button>
              <button
                className="btn btn-primary"
                onClick={handleRestore}
                disabled={restoring || !isOnline}
              >
                {restoring ? '復元中...' : '復元する'}
              </button>
            </>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => setShowRestore(false)}
            >
              閉じる
            </button>
          )
        }
      >
        <div>
          {!isOnline && (
            <div
              style={{
                padding: 12,
                background: 'var(--error)',
                color: 'white',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              オフラインです。インターネット接続を確認してください。
            </div>
          )}

          {supabaseUser ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                以下のGoogleアカウントで登録されたチケットを復元します。
                運営が「受領確認」をスキャンしたチケットが復元されます。
              </p>

              <div
                style={{
                  padding: 12,
                  background: 'var(--surface-secondary)',
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Googleアカウント
                </div>
                <div style={{ fontWeight: 500 }}>
                  {supabaseUser.email}
                </div>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                チケットを復元するには、チケット受取時に使用していたGoogleアカウントでログインしてください。
              </p>

              <button
                className="btn btn-primary btn-full"
                onClick={loginWithGoogle}
                disabled={!isOnline}
              >
                Googleでログイン
              </button>
            </>
          )}

          {restoreResult && (
            <div
              style={{
                padding: 12,
                background: restoreResult.success ? 'var(--success)' : 'var(--error)',
                color: 'white',
                borderRadius: 8,
                marginTop: 16,
                fontSize: 14,
              }}
            >
              {restoreResult.message}
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
