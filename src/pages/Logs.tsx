import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Layout } from '../components/Layout';
import { useLogs } from '../hooks/useLogs';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db';

const actionLabels: Record<string, { label: string; className: string }> = {
  issue: { label: '発行', className: 'issue' },
  consume: { label: '消費', className: 'consume' },
  staff_add: { label: 'スタッフ追加', className: '' },
  staff_remove: { label: 'スタッフ削除', className: '' },
  member_add: { label: 'メンバー追加', className: '' },
  member_graduate: { label: 'メンバー卒業', className: '' },
  template_create: { label: 'テンプレート作成', className: '' },
  template_update: { label: 'テンプレート更新', className: '' },
  template_delete: { label: 'テンプレート削除', className: '' },
};

export function Logs() {
  const { id: groupId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');

  const { logs, loading } = useLogs(groupId || '', viewMode === 'mine');

  useEffect(() => {
    if (!groupId || !user) return;

    db.staff
      .where('[groupId+userId]')
      .equals([groupId, user.id])
      .first()
      .then((staff) => {
        setIsOwner(staff?.role === 'owner');
        if (staff?.role !== 'owner') {
          setViewMode('mine');
        }
      });
  }, [groupId, user]);

  if (loading) {
    return (
      <Layout title="操作履歴" showBack>
        <div className="loading">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="操作履歴" showBack>
      <div className="container">
        {isOwner && (
          <div className="tabs">
            <button
              className={`tab ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              全て
            </button>
            <button
              className={`tab ${viewMode === 'mine' ? 'active' : ''}`}
              onClick={() => setViewMode('mine')}
            >
              自分のみ
            </button>
          </div>
        )}

        {logs.length === 0 ? (
          <div className="empty-state">
            <p>操作履歴がありません</p>
          </div>
        ) : (
          <div className="card">
            {logs.map((log) => {
              const actionInfo = actionLabels[log.action] || {
                label: log.action,
                className: '',
              };
              const metadata = log.metadata as Record<string, string> | undefined;

              return (
                <div key={log.id} className="log-item">
                  <div className="flex items-center justify-between">
                    <span className={`log-action ${actionInfo.className}`}>
                      {actionInfo.label}
                    </span>
                    <span className="log-time">
                      {format(new Date(log.createdAt), 'MM/dd HH:mm', {
                        locale: ja,
                      })}
                    </span>
                  </div>
                  <div className="log-content">
                    <span style={{ fontWeight: 500 }}>
                      {log.actor?.nickname || '不明'}
                    </span>
                    {log.action === 'issue' && (
                      <>
                        {' → '}
                        <span>{log.targetUser?.nickname || '不明'}</span>
                        {metadata?.templateName && (
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {' '}
                            ({metadata.templateName})
                          </span>
                        )}
                      </>
                    )}
                    {log.action === 'consume' && (
                      <>
                        {' ← '}
                        <span>{log.targetUser?.nickname || '不明'}</span>
                        {metadata?.templateName && (
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {' '}
                            ({metadata.templateName})
                          </span>
                        )}
                        {metadata?.eventName && (
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {' '}
                            @ {metadata.eventName}
                          </span>
                        )}
                      </>
                    )}
                    {log.action === 'staff_add' && (
                      <>
                        {' が '}
                        <span>{log.targetUser?.nickname || '不明'}</span>
                        {' を招待'}
                      </>
                    )}
                    {log.action === 'staff_remove' && (
                      <>
                        {' が '}
                        <span>{log.targetUser?.nickname || '不明'}</span>
                        {' を削除'}
                      </>
                    )}
                    {log.action === 'member_add' && (
                      <>
                        {' が '}
                        <span>{metadata?.memberName || '不明'}</span>
                        {' を追加'}
                      </>
                    )}
                    {log.action === 'member_graduate' && (
                      <>
                        {' が '}
                        <span>{metadata?.memberName || '不明'}</span>
                        {' を卒業'}
                      </>
                    )}
                    {log.action === 'template_create' && (
                      <>
                        {' が '}
                        <span>{metadata?.templateName || '不明'}</span>
                        {' を作成'}
                      </>
                    )}
                    {log.action === 'template_delete' && (
                      <>
                        {' が '}
                        <span>{metadata?.templateName || '不明'}</span>
                        {' を削除'}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
