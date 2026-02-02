import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db';
import { parseQRPayload } from '../utils/crypto';
import type { Ticket, TicketTemplate } from '../types';

export function Scan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error';
    message: string;
    ticket?: Ticket;
    template?: TicketTemplate;
  } | null>(null);

  const handleScan = async (data: string) => {
    if (!user) return;

    setScanning(false);
    const parsed = await parseQRPayload(data);

    if (!parsed.valid || !parsed.data) {
      setResult({
        type: 'error',
        message: 'QRコードが無効または期限切れです',
      });
      return;
    }

    try {
      if (parsed.type === 'issue') {
        // Receive a ticket
        const { templateId, issuerId } = parsed.data;
        const template = await db.ticketTemplates.get(templateId);

        if (!template) {
          setResult({ type: 'error', message: 'テンプレートが見つかりません' });
          return;
        }

        // Import the ticket hook functions directly
        const { v4: uuidv4 } = await import('uuid');
        const { addDays } = await import('date-fns');

        const expiresAt = template.expiresInDays
          ? addDays(new Date(), template.expiresInDays)
          : undefined;

        const ticket: Ticket = {
          id: uuidv4(),
          templateId,
          groupId: template.groupId,
          ownerId: user.id,
          issuedBy: issuerId,
          issuedAt: new Date(),
          status: 'active',
          expiresAt,
        };

        await db.tickets.add(ticket);

        // Log the activity
        await db.activityLogs.add({
          id: uuidv4(),
          groupId: template.groupId,
          actorId: issuerId,
          action: 'issue',
          ticketId: ticket.id,
          targetUserId: user.id,
          metadata: { templateName: template.name },
          createdAt: new Date(),
        });

        setResult({
          type: 'success',
          message: 'チケットを受け取りました！',
          ticket,
          template,
        });
      } else if (parsed.type === 'staff_invite') {
        // Join as staff
        const { groupId, inviterId } = parsed.data;
        const group = await db.groups.get(groupId);

        if (!group) {
          setResult({ type: 'error', message: 'グループが見つかりません' });
          return;
        }

        // Check if already staff
        const existing = await db.staff
          .where('[groupId+userId]')
          .equals([groupId, user.id])
          .first();

        if (existing) {
          setResult({ type: 'error', message: '既にスタッフとして登録されています' });
          return;
        }

        const { v4: uuidv4 } = await import('uuid');

        await db.staff.add({
          id: uuidv4(),
          groupId,
          userId: user.id,
          role: 'staff',
          invitedBy: inviterId,
          createdAt: new Date(),
        });

        await db.activityLogs.add({
          id: uuidv4(),
          groupId,
          actorId: inviterId,
          action: 'staff_add',
          targetUserId: user.id,
          createdAt: new Date(),
        });

        setResult({
          type: 'success',
          message: `${group.name}のスタッフになりました`,
        });
      } else {
        setResult({ type: 'error', message: '不明なQRコードです' });
      }
    } catch (error) {
      console.error('Scan error:', error);
      setResult({ type: 'error', message: '処理中にエラーが発生しました' });
    }
  };

  return (
    <Layout title="スキャン">
      <div className="container">
        <div className="card text-center">
          <h3 className="mb-4">チケットを受け取る</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            運営が表示するQRコードをスキャンしてチケットを受け取ります
          </p>
          <button
            className="btn btn-primary btn-full"
            onClick={() => setScanning(true)}
          >
            QRコードをスキャン
          </button>
        </div>

        <div className="card text-center">
          <h3 className="mb-4">スタッフ招待を受ける</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            グループオーナーからの招待QRをスキャンしてスタッフになります
          </p>
          <button
            className="btn btn-outline btn-full"
            onClick={() => setScanning(true)}
          >
            招待QRをスキャン
          </button>
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
            onClick={() => {
              if (result?.type === 'success' && result.ticket) {
                navigate(`/ticket/${result.ticket.id}`);
              }
              setResult(null);
            }}
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
          {result?.template && (
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
              {result.template.name}
            </p>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
