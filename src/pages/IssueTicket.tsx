import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Layout } from '../components/Layout';
import { useTemplates } from '../hooks/useTemplates';
import { useAuth } from '../contexts/AuthContext';
import { generateQRPayload } from '../utils/crypto';

export function IssueTicket() {
  const { id: groupId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { templates, loading } = useTemplates(groupId || '');

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [qrPayload, setQrPayload] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  useEffect(() => {
    if (!selectedTemplateId || !user) {
      setQrPayload('');
      return;
    }

    const generate = async () => {
      setGenerating(true);
      const payload = await generateQRPayload('issue', {
        templateId: selectedTemplateId,
        issuerId: user.id,
      });
      setQrPayload(payload);
      setGenerating(false);
    };

    generate();

    // Refresh QR every 60 seconds
    const interval = setInterval(generate, 60000);
    return () => clearInterval(interval);
  }, [selectedTemplateId, user]);

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
