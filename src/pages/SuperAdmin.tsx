import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Layout } from '../components/Layout';
import { validateAdminKey, generateInviteToken, getInviteUrl } from '../utils/staffMode';

export function SuperAdmin() {
  const [searchParams] = useSearchParams();
  const [authorized, setAuthorized] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const key = searchParams.get('key');
    if (key && validateAdminKey(key)) {
      setAuthorized(true);
    }
  }, [searchParams]);

  const handleGenerateInvite = () => {
    const token = generateInviteToken();
    setInviteUrl(getInviteUrl(token));
    setCopied(false);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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

  return (
    <Layout title="スーパー管理者" showNav={false} showBack>
      <div className="container">
        <div className="card">
          <h3 className="mb-4">運営スタッフ招待</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            招待URLまたはQRコードを運営スタッフに共有してください。
            アクセスした人は運営モードが有効になります。
          </p>
          <button className="btn btn-primary btn-full" onClick={handleGenerateInvite}>
            招待リンクを生成
          </button>
        </div>

        {inviteUrl && (
          <div className="card">
            <h3 className="text-center mb-4">招待QRコード</h3>
            <div className="qr-container">
              <div className="qr-code">
                <QRCodeSVG value={inviteUrl} size={200} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">招待URL</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  value={inviteUrl}
                  readOnly
                  style={{ fontSize: 12 }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyUrl}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {copied ? 'コピー済み' : 'コピー'}
                </button>
              </div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
              ※ このリンクにアクセスした人は運営権限を得ます。取り扱いに注意してください。
            </p>
          </div>
        )}

        <div className="card">
          <h3 className="mb-4">注意事項</h3>
          <ul style={{ fontSize: 14, color: 'var(--text-secondary)', paddingLeft: 20 }}>
            <li>招待リンクは誰でも使用できます</li>
            <li>運営権限の削除は、該当デバイスのブラウザデータをクリアする必要があります</li>
            <li>招待リンクは必要な人にのみ共有してください</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
