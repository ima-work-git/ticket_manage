import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { ActivityLog, User } from '../types';
import { useAuth } from '../contexts/AuthContext';

export interface LogWithActor extends ActivityLog {
  actor?: User;
  targetUser?: User;
}

export function useLogs(groupId: string, onlyMine = false) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogWithActor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    let rawLogs: ActivityLog[];

    if (onlyMine && user) {
      rawLogs = await db.activityLogs
        .where('groupId')
        .equals(groupId)
        .filter((log) => log.actorId === user.id)
        .toArray();
    } else {
      rawLogs = await db.activityLogs
        .where('groupId')
        .equals(groupId)
        .toArray();
    }

    // Get unique user IDs
    const userIds = [
      ...new Set([
        ...rawLogs.map((l) => l.actorId),
        ...rawLogs.filter((l) => l.targetUserId).map((l) => l.targetUserId!),
      ]),
    ];

    const users = await db.users.where('id').anyOf(userIds).toArray();
    const userMap = new Map(users.map((u) => [u.id, u]));

    const logsWithUsers: LogWithActor[] = rawLogs.map((l) => ({
      ...l,
      actor: userMap.get(l.actorId),
      targetUser: l.targetUserId ? userMap.get(l.targetUserId) : undefined,
    }));

    setLogs(
      logsWithUsers.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
    setLoading(false);
  }, [groupId, onlyMine, user]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return { logs, loading, reload: loadLogs };
}
