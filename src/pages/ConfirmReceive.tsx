import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db';
import {
  parseQRPayload,
  isReceiveConfirmQRData,
  type ReceiveConfirmQRData,
} from '../utils/crypto';
import { syncPendingTicket } from '../services/sync';

export function ConfirmReceive() {
  const { id: groupId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error';
    message: string;
    data?: ReceiveConfirmQRData;
  } | null>(null);

  const handleScan = async (data: string) => {
    if (!user || !groupId) return;

    setScanning(false);
    const parsed = parseQRPayload(data);

    if (!parsed.valid || parsed.type !== 'receive_confirm' || !isReceiveConfirmQRData(parsed.data)) {
      setResult({
        type: 'error',
        message: parsed.expired
          ? 'QRコードの有効期限が切れています'
          : 'QRコードが無効です',
      });
      return;
    }

    const qrData = parsed.data as ReceiveConfirmQRData;

    try {
      // Verify this is for our group
      if (qrData.groupId !== groupId) {
        setResult({ type: 'error', message: 'このグループのチケットではありません' });
        return;
      }

      // Find and update the pending ticket
      const pendingTicket = await db.pendingTickets.get(qrData.ticketId);

      if (pendingTicket) {
        // Update with claimer info
        const updatedPendingTicket = {
          ...pendingTicket,
          status: 'claimed' as const,
          claimedBy: qrData.ownerId,
          claimedByNickname: qrData.ownerNickname,
          claimedByEmail: qrData.ownerEmail, // Google email for reliable restoration
          claimedAt: new Date(),
        };

        await syncPendingTicket(updatedPendingTicket, 'update');
      } else {
        // Create a new pending ticket record with claimed status
        // This handles the case where the issuing operator is different from the confirming operator
        await syncPendingTicket({
          id: qrData.ticketId,
          templateId: qrData.templateId,
          groupId: qrData.groupId,
          templateName: qrData.templateName,
          issuedBy: user.id, // We don't know the original issuer, use current user
          issuedAt: new Date(),
          status: 'claimed',
          claimedBy: qrData.ownerId,
          claimedByNickname: qrData.ownerNickname,
          claimedByEmail: qrData.ownerEmail, // Google email for reliable restoration
          claimedAt: new Date(),
        }, 'create');
      }

      setResult({
        type: 'success',
        message: '受領確認が完了しました',
        data: qrData,
      });
    } catch (error) {
      console.error('Confirm receive error:', error);
      setResult({ type: 'error', message: '処理中にエラーが発生しました' });
    }
  };

  return (
    <Layout title="受領確認" showBack>
      <div className="container">
        <div className="card text-center">
          <h3 className="mb-4">チケット受領確認</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            ファンが表示する「受領確認QR」をスキャンして、チケットデータをクラウドにバックアップします
          </p>
          <button
            className="btn btn-primary btn-full"
            onClick={() => setScanning(true)}
          >
            受領確認QRをスキャン
          </button>
        </div>

        <div className="card" style={{ background: 'var(--surface-secondary)' }}>
          <h4 style={{ marginBottom: 8 }}>この機能について</h4>
          <ul style={{ color: 'var(--text-secondary)', fontSize: 14, paddingLeft: 20 }}>
            <li>ファンがチケットを受け取った後、「受領確認QR」を表示できます</li>
            <li>このQRをスキャンすると、チケット所有者情報がクラウドに記録されます</li>
            <li>ファンがキャッシュをクリアしても、ログイン後にチケットを復元できます</li>
          </ul>
        </div>
      </div>

      {/* Scanner Modal */}
      <Modal
        isOpen={scanning}
        onClose={() => setScanning(false)}
        title="受領確認QRをスキャン"
      >
        <div className="qr-scanner">
          <Scanner
            onScan={(result) => {
              if (result?.[0]?.rawValue) {
                handleScan(result[0].rawValue);
              }
            }}
            onError={(error) => {
              console.error('Scanner error:', error);
            }}
            constraints={{ facingMode: 'environment' }}
            styles={{
              container: { width: '100%' },
              video: { width: '100%' },
            }}
          />
        </div>
        <p
          className="text-center mt-4"
          style={{ fontSize: 14, color: 'var(--text-secondary)' }}
        >
          カメラをQRコードに向けてください
        </p>
      </Modal>

      {/* Result Modal */}
      <Modal
        isOpen={result !== null}
        onClose={() => setResult(null)}
        title={result?.type === 'success' ? '成功' : 'エラー'}
        footer={
          <button
            className="btn btn-primary"
            onClick={() => setResult(null)}
          >
            OK
          </button>
        }
      >
        <div className="text-center">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background:
                result?.type === 'success'
                  ? 'var(--success)'
                  : 'var(--error)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <span style={{ color: 'white', fontSize: 32 }}>
              {result?.type === 'success' ? '✓' : '×'}
            </span>
          </div>
          <p style={{ fontSize: 16 }}>{result?.message}</p>
          {result?.data && (
            <div style={{ marginTop: 16, padding: 12, background: 'var(--surface-secondary)', borderRadius: 8 }}>
              <p style={{ fontSize: 14, marginBottom: 8 }}>
                <strong>所有者:</strong> {result.data.ownerNickname}
              </p>
              <p style={{ fontSize: 14 }}>
                <strong>チケット:</strong> {result.data.templateName}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
