import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';
import { db } from '../db';
import type { Ticket, ActivityLog, TicketTemplate, Group } from '../types';
import { useAuth } from '../contexts/AuthContext';

export interface TicketWithDetails extends Ticket {
  template?: TicketTemplate;
  group?: Group;
}

export function useTickets(groupId?: string) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    if (!user) {
      setTickets([]);
      setLoading(false);
      return;
    }

    let rawTickets: Ticket[];
    if (groupId) {
      rawTickets = await db.tickets
        .where('[groupId+ownerId]')
        .equals([groupId, user.id])
        .toArray();
    } else {
      rawTickets = await db.tickets.where('ownerId').equals(user.id).toArray();
    }

    // Check and update expired tickets
    const now = new Date();
    for (const ticket of rawTickets) {
      if (
        ticket.status === 'active' &&
        ticket.expiresAt &&
        new Date(ticket.expiresAt) < now
      ) {
        await db.tickets.update(ticket.id, { status: 'expired' });
        ticket.status = 'expired';
      }
    }

    // Load related data
    const templateIds = [...new Set(rawTickets.map((t) => t.templateId))];
    const templates = await db.ticketTemplates
      .where('id')
      .anyOf(templateIds)
      .toArray();
    const templateMap = new Map(templates.map((t) => [t.id, t]));

    const groupIds = [...new Set(rawTickets.map((t) => t.groupId))];
    const groups = await db.groups.where('id').anyOf(groupIds).toArray();
    const groupMap = new Map(groups.map((g) => [g.id, g]));

    const ticketsWithDetails: TicketWithDetails[] = rawTickets.map((t) => ({
      ...t,
      template: templateMap.get(t.templateId),
      group: groupMap.get(t.groupId),
    }));

    setTickets(
      ticketsWithDetails.sort(
        (a, b) =>
          new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      )
    );
    setLoading(false);
  }, [user, groupId]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const issueTicket = async (
    templateId: string,
    targetUserId: string
  ): Promise<Ticket> => {
    if (!user) throw new Error('User not logged in');

    const template = await db.ticketTemplates.get(templateId);
    if (!template) throw new Error('Template not found');

    const expiresAt = template.expiresInDays
      ? addDays(new Date(), template.expiresInDays)
      : undefined;

    const ticket: Ticket = {
      id: uuidv4(),
      templateId,
      groupId: template.groupId,
      ownerId: targetUserId,
      issuedBy: user.id,
      issuedAt: new Date(),
      status: 'active',
      expiresAt,
    };

    const log: ActivityLog = {
      id: uuidv4(),
      groupId: template.groupId,
      actorId: user.id,
      action: 'issue',
      ticketId: ticket.id,
      targetUserId,
      metadata: { templateName: template.name },
      createdAt: new Date(),
    };

    await db.transaction('rw', [db.tickets, db.activityLogs], async () => {
      await db.tickets.add(ticket);
      await db.activityLogs.add(log);
    });

    await loadTickets();
    return ticket;
  };

  const consumeTicket = async (
    ticketId: string,
    eventName?: string
  ): Promise<void> => {
    if (!user) throw new Error('User not logged in');

    const ticket = await db.tickets.get(ticketId);
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status !== 'active') throw new Error('Ticket is not active');

    const template = await db.ticketTemplates.get(ticket.templateId);

    await db.tickets.update(ticketId, {
      status: 'used',
      consumedBy: user.id,
      consumedAt: new Date(),
      eventName,
    });

    const log: ActivityLog = {
      id: uuidv4(),
      groupId: ticket.groupId,
      actorId: user.id,
      action: 'consume',
      ticketId,
      targetUserId: ticket.ownerId,
      metadata: { templateName: template?.name, eventName },
      createdAt: new Date(),
    };
    await db.activityLogs.add(log);

    await loadTickets();
  };

  const activeTickets = tickets.filter((t) => t.status === 'active');
  const usedTickets = tickets.filter((t) => t.status === 'used');

  return {
    tickets,
    activeTickets,
    usedTickets,
    loading,
    issueTicket,
    consumeTicket,
    reload: loadTickets,
  };
}

export function useAllGroupTickets(groupId: string) {
  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    const rawTickets = await db.tickets
      .where('groupId')
      .equals(groupId)
      .toArray();

    const templateIds = [...new Set(rawTickets.map((t) => t.templateId))];
    const templates = await db.ticketTemplates
      .where('id')
      .anyOf(templateIds)
      .toArray();
    const templateMap = new Map(templates.map((t) => [t.id, t]));

    const ticketsWithDetails: TicketWithDetails[] = rawTickets.map((t) => ({
      ...t,
      template: templateMap.get(t.templateId),
    }));

    setTickets(
      ticketsWithDetails.sort(
        (a, b) =>
          new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      )
    );
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  return { tickets, loading, reload: loadTickets };
}
