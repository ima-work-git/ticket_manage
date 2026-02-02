import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { ImageUpload } from '../components/ImageUpload';
import { useMembers } from '../hooks/useMembers';

export function MemberManage() {
  const { id: groupId } = useParams<{ id: string }>();
  const { members, activeMembers, graduatedMembers, loading, addMember, graduateMember } =
    useMembers(groupId || '');

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);

  const [showGraduate, setShowGraduate] = useState<string | null>(null);
  const memberToGraduate = members.find((m) => m.id === showGraduate);

  const handleAdd = async () => {
    if (!name.trim()) return;

    setAdding(true);
    try {
      await addMember(name.trim(), image);
      setShowAdd(false);
      setName('');
      setImage(undefined);
    } finally {
      setAdding(false);
    }
  };

  const handleGraduate = async () => {
    if (!showGraduate) return;

    await graduateMember(showGraduate);
    setShowGraduate(null);
  };

  if (loading) {
    return (
      <Layout title="メンバー管理" showBack>
        <div className="loading">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="メンバー管理"
      showBack
      rightAction={
        <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(true)}>
          + 追加
        </button>
      }
    >
      <div className="container">
        {activeMembers.length === 0 && graduatedMembers.length === 0 ? (
          <div className="empty-state">
            <p>メンバーがいません</p>
            <button
              className="btn btn-primary mt-4"
              onClick={() => setShowAdd(true)}
            >
              メンバーを追加
            </button>
          </div>
        ) : (
          <>
            {activeMembers.length > 0 && (
              <div className="section">
                <h3 className="section-title">現役メンバー</h3>
                {activeMembers.map((member) => (
                  <div key={member.id} className="card">
                    <div className="flex items-center gap-3">
                      {member.image ? (
                        <img
                          src={member.image}
                          alt={member.name}
                          className="avatar-lg"
                          style={{ borderRadius: 12, objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="avatar avatar-lg">{member.name[0]}</div>
                      )}
                      <div className="flex-1">
                        <div className="card-title">{member.name}</div>
                      </div>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setShowGraduate(member.id)}
                      >
                        卒業
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {graduatedMembers.length > 0 && (
              <div className="section">
                <h3 className="section-title">卒業メンバー</h3>
                {graduatedMembers.map((member) => (
                  <div key={member.id} className="card" style={{ opacity: 0.6 }}>
                    <div className="flex items-center gap-3">
                      {member.image ? (
                        <img
                          src={member.image}
                          alt={member.name}
                          className="avatar-lg"
                          style={{
                            borderRadius: 12,
                            objectFit: 'cover',
                            filter: 'grayscale(1)',
                          }}
                        />
                      ) : (
                        <div
                          className="avatar avatar-lg"
                          style={{ background: 'var(--text-secondary)' }}
                        >
                          {member.name[0]}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="card-title">{member.name}</div>
                        <span className="member-badge graduated">卒業済み</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="メンバーを追加"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowAdd(false)}
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
          <label className="form-label">名前</label>
          <input
            type="text"
            className="form-input"
            placeholder="メンバー名"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">写真（任意）</label>
          <ImageUpload value={image} onChange={setImage} aspectRatio="1 / 1" />
        </div>
      </Modal>

      {/* Graduate Confirmation Modal */}
      <Modal
        isOpen={showGraduate !== null}
        onClose={() => setShowGraduate(null)}
        title="卒業処理"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowGraduate(null)}
            >
              キャンセル
            </button>
            <button className="btn btn-danger" onClick={handleGraduate}>
              卒業させる
            </button>
          </>
        }
      >
        <p>
          <strong>{memberToGraduate?.name}</strong>
          を卒業させますか？
        </p>
        <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 14 }}>
          このメンバー専用の特典券は、テンプレートの設定に従って処理されます。
        </p>
      </Modal>
    </Layout>
  );
}
