import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db';
import { parseQRPayload } from '../utils/crypto';
import type { Ticket, TicketTemplate, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function ConsumeTicket() {
  const { id: groupId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [scanning, setScanning] = useState(false);
  const [eventName, setEventName] = useState('');
  const [pendingTicket, setPendingTicket] = useState<{
    ticket: Ticket;
    template: TicketTemplate;
    owner: User;
  } | null>(null);
  const [result, setResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleScan = async (data: string) => {
    if (!user || !groupId) return;

    setScanning(false);
    const parsed = await parseQRPayload(data);

    if (!parsed.valid || !parsed.data || parsed.type !== 'consume') {
      setResult({
        type: 'error',
        message: 'QRコードが無効または期限切れです',
      });
      return;
    }

    try {
      const { ticketId, ownerId } = parsed.data;
      const ticket = await db.tickets.get(ticketId);

      if (!ticket) {
        setResult({ type: 'error', message: 'チケットが見つかりません' });
        return;
      }

      if (ticket.groupId !== groupId) {
        setResult({ type: 'error', message: 'このグループのチケットではありません' });
        return;
      }

      if (ticket.status !== 'active') {
        const statusMessages: Record<string, string> = {
          used: 'このチケットは既に使用済みです',
          expired: 'このチケットは期限切れです',
          refunded: 'このチケットは返却済みです',
        };
        setResult({
          type: 'error',
          message: statusMessages[ticket.status] || 'このチケットは使用できません',
        });
        return;
      }

      const template = await db.ticketTemplates.get(ticket.templateId);
      if (!template) {
        setResult({ type: 'error', message: 'テンプレートが見つかりません' });
        return;
      }

      const owner = await db.users.get(ownerId);
      if (!owner) {
        setResult({ type: 'error', message: 'チケット所有者が見つかりません' });
        return;
      }

      // Show confirmation
      setPendingTicket({ ticket, template, owner });
    } catch (error) {
      console.error('Scan error:', error);
      setResult({ type: 'error', message: '処理中にエラーが発生しました' });
    }
  };

  const handleConfirmConsume = async () => {
    if (!pendingTicket || !user) return;

    const { ticket, template } = pendingTicket;

    await db.tickets.update(ticket.id, {
      status: 'used',
      consumedBy: user.id,
      consumedAt: new Date(),
      eventName: eventName.trim() || undefined,
    });

    await db.activityLogs.add({
      id: uuidv4(),
      groupId: ticket.groupId,
      actorId: user.id,
      action: 'consume',
      ticketId: ticket.id,
      targetUserId: ticket.ownerId,
      metadata: { templateName: template.name, eventName: eventName.trim() || undefined },
      createdAt: new Date(),
    });

    setResult({
      type: 'success',
      message: `${template.name}を消費しました`,
    });
    setPendingTicket(null);
    setEventName('');
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
                <div className="avatar">{pendingTicket.owner.nickname[0]}</div>
                <div>
                  <div className="card-title">{pendingTicket.owner.nickname}</div>
                  <div className="card-subtitle">チケット所有者</div>
                </div>
              </div>
            </div>
            <div className="card">
              {pendingTicket.template.image && (
                <img
                  src={pendingTicket.template.image}
                  alt={pendingTicket.template.name}
                  style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    objectFit: 'cover',
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                />
              )}
              <div className="card-title">{pendingTicket.template.name}</div>
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
