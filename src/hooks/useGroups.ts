import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type { Group, Staff, ActivityLog } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }

    // Get groups where user is staff (owner or staff)
    const staffEntries = await db.staff.where('userId').equals(user.id).toArray();
    const groupIds = staffEntries.map((s) => s.groupId);
    const managedGroups = await db.groups.where('id').anyOf(groupIds).toArray();

    // Get groups where user has tickets
    const tickets = await db.tickets.where('ownerId').equals(user.id).toArray();
    const ticketGroupIds = [...new Set(tickets.map((t) => t.groupId))];
    const ticketGroups = await db.groups
      .where('id')
      .anyOf(ticketGroupIds)
      .toArray();

    // Merge and deduplicate
    const allGroups = [...managedGroups];
    for (const g of ticketGroups) {
      if (!allGroups.find((mg) => mg.id === g.id)) {
        allGroups.push(g);
      }
    }

    setGroups(allGroups);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const createGroup = async (name: string, image?: string): Promise<Group> => {
    if (!user) throw new Error('User not logged in');

    const group: Group = {
      id: uuidv4(),
      name,
      image,
      ownerId: user.id,
      createdAt: new Date(),
    };

    const staff: Staff = {
      id: uuidv4(),
      groupId: group.id,
      userId: user.id,
      role: 'owner',
      createdAt: new Date(),
    };

    await db.transaction('rw', [db.groups, db.staff], async () => {
      await db.groups.add(group);
      await db.staff.add(staff);
    });

    await loadGroups();
    return group;
  };

  const updateGroup = async (
    groupId: string,
    updates: Partial<Pick<Group, 'name' | 'image'>>
  ) => {
    await db.groups.update(groupId, updates);
    await loadGroups();
  };

  const getStaffRole = async (
    groupId: string
  ): Promise<'owner' | 'staff' | null> => {
    if (!user) return null;
    const staff = await db.staff
      .where('[groupId+userId]')
      .equals([groupId, user.id])
      .first();
    return staff?.role || null;
  };

  const addStaff = async (groupId: string, userId: string) => {
    if (!user) throw new Error('User not logged in');

    const existing = await db.staff
      .where('[groupId+userId]')
      .equals([groupId, userId])
      .first();
    if (existing) return;

    const staff: Staff = {
      id: uuidv4(),
      groupId,
      userId,
      role: 'staff',
      invitedBy: user.id,
      createdAt: new Date(),
    };

    const log: ActivityLog = {
      id: uuidv4(),
      groupId,
      actorId: user.id,
      action: 'staff_add',
      targetUserId: userId,
      createdAt: new Date(),
    };

    await db.transaction('rw', [db.staff, db.activityLogs], async () => {
      await db.staff.add(staff);
      await db.activityLogs.add(log);
    });
  };

  const removeStaff = async (groupId: string, staffId: string) => {
    if (!user) throw new Error('User not logged in');

    const staffEntry = await db.staff.get(staffId);
    if (!staffEntry || staffEntry.role === 'owner') return;

    const log: ActivityLog = {
      id: uuidv4(),
      groupId,
      actorId: user.id,
      action: 'staff_remove',
      targetUserId: staffEntry.userId,
      createdAt: new Date(),
    };

    await db.transaction('rw', [db.staff, db.activityLogs], async () => {
      await db.staff.delete(staffId);
      await db.activityLogs.add(log);
    });
  };

  const getGroupStaff = async (groupId: string): Promise<Staff[]> => {
    return db.staff.where('groupId').equals(groupId).toArray();
  };

  return {
    groups,
    loading,
    createGroup,
    updateGroup,
    getStaffRole,
    addStaff,
    removeStaff,
    getGroupStaff,
    reload: loadGroups,
  };
}
