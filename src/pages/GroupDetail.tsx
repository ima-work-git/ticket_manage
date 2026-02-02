import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { db } from '../db';
import { useAuth } from '../contexts/AuthContext';
import type { Group, Staff } from '../types';

export function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;

    const load = async () => {
      const g = await db.groups.get(id);
      if (!g) {
        navigate('/manage');
        return;
      }
      setGroup(g);

      const s = await db.staff
        .where('[groupId+userId]')
        .equals([id, user.id])
        .first();
      setStaff(s || null);

      setLoading(false);
    };

    load();
  }, [id, user, navigate]);

  if (loading) {
    return (
      <Layout title="グループ" showBack>
        <div className="loading">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout title="グループ" showBack>
        <div className="container">
          <div className="empty-state">
            <p>グループが見つかりません</p>
          </div>
        </div>
      </Layout>
    );
  }

  const isOwner = staff?.role === 'owner';

  const menuItems = [
    {
      label: 'チケット発行',
      description: 'ファンにチケットを発行する',
      path: `/manage/${id}/issue`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M12 14v4" />
          <path d="M10 16h4" />
        </svg>
      ),
    },
    {
      label: 'チケット消費',
      description: 'ファンのチケットを使用する',
      path: `/manage/${id}/consume`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <path d="M8 12h8" />
        </svg>
      ),
    },
    {
      label: 'メンバー管理',
      description: 'アイドルメンバーの追加・編集',
      path: `/manage/${id}/members`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'チケット種類',
      description: '特典券テンプレートの管理',
      path: `/manage/${id}/templates`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
      ),
    },
    {
      label: '操作履歴',
      description: '発行・消費のログを確認',
      path: `/manage/${id}/logs`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
  ];

  if (isOwner) {
    menuItems.push({
      label: 'スタッフ管理',
      description: 'スタッフの追加・削除',
      path: `/manage/${id}/staff`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      ),
    });
  }

  return (
    <Layout title={group.name} showBack>
      <div className="container">
        <div className="card text-center mb-4">
          {group.image ? (
            <img
              src={group.image}
              alt={group.name}
              style={{
                width: 80,
                height: 80,
                borderRadius: 16,
                objectFit: 'cover',
                margin: '0 auto 16px',
              }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 16,
                background:
                  'linear-gradient(135deg, var(--primary), var(--secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 32,
                fontWeight: 600,
                margin: '0 auto 16px',
              }}
            >
              {group.name[0]}
            </div>
          )}
          <h2 style={{ fontSize: 20, marginBottom: 4 }}>{group.name}</h2>
          <span
            className="member-badge"
            style={{ background: isOwner ? '#fef3c7' : undefined }}
          >
            {isOwner ? 'オーナー' : 'スタッフ'}
          </span>
        </div>

        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="card list-item-clickable">
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: 'var(--background)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ width: 24, height: 24 }}>{item.icon}</div>
                </div>
                <div className="flex-1">
                  <div className="card-title">{item.label}</div>
                  <div className="card-subtitle">{item.description}</div>
                </div>
                <span style={{ color: 'var(--text-secondary)' }}>→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
