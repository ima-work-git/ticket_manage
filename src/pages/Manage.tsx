import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { ImageUpload } from '../components/ImageUpload';
import { useGroups } from '../hooks/useGroups';

export function Manage() {
  const navigate = useNavigate();
  const { groups, loading, createGroup } = useGroups();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setCreating(true);
    try {
      const group = await createGroup(name.trim(), image);
      setShowCreate(false);
      setName('');
      setImage(undefined);
      navigate(`/manage/${group.id}`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Layout title="グループ管理">
        <div className="loading">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="グループ管理"
      rightAction={
        <button className="btn btn-sm btn-primary" onClick={() => setShowCreate(true)}>
          + 新規
        </button>
      }
    >
      <div className="container">
        {groups.length === 0 ? (
          <div className="empty-state">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <p>管理しているグループがありません</p>
            <button
              className="btn btn-primary mt-4"
              onClick={() => setShowCreate(true)}
            >
              グループを作成
            </button>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              運営として参加しているグループ
            </p>
            {groups.map((group) => (
              <div
                key={group.id}
                className="card list-item-clickable"
                onClick={() => navigate(`/manage/${group.id}`)}
              >
                <div className="flex items-center gap-3">
                  {group.image ? (
                    <img
                      src={group.image}
                      alt={group.name}
                      className="card-image"
                    />
                  ) : (
                    <div
                      className="card-image"
                      style={{
                        background:
                          'linear-gradient(135deg, var(--primary), var(--secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    >
                      {group.name[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="card-title">{group.name}</div>
                  </div>
                  <span style={{ color: 'var(--text-secondary)' }}>→</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="グループを作成"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowCreate(false)}
            >
              キャンセル
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={!name.trim() || creating}
            >
              {creating ? '作成中...' : '作成'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">グループ名</label>
          <input
            type="text"
            className="form-input"
            placeholder="例: ○○プロジェクト"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">ロゴ画像（任意）</label>
          <ImageUpload value={image} onChange={setImage} aspectRatio="1 / 1" />
        </div>
      </Modal>
    </Layout>
  );
}
