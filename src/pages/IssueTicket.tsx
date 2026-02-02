import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { Layout } from '../components/Layout';
import { useTemplates } from '../hooks/useTemplates';
import { useAuth } from '../contexts/AuthContext';
import { generateQRPayload, type IssueQRData } from '../utils/crypto';
import { syncPendingTicket } from '../services/sync';
import type { PendingTicket } from '../types';

export function IssueTicket() {
  const { id: groupId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { templates, loading } = useTemplates(groupId || '');

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [qrPayload, setQrPayload] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  useEffect(() => {
    if (!selectedTemplateId || !user || !groupId) {
      setQrPayload('');
      return;
    }

    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) {
      setQrPayload('');
      return;
    }

    const generate = async () => {
      setGenerating(true);
      // Generate a unique ticket ID for each QR generation
      // This ensures each scan creates a unique ticket
      const ticketId = uuidv4();

      // Create pending ticket in operator's local DB
      const pendingTicket: PendingTicket = {
        id: ticketId,
        templateId: template.id,
        groupId,
        templateName: template.name,
        templateImage: template.image,
        expiresInDays: template.expiresInDays,
        issuedBy: user.id,
        issuedAt: new Date(),
        status: 'pending',
      };

      // Save to local DB and sync to cloud
      await syncPendingTicket(pendingTicket, 'create');

      const qrData: IssueQRData = {
        ticketId,
        templateId: template.id,
        groupId,
        templateName: template.name,
        templateImage: template.image,
        expiresInDays: template.expiresInDays,
        issuerId: user.id,
      };

      const payload = generateQRPayload('issue', qrData);
      setQrPayload(payload);
      setGenerating(false);
    };

    generate();

    // Refresh QR every 60 seconds to generate new ticket ID
    const interval = setInterval(generate, 60000);
    return () => clearInterval(interval);
  }, [selectedTemplateId, user, groupId, templates]);

  if (loading) {
    return (
      <Layout title="チケット発行" showBack>
        <div className="loading">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="チケット発行" showBack>
      <div className="container">
        {templates.length === 0 ? (
          <div className="empty-state">
            <p>チケット種類がありません</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>
              先にチケット種類を作成してください
            </p>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">発行するチケット</label>
              <select
                className="form-select"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">選択してください</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplate && (
              <div className="card">
                {selectedTemplate.image && (
                  <img
                    src={selectedTemplate.image}
                    alt={selectedTemplate.name}
                    style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      objectFit: 'cover',
                      borderRadius: 8,
                      marginBottom: 16,
                    }}
                  />
                )}
                <h3 className="mb-2">{selectedTemplate.name}</h3>
                {selectedTemplate.description && (
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                    {selectedTemplate.description}
                  </p>
                )}
              </div>
            )}

            {qrPayload && (
              <div className="card">
                <h3 className="text-center mb-4">発行用QRコード</h3>
                <div className="qr-container">
                  <div className="qr-code">
                    {generating ? (
                      <div className="spinner" />
                    ) : (
                      <QRCodeSVG value={qrPayload} size={200} />
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                      textAlign: 'center',
                    }}
                  >
                    ファンにこのQRコードをスキャンしてもらってください
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      marginTop: 8,
                    }}
                  >
                    ※ QRコードは5分間有効です（自動更新されます）
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
