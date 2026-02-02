import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { ImageUpload } from '../components/ImageUpload';
import { useTemplates } from '../hooks/useTemplates';
import { useMembers } from '../hooks/useMembers';
import type { OnGraduationAction } from '../types';

const graduationLabels: Record<OnGraduationAction, string> = {
  destroy: '無効化（破棄）',
  convert: '全メンバーOK券に変換',
  refund: '返却対象としてマーク',
};

export function TemplateManage() {
  const { id: groupId } = useParams<{ id: string }>();
  const { templates, loading, createTemplate, deleteTemplate } = useTemplates(
    groupId || ''
  );
  const { activeMembers } = useMembers(groupId || '');

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | undefined>();
  const [targetMemberId, setTargetMemberId] = useState<string>('');
  const [expiresInDays, setExpiresInDays] = useState<string>('');
  const [onGraduation, setOnGraduation] = useState<OnGraduationAction>('convert');
  const [adding, setAdding] = useState(false);

  const [showDelete, setShowDelete] = useState<string | null>(null);
  const templateToDelete = templates.find((t) => t.id === showDelete);

  const resetForm = () => {
    setName('');
    setDescription('');
    setImage(undefined);
    setTargetMemberId('');
    setExpiresInDays('');
    setOnGraduation('convert');
  };

  const handleAdd = async () => {
    if (!name.trim()) return;

    setAdding(true);
    try {
      await createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        image,
        targetMemberId: targetMemberId || undefined,
        expiresInDays: expiresInDays ? parseInt(expiresInDays, 10) : undefined,
        onGraduation,
      });
      setShowAdd(false);
      resetForm();
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    await deleteTemplate(showDelete);
    setShowDelete(null);
  };

  if (loading) {
    return (
      <Layout title="チケット種類" showBack>
        <div className="loading">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="チケット種類"
      showBack
      rightAction={
        <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(true)}>
          + 追加
        </button>
      }
    >
      <div className="container">
        {templates.length === 0 ? (
          <div className="empty-state">
            <p>チケット種類がありません</p>
            <button
              className="btn btn-primary mt-4"
              onClick={() => setShowAdd(true)}
            >
              チケット種類を追加
            </button>
          </div>
        ) : (
          templates.map((template) => {
            const targetMember = activeMembers.find(
              (m) => m.id === template.targetMemberId
            );
            return (
              <div key={template.id} className="ticket-card">
                {template.image ? (
                  <img
                    src={template.image}
                    alt={template.name}
                    className="ticket-image"
                  />
                ) : (
                  <div className="ticket-image-placeholder">
                    {template.name[0]}
                  </div>
                )}
                <div className="ticket-content">
                  <div className="ticket-name">{template.name}</div>
                  {template.description && (
                    <p
                      style={{
                        fontSize: 14,
                        color: 'var(--text-secondary)',
                        marginBottom: 8,
                      }}
                    >
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    {targetMember && (
                      <span className="member-badge">{targetMember.name}専用</span>
                    )}
                    {template.expiresInDays && (
                      <span className="member-badge">
                        {template.expiresInDays}日間有効
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setShowDelete(template.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Template Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => {
          setShowAdd(false);
          resetForm();
        }}
        title="チケット種類を追加"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowAdd(false);
                resetForm();
              }}
            >
              キャンセル
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={!name.trim() || adding}
            >
              {adding ? '追加中...' : '追加'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">チケット名</label>
          <input
            type="text"
            className="form-input"
            placeholder="例: チェキ券、握手券"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">説明（任意）</label>
          <input
            type="text"
            className="form-input"
            placeholder="チケットの説明"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">デザイン画像（任意）</label>
          <ImageUpload value={image} onChange={setImage} />
        </div>

        <div className="form-group">
          <label className="form-label">対象メンバー（任意）</label>
          <select
            className="form-select"
            value={targetMemberId}
            onChange={(e) => setTargetMemberId(e.target.value)}
          >
            <option value="">全メンバーOK</option>
            {activeMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}専用
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">有効期限（任意）</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="form-input"
              placeholder="日数"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              min="1"
              style={{ width: 100 }}
            />
            <span>日間</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            空欄の場合は無期限
          </p>
        </div>

        {targetMemberId && (
          <div className="form-group">
            <label className="form-label">メンバー卒業時の処理</label>
            <select
              className="form-select"
              value={onGraduation}
              onChange={(e) =>
                setOnGraduation(e.target.value as OnGraduationAction)
              }
            >
              {Object.entries(graduationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDelete !== null}
        onClose={() => setShowDelete(null)}
        title="チケット種類を削除"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowDelete(null)}
            >
              キャンセル
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              削除
            </button>
          </>
        }
      >
        <p>
          <strong>{templateToDelete?.name}</strong>
          を削除しますか？
        </p>
        <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 14 }}>
          既に発行されたチケットには影響しません。
        </p>
      </Modal>
    </Layout>
  );
}
