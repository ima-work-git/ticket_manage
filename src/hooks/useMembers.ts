import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type { IdolMember, ActivityLog } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { syncIdolMember, syncTicket, syncActivityLog } from '../services/sync';

export function useMembers(groupId: string) {
  const { user } = useAuth();
  const [members, setMembers] = useState<IdolMember[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    const allMembers = await db.idolMembers
      .where('groupId')
      .equals(groupId)
      .toArray();
    setMembers(allMembers.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const addMember = async (name: string, image?: string): Promise<IdolMember> => {
    if (!user) throw new Error('User not logged in');

    const member: IdolMember = {
      id: uuidv4(),
      groupId,
      name,
      image,
      status: 'active',
      createdAt: new Date(),
    };

    const log: ActivityLog = {
      id: uuidv4(),
      groupId,
      actorId: user.id,
      action: 'member_add',
      metadata: { memberName: name },
      createdAt: new Date(),
    };

    await syncIdolMember(member, 'insert');
    await syncActivityLog(log);

    await loadMembers();
    return member;
  };

  const updateMember = async (
    memberId: string,
    updates: Partial<Pick<IdolMember, 'name' | 'image'>>
  ) => {
    const existing = await db.idolMembers.get(memberId);
    if (!existing) return;

    const updated: IdolMember = { ...existing, ...updates };
    await syncIdolMember(updated, 'update');
    await loadMembers();
  };

  const graduateMember = async (memberId: string) => {
    if (!user) throw new Error('User not logged in');

    const member = await db.idolMembers.get(memberId);
    if (!member) return;

    // Get all templates targeting this member
    const templates = await db.ticketTemplates
      .where('groupId')
      .equals(groupId)
      .toArray();
    const memberTemplates = templates.filter(
      (t) => t.targetMemberId === memberId
    );

    // Update member status
    const graduatedMember: IdolMember = {
      ...member,
      status: 'graduated',
      graduatedAt: new Date(),
    };
    await syncIdolMember(graduatedMember, 'update');

    // Process tickets based on onGraduation setting
    for (const template of memberTemplates) {
      const tickets = await db.tickets
        .where('templateId')
        .equals(template.id)
        .filter((t) => t.status === 'active')
        .toArray();

      for (const ticket of tickets) {
        let newStatus: 'expired' | 'refunded' | 'active' = 'active';
        switch (template.onGraduation) {
          case 'destroy':
            newStatus = 'expired';
            break;
          case 'refund':
            newStatus = 'refunded';
            break;
          case 'convert':
            // Keep as active (converted to any-member ticket)
            newStatus = 'active';
            break;
        }
        if (newStatus !== 'active') {
          await syncTicket({ ...ticket, status: newStatus }, 'update');
        }
      }
    }

    // Log the graduation
    const log: ActivityLog = {
      id: uuidv4(),
      groupId,
      actorId: user.id,
      action: 'member_graduate',
      metadata: { memberName: member.name, memberId },
      createdAt: new Date(),
    };
    await syncActivityLog(log);

    await loadMembers();
  };

  const activeMembers = members.filter((m) => m.status === 'active');
  const graduatedMembers = members.filter((m) => m.status === 'graduated');

  return {
    members,
    activeMembers,
    graduatedMembers,
    loading,
    addMember,
    updateMember,
    graduateMember,
    reload: loadMembers,
  };
}
