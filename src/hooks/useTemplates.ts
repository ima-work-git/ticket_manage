import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type { TicketTemplate, ActivityLog, OnGraduationAction } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { syncTicketTemplate, syncActivityLog } from '../services/sync';

export function useTemplates(groupId: string) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    const allTemplates = await db.ticketTemplates
      .where('groupId')
      .equals(groupId)
      .toArray();
    setTemplates(allTemplates.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const createTemplate = async (data: {
    name: string;
    description?: string;
    image?: string;
    targetMemberId?: string;
    expiresInDays?: number;
    onGraduation: OnGraduationAction;
  }): Promise<TicketTemplate> => {
    if (!user) throw new Error('User not logged in');

    const template: TicketTemplate = {
      id: uuidv4(),
      groupId,
      ...data,
      createdAt: new Date(),
    };

    const log: ActivityLog = {
      id: uuidv4(),
      groupId,
      actorId: user.id,
      action: 'template_create',
      metadata: { templateName: data.name },
      createdAt: new Date(),
    };

    await syncTicketTemplate(template, 'insert');
    await syncActivityLog(log);

    await loadTemplates();
    return template;
  };

  const updateTemplate = async (
    templateId: string,
    updates: Partial<
      Pick<
        TicketTemplate,
        | 'name'
        | 'description'
        | 'image'
        | 'targetMemberId'
        | 'expiresInDays'
        | 'onGraduation'
      >
    >
  ) => {
    if (!user) throw new Error('User not logged in');

    const existing = await db.ticketTemplates.get(templateId);
    if (!existing) return;

    const updated: TicketTemplate = { ...existing, ...updates };
    await syncTicketTemplate(updated, 'update');

    const log: ActivityLog = {
      id: uuidv4(),
      groupId,
      actorId: user.id,
      action: 'template_update',
      metadata: { templateId },
      createdAt: new Date(),
    };
    await syncActivityLog(log);

    await loadTemplates();
  };

  const deleteTemplate = async (templateId: string) => {
    if (!user) throw new Error('User not logged in');

    const template = await db.ticketTemplates.get(templateId);
    if (!template) return;

    const log: ActivityLog = {
      id: uuidv4(),
      groupId,
      actorId: user.id,
      action: 'template_delete',
      metadata: { templateName: template.name },
      createdAt: new Date(),
    };

    await syncTicketTemplate(template, 'delete');
    await syncActivityLog(log);

    await loadTemplates();
  };

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    reload: loadTemplates,
  };
}
