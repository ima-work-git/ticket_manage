import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Layout } from '../components/Layout';
import { db } from '../db';
import { generateQRPayload, type ConsumeQRData } from '../utils/crypto';
import { useAuth } from '../contexts/AuthContext';
import type { Ticket, TicketTemplate, Group } from '../types';

const statusLabels: Record<string, string> = {
  active: '有効',
  used: '使用済み',
  expired: '期限切れ',
  refunded: '返却済み',
};

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [template, setTemplate] = useState<TicketTemplate | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [qrPayload, setQrPayload] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadTicket = async () => {
      const t = await db.tickets.get(id);
      if (!t) {
        navigate('/');
        return;
      }
      setTicket(t);

      const tmpl = await db.ticketTemplates.get(t.templateId);
      setTemplate(tmpl || null);

      const g = await db.groups.get(t.groupId);
      setGroup(g || null);

      // Generate QR for consumption (includes all data for offline verification)
      if (t.status === 'active' && user && tmpl) {
        const qrData: ConsumeQRData = {
          ticketId: t.id,
          templateId: tmpl.id,
          templateName: tmpl.name,
          templateImage: tmpl.image,
          groupId: t.groupId,
          ownerId: user.id,
          ownerNickname: user.nickname,
        };
        const payload = generateQRPayload('consume', qrData);
        setQrPayload(payload);
      }

      setLoading(false);
    };

    loadTicket();

    // Refresh QR every 30 seconds
    const interval = setInterval(async () => {
      if (ticket?.status === 'active' && user && template) {
        const qrData: ConsumeQRData = {
          ticketId: ticket.id,
          templateId: template.id,
          templateName: template.name,
          templateImage: template.image,
          groupId: ticket.groupId,
          ownerId: user.id,
          ownerNickname: user.nickname,
        };
        const payload = generateQRPayload('consume', qrData);
        setQrPayload(payload);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [id, navigate, user, ticket?.status, ticket?.id, ticket?.groupId, template]);

  if (loading) {
    return (
      <Layout title="チケット詳細" showBack>
        <div className="loading">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  if (!ticket || !template) {
    return (
      <Layout title="チケット詳細" showBack>
        <div className="container">
          <div className="empty-state">
            <p>チケットが見つかりません</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="チケット詳細" showBack>
      <div className="container">
        <div className="ticket-card">
          {template.image ? (
            <img src={template.image} alt={template.name} className="ticket-image" />
          ) : (
            <div className="ticket-image-placeholder">{template.name[0]}</div>
          )}
          <div className="ticket-content">
            <div className="ticket-name">{template.name}</div>
            <div className="ticket-group">{group?.name || '不明なグループ'}</div>
            <span className={`ticket-status ${ticket.status}`}>
              {statusLabels[ticket.status]}
            </span>
          </div>
        </div>

        {ticket.status === 'active' && qrPayload && (
          <div className="card">
            <h3 className="text-center mb-4">消費用QRコード</h3>
            <div className="qr-container">
              <div className="qr-code">
                <QRCodeSVG value={qrPayload} size={200} />
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                運営にこのQRを見せて特典を受け取ってください
              </p>
            </div>
          </div>
        )}

        <div className="card">
          <h3 className="mb-4">詳細情報</h3>
          <div className="list-item">
            <span style={{ color: 'var(--text-secondary)' }}>発行日</span>
            <span className="flex-1" style={{ textAlign: 'right' }}>
              {format(new Date(ticket.issuedAt), 'yyyy/MM/dd HH:mm', {
                locale: ja,
              })}
            </span>
          </div>
          {ticket.expiresAt && (
            <div className="list-item">
              <span style={{ color: 'var(--text-secondary)' }}>有効期限</span>
              <span className="flex-1" style={{ textAlign: 'right' }}>
                {format(new Date(ticket.expiresAt), 'yyyy/MM/dd', { locale: ja })}
              </span>
            </div>
          )}
          {ticket.consumedAt && (
            <>
              <div className="list-item">
                <span style={{ color: 'var(--text-secondary)' }}>使用日時</span>
                <span className="flex-1" style={{ textAlign: 'right' }}>
                  {format(new Date(ticket.consumedAt), 'yyyy/MM/dd HH:mm', {
                    locale: ja,
                  })}
                </span>
              </div>
              {ticket.eventName && (
                <div className="list-item">
                  <span style={{ color: 'var(--text-secondary)' }}>イベント</span>
                  <span className="flex-1" style={{ textAlign: 'right' }}>
                    {ticket.eventName}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
