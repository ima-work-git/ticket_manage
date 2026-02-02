import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../hooks/useGroups';
import { db } from '../db';
import { generateQRPayload, type StaffInviteQRData } from '../utils/crypto';
import type { Staff, User, Group } from '../types';

interface StaffWithUser extends Staff {
  user?: User;
}

export function StaffManage() {
  const { id: groupId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { removeStaff } = useGroups();

  const [staffList, setStaffList] = useState<StaffWithUser[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [qrPayload, setQrPayload] = useState('');
  const [showRemove, setShowRemove] = useState<string | null>(null);

  const staffToRemove = staffList.find((s) => s.id === showRemove);

  useEffect(() => {
    if (!groupId) return;

    const load = async () => {
      // Load group info
      const g = await db.groups.get(groupId);
      setGroup(g || null);

      // Load staff with user info
      const staff = await db.staff.where('groupId').equals(groupId).toArray();
      const userIds = staff.map((s) => s.userId);
      const users = await db.users.where('id').anyOf(userIds).toArray();
      const userMap = new Map(users.map((u) => [u.id, u]));

      const staffWithUsers: StaffWithUser[] = staff.map((s) => ({
        ...s,
        user: userMap.get(s.userId),
      }));

      setStaffList(staffWithUsers);
      setLoading(false);
    };

    load();
  }, [groupId]);

  const handleShowInvite = async () => {
    if (!user || !groupId || !group) return;

    const qrData: StaffInviteQRData = {
      groupId,
      groupName: group.name,
      inviterId: user.id,
    };
    const payload = generateQRPayload('staff_invite', qrData);
    setQrPayload(payload);
    setShowInvite(true);

    // Refresh QR every 60 seconds
    const interval = setInterval(() => {
      const newQrData: StaffInviteQRData = {
        groupId,
        groupName: group.name,
        inviterId: user.id,
      };
      const newPayload = generateQRPayload('staff_invite', newQrData);
      setQrPayload(newPayload);
    }, 60000);

    // Store interval ID for cleanup
    return () => clearInterval(interval);
  };

  const handleRemove = async () => {
    if (!showRemove || !groupId) return;

    await removeStaff(groupId, showRemove);

    // Reload staff list
    const staff = await db.staff.where('groupId').equals(groupId).toArray();
    const userIds = staff.map((s) => s.userId);
    const users = await db.users.where('id').anyOf(userIds).toArray();
    const userMap = new Map(users.map((u) => [u.id, u]));

    const staffWithUsers: StaffWithUser[] = staff.map((s) => ({
      ...s,
      user: userMap.get(s.userId),
    }));

    setStaffList(staffWithUsers);
    setShowRemove(null);
  };

  if (loading) {
    return (
      <Layout title="スタッフ管理" showBack>
        <div className="loading">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  const owners = staffList.filter((s) => s.role === 'owner');
  const staffMembers = staffList.filter((s) => s.role === 'staff');

  return (
    <Layout
      title="スタッフ管理"
      showBack
      rightAction={
        <button className="btn btn-sm btn-primary" onClick={handleShowInvite}>
          + 招待
        </button>
      }
    >
      <div className="container">
        <div className="section">
          <h3 className="section-title">オーナー</h3>
          {owners.map((staff) => (
            <div key={staff.id} className="card">
              <div className="flex items-center gap-3">
                <div className="avatar">
                  {staff.user?.nickname?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <div className="card-title">
                    {staff.user?.nickname || '不明なユーザー'}
                  </div>
                  <span
                    className="member-badge"
                    style={{ background: '#fef3c7' }}
                  >
                    オーナー
                  </span>
                </div>
                {staff.userId === user?.id && (
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    あなた
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="section">
          <h3 className="section-title">スタッフ ({staffMembers.length})</h3>
          {staffMembers.length === 0 ? (
            <div className="card text-center">
              <p style={{ color: 'var(--text-secondary)' }}>
                スタッフがいません
              </p>
            </div>
          ) : (
            staffMembers.map((staff) => (
              <div key={staff.id} className="card">
                <div className="flex items-center gap-3">
                  <div className="avatar">
                    {staff.user?.nickname?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="card-title">
                      {staff.user?.nickname || '不明なユーザー'}
                    </div>
                    <span className="member-badge">スタッフ</span>
                  </div>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setShowRemove(staff.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        title="スタッフ招待"
      >
        <div className="qr-container">
          <div className="qr-code">
            {qrPayload ? (
              <QRCodeSVG value={qrPayload} size={200} />
            ) : (
              <div className="spinner" />
            )}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            招待したい人にこのQRコードをスキャンしてもらってください
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            ※ QRコードは5分間有効です
          </p>
        </div>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={showRemove !== null}
        onClose={() => setShowRemove(null)}
        title="スタッフを削除"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowRemove(null)}
            >
              キャンセル
            </button>
            <button className="btn btn-danger" onClick={handleRemove}>
              削除
            </button>
          </>
        }
      >
        <p>
          <strong>{staffToRemove?.user?.nickname || '不明なユーザー'}</strong>
          をスタッフから削除しますか？
        </p>
        <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 14 }}>
          削除されたスタッフはチケットの発行・消費ができなくなります。
        </p>
      </Modal>
    </Layout>
  );
}
