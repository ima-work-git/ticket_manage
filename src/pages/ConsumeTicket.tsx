import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { v4 as uuidv4 } from 'uuid';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db';
import { parseQRPayload, isConsumeQRData, type ConsumeQRData } from '../utils/crypto';
import { syncTicket, syncActivityLog } from '../services/sync';
import type { ActivityLog } from '../types';

export function ConsumeTicket() {
  const { id: groupId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [scanning, setScanning] = useState(false);
  const [eventName, setEventName] = useState('');
  const [pendingTicket, setPendingTicket] = useState<ConsumeQRData | null>(null);
  const [result, setResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleScan = async (data: string) => {
    if (!user || !groupId) return;

    setScanning(false);
    const parsed = parseQRPayload(data);

    if (!parsed.valid || parsed.type !== 'consume' || !isConsumeQRData(parsed.data)) {
      setResult({
        type: 'error',
        message: parsed.expired
          ? 'QRコードの有効期限が切れています'
          : 'QRコードが無効です',
      });
      return;
    }

    const qrData = parsed.data as ConsumeQRData;

    try {
      // Check if this is for our group
      if (qrData.groupId !== groupId) {
        setResult({ type: 'error', message: 'このグループのチケットではありません' });
        return;
      }

      // Check if ticket was already consumed (check local activity logs)
      const existingConsumption = await db.activityLogs
        .where('ticketId')
        .equals(qrData.ticketId)
        .filter((log) => log.action === 'consume')
        .first();

      if (existingConsumption) {
        setResult({ type: 'error', message: 'このチケットは既に使用済みです' });
        return;
      }

      // Also check local tickets table if we have it
      const localTicket = await db.tickets.get(qrData.ticketId);
      if (localTicket && localTicket.status !== 'active') {
        const statusMessages: Record<string, string> = {
          used: 'このチケットは既に使用済みです',
          expired: 'このチケットは期限切れです',
          refunded: 'このチケットは返却済みです',
        };
        setResult({
          type: 'error',
          message: statusMessages[localTicket.status] || 'このチケットは使用できません',
        });
        return;
      }

      // Show confirmation with data from QR
      setPendingTicket(qrData);
    } catch (error) {
      console.error('Scan error:', error);
      setResult({ type: 'error', message: '処理中にエラーが発生しました' });
    }
  };

  const handleConfirmConsume = async () => {
    if (!pendingTicket || !user) return;

    try {
      // Update local ticket if we have it
      const localTicket = await db.tickets.get(pendingTicket.ticketId);
      if (localTicket) {
        const updatedTicket = {
          ...localTicket,
          status: 'used' as const,
          consumedBy: user.id,
          consumedAt: new Date(),
          eventName: eventName.trim() || undefined,
        };
        await syncTicket(updatedTicket, 'update');
      }

      // Create activity log (this is the primary record for offline consumption)
      const log: ActivityLog = {
        id: uuidv4(),
        groupId: pendingTicket.groupId,
        actorId: user.id,
        action: 'consume',
        ticketId: pendingTicket.ticketId,
        targetUserId: pendingTicket.ownerId,
        metadata: {
          templateName: pendingTicket.templateName,
          eventName: eventName.trim() || undefined,
          ownerNickname: pendingTicket.ownerNickname,
        },
        createdAt: new Date(),
      };

      await syncActivityLog(log);

      setResult({
        type: 'success',
        message: `${pendingTicket.templateName}を消費しました`,
      });
      setPendingTicket(null);
      setEventName('');
    } catch (error) {
      console.error('Consume error:', error);
      setResult({ type: 'error', message: '処理中にエラーが発生しました' });
    }
  };

  return (
    <Layout title="チケット消費" showBack>
      <div className="container">
        <div className="card text-center">
          <h3 className="mb-4">ファンのチケットを消費</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            ファンが表示するQRコードをスキャンしてチケットを消費します
          </p>
          <button
            className="btn btn-primary btn-full"
            onClick={() => setScanning(true)}
          >
            QRコードをスキャン
          </button>
        </div>

        <div className="card">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">イベント名（任意）</label>
            <input
              type="text"
              className="form-input"
              placeholder="例: 2024/1/15 渋谷ライブ"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              どのイベントで使用されたか記録できます
            </p>
          </div>
        </div>
      </div>

      {/* Scanner Modal */}
      <Modal
        isOpen={scanning}
        onClose={() => setScanning(false)}
        title="QRコードをスキャン"
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
          ファンのQRコードをスキャンしてください
        </p>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={pendingTicket !== null}
        onClose={() => {
          setPendingTicket(null);
          setEventName('');
        }}
        title="チケット消費の確認"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setPendingTicket(null);
                setEventName('');
              }}
            >
              キャンセル
            </button>
            <button className="btn btn-primary" onClick={handleConfirmConsume}>
              消費する
            </button>
          </>
        }
      >
        {pendingTicket && (
          <div>
            <div className="card mb-4">
              <div className="flex items-center gap-3">
                <div className="avatar">{pendingTicket.ownerNickname[0]}</div>
                <div>
                  <div className="card-title">{pendingTicket.ownerNickname}</div>
                  <div className="card-subtitle">チケット所有者</div>
                </div>
              </div>
            </div>
            <div className="card">
              {pendingTicket.templateImage && (
                <img
                  src={pendingTicket.templateImage}
                  alt={pendingTicket.templateName}
                  style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    objectFit: 'cover',
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                />
              )}
              <div className="card-title">{pendingTicket.templateName}</div>
            </div>
            <p className="mt-4" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              このチケットを消費しますか？
            </p>
          </div>
        )}
      </Modal>

      {/* Result Modal */}
      <Modal
        isOpen={result !== null}
        onClose={() => setResult(null)}
        title={result?.type === 'success' ? '完了' : 'エラー'}
        footer={
          <button className="btn btn-primary" onClick={() => setResult(null)}>
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
                result?.type === 'success' ? 'var(--success)' : 'var(--error)',
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
        </div>
      </Modal>
    </Layout>
  );
}
