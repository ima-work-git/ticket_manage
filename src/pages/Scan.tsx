import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db';
import {
  parseQRPayload,
  isIssueQRData,
  isStaffInviteQRData,
  type IssueQRData,
  type StaffInviteQRData,
} from '../utils/crypto';
import { syncTicket, syncStaff, syncActivityLog } from '../services/sync';
import type { Ticket, ActivityLog, Staff } from '../types';

export function Scan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error';
    message: string;
    ticket?: Ticket;
    templateName?: string;
  } | null>(null);

  const handleScan = async (data: string) => {
    if (!user) return;

    setScanning(false);
    const parsed = parseQRPayload(data);

    if (!parsed.valid) {
      setResult({
        type: 'error',
        message: parsed.expired
          ? 'QRコードの有効期限が切れています'
          : 'QRコードが無効です',
      });
      return;
    }

    try {
      if (parsed.type === 'issue' && isIssueQRData(parsed.data)) {
        // Receive a ticket (offline compatible)
        const qrData = parsed.data as IssueQRData;

        // Check if ticket already exists (prevent duplicate claims)
        const existingTicket = await db.tickets.get(qrData.ticketId);
        if (existingTicket) {
          setResult({
            type: 'error',
            message: 'このチケットは既に受け取り済みです',
          });
          return;
        }

        // Calculate expiration date
        const expiresAt = qrData.expiresInDays
          ? addDays(new Date(), qrData.expiresInDays)
          : undefined;

        // Create the ticket locally (works offline)
        const ticket: Ticket = {
          id: qrData.ticketId,
          templateId: qrData.templateId,
          groupId: qrData.groupId,
          ownerId: user.id,
          issuedBy: qrData.issuerId,
          issuedAt: new Date(),
          status: 'active',
          expiresAt,
        };

        // Create activity log
        const log: ActivityLog = {
          id: uuidv4(),
          groupId: qrData.groupId,
          actorId: qrData.issuerId,
          action: 'issue',
          ticketId: ticket.id,
          targetUserId: user.id,
          metadata: { templateName: qrData.templateName },
          createdAt: new Date(),
        };

        // Sync (saves locally, queues for cloud if offline)
        await syncTicket(ticket, 'insert');
        await syncActivityLog(log);

        // Also save the template locally if we don't have it
        const existingTemplate = await db.ticketTemplates.get(qrData.templateId);
        if (!existingTemplate) {
          // Create a minimal template record for display purposes
          await db.ticketTemplates.put({
            id: qrData.templateId,
            groupId: qrData.groupId,
            name: qrData.templateName,
            image: qrData.templateImage,
            onGraduation: 'destroy',
            createdAt: new Date(),
          });
        }

        // Save group if we don't have it
        const existingGroup = await db.groups.get(qrData.groupId);
        if (!existingGroup) {
          await db.groups.put({
            id: qrData.groupId,
            name: qrData.templateName.split(' ')[0] || 'グループ',
            ownerId: qrData.issuerId,
            createdAt: new Date(),
          });
        }

        setResult({
          type: 'success',
          message: 'チケットを受け取りました！',
          ticket,
          templateName: qrData.templateName,
        });
      } else if (parsed.type === 'staff_invite' && isStaffInviteQRData(parsed.data)) {
        // Join as staff (offline compatible)
        const qrData = parsed.data as StaffInviteQRData;

        // Check if already staff
        const existing = await db.staff
          .where('[groupId+userId]')
          .equals([qrData.groupId, user.id])
          .first();

        if (existing) {
          setResult({
            type: 'error',
            message: '既にスタッフとして登録されています',
          });
          return;
        }

        // Create staff entry
        const staff: Staff = {
          id: uuidv4(),
          groupId: qrData.groupId,
          userId: user.id,
          role: 'staff',
          invitedBy: qrData.inviterId,
          createdAt: new Date(),
        };

        const log: ActivityLog = {
          id: uuidv4(),
          groupId: qrData.groupId,
          actorId: qrData.inviterId,
          action: 'staff_add',
          targetUserId: user.id,
          createdAt: new Date(),
        };

        await syncStaff(staff, 'insert');
        await syncActivityLog(log);

        // Save group if we don't have it
        const existingGroup = await db.groups.get(qrData.groupId);
        if (!existingGroup) {
          await db.groups.put({
            id: qrData.groupId,
            name: qrData.groupName,
            ownerId: qrData.inviterId,
            createdAt: new Date(),
          });
        }

        setResult({
          type: 'success',
          message: `${qrData.groupName}のスタッフになりました`,
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
          {result?.templateName && (
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
              {result.templateName}
            </p>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
