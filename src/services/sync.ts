import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db } from '../db';
import type { Group, Staff, IdolMember, TicketTemplate, Ticket, ActivityLog } from '../types';

// Sync queue for offline operations
interface SyncOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
}

const SYNC_QUEUE_KEY = 'sync_queue';

function getSyncQueue(): SyncOperation[] {
  const data = localStorage.getItem(SYNC_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
}

function addToSyncQueue(op: Omit<SyncOperation, 'id' | 'timestamp'>): void {
  const queue = getSyncQueue();
  queue.push({
    ...op,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

// Online status
let isOnline = navigator.onLine;

window.addEventListener('online', () => {
  isOnline = true;
  processSyncQueue();
});

window.addEventListener('offline', () => {
  isOnline = false;
});

export function getOnlineStatus(): boolean {
  return isOnline && isSupabaseConfigured();
}

// Convert Supabase format to local format
function toCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    // Convert date strings to Date objects for known date fields
    if (typeof value === 'string' && (key.endsWith('_at') || key === 'created_at' || key === 'updated_at')) {
      result[camelKey] = new Date(value);
    } else if (key === 'image_url') {
      result['image'] = value;
    } else {
      result[camelKey] = value;
    }
  }
  return result as T;
}

// Process pending sync operations
async function processSyncQueue(): Promise<void> {
  if (!isOnline || !supabase) return;

  const queue = getSyncQueue();
  if (queue.length === 0) return;

  const failedOps: SyncOperation[] = [];

  for (const op of queue) {
    try {
      const tableMap: Record<string, string> = {
        groups: 'groups',
        staff: 'staff',
        idolMembers: 'idol_members',
        ticketTemplates: 'ticket_templates',
        tickets: 'tickets',
        activityLogs: 'activity_logs',
      };

      const supabaseTable = tableMap[op.table];
      if (!supabaseTable) continue;

      if (op.operation === 'insert') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from(supabaseTable) as any).upsert(op.data);
      } else if (op.operation === 'update') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from(supabaseTable) as any).update(op.data).eq('id', op.data.id);
      } else if (op.operation === 'delete') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from(supabaseTable) as any).delete().eq('id', op.data.id);
      }
    } catch (error) {
      console.error('Sync operation failed:', error);
      failedOps.push(op);
    }
  }

  // Keep failed operations for retry
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(failedOps));
}

// Sync functions for each table
export async function syncGroup(group: Group, operation: 'insert' | 'update' | 'delete'): Promise<void> {
  // Always save locally first
  if (operation === 'insert' || operation === 'update') {
    await db.groups.put(group);
  } else {
    await db.groups.delete(group.id);
  }

  // Queue for cloud sync
  if (isSupabaseConfigured()) {
    if (isOnline && supabase) {
      try {
        const data = {
          id: group.id,
          name: group.name,
          image_url: group.image,
          owner_id: group.ownerId,
          created_at: group.createdAt.toISOString(),
        };

        if (operation === 'insert') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('groups') as any).insert(data);
        } else if (operation === 'update') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('groups') as any).update(data).eq('id', group.id);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('groups') as any).delete().eq('id', group.id);
        }
      } catch (error) {
        console.error('Cloud sync failed, queuing:', error);
        addToSyncQueue({ table: 'groups', operation, data: group as unknown as Record<string, unknown> });
      }
    } else {
      addToSyncQueue({ table: 'groups', operation, data: group as unknown as Record<string, unknown> });
    }
  }
}

export async function syncStaff(staff: Staff, operation: 'insert' | 'update' | 'delete'): Promise<void> {
  if (operation === 'insert' || operation === 'update') {
    await db.staff.put(staff);
  } else {
    await db.staff.delete(staff.id);
  }

  if (isSupabaseConfigured()) {
    if (isOnline && supabase) {
      try {
        const data = {
          id: staff.id,
          group_id: staff.groupId,
          user_id: staff.userId,
          role: staff.role,
          invited_by: staff.invitedBy,
          created_at: staff.createdAt.toISOString(),
        };

        if (operation === 'insert') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('staff') as any).insert(data);
        } else if (operation === 'update') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('staff') as any).update(data).eq('id', staff.id);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('staff') as any).delete().eq('id', staff.id);
        }
      } catch (error) {
        console.error('Cloud sync failed, queuing:', error);
        addToSyncQueue({ table: 'staff', operation, data: staff as unknown as Record<string, unknown> });
      }
    } else {
      addToSyncQueue({ table: 'staff', operation, data: staff as unknown as Record<string, unknown> });
    }
  }
}

export async function syncIdolMember(member: IdolMember, operation: 'insert' | 'update' | 'delete'): Promise<void> {
  if (operation === 'insert' || operation === 'update') {
    await db.idolMembers.put(member);
  } else {
    await db.idolMembers.delete(member.id);
  }

  if (isSupabaseConfigured()) {
    if (isOnline && supabase) {
      try {
        const data = {
          id: member.id,
          group_id: member.groupId,
          name: member.name,
          image_url: member.image,
          status: member.status,
          graduated_at: member.graduatedAt?.toISOString(),
          created_at: member.createdAt.toISOString(),
        };

        if (operation === 'insert') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('idol_members') as any).insert(data);
        } else if (operation === 'update') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('idol_members') as any).update(data).eq('id', member.id);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('idol_members') as any).delete().eq('id', member.id);
        }
      } catch (error) {
        console.error('Cloud sync failed, queuing:', error);
        addToSyncQueue({ table: 'idolMembers', operation, data: member as unknown as Record<string, unknown> });
      }
    } else {
      addToSyncQueue({ table: 'idolMembers', operation, data: member as unknown as Record<string, unknown> });
    }
  }
}

export async function syncTicketTemplate(template: TicketTemplate, operation: 'insert' | 'update' | 'delete'): Promise<void> {
  if (operation === 'insert' || operation === 'update') {
    await db.ticketTemplates.put(template);
  } else {
    await db.ticketTemplates.delete(template.id);
  }

  if (isSupabaseConfigured()) {
    if (isOnline && supabase) {
      try {
        const data = {
          id: template.id,
          group_id: template.groupId,
          name: template.name,
          description: template.description,
          image_url: template.image,
          target_member_id: template.targetMemberId,
          expires_in_days: template.expiresInDays,
          on_graduation: template.onGraduation,
          created_at: template.createdAt.toISOString(),
        };

        if (operation === 'insert') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('ticket_templates') as any).insert(data);
        } else if (operation === 'update') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('ticket_templates') as any).update(data).eq('id', template.id);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('ticket_templates') as any).delete().eq('id', template.id);
        }
      } catch (error) {
        console.error('Cloud sync failed, queuing:', error);
        addToSyncQueue({ table: 'ticketTemplates', operation, data: template as unknown as Record<string, unknown> });
      }
    } else {
      addToSyncQueue({ table: 'ticketTemplates', operation, data: template as unknown as Record<string, unknown> });
    }
  }
}

export async function syncTicket(ticket: Ticket, operation: 'insert' | 'update' | 'delete'): Promise<void> {
  if (operation === 'insert' || operation === 'update') {
    await db.tickets.put(ticket);
  } else {
    await db.tickets.delete(ticket.id);
  }

  if (isSupabaseConfigured()) {
    if (isOnline && supabase) {
      try {
        const data = {
          id: ticket.id,
          template_id: ticket.templateId,
          group_id: ticket.groupId,
          owner_id: ticket.ownerId,
          issued_by: ticket.issuedBy,
          issued_at: ticket.issuedAt.toISOString(),
          status: ticket.status,
          expires_at: ticket.expiresAt?.toISOString(),
          consumed_by: ticket.consumedBy,
          consumed_at: ticket.consumedAt?.toISOString(),
          event_name: ticket.eventName,
        };

        if (operation === 'insert') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('tickets') as any).insert(data);
        } else if (operation === 'update') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('tickets') as any).update(data).eq('id', ticket.id);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('tickets') as any).delete().eq('id', ticket.id);
        }
      } catch (error) {
        console.error('Cloud sync failed, queuing:', error);
        addToSyncQueue({ table: 'tickets', operation, data: ticket as unknown as Record<string, unknown> });
      }
    } else {
      addToSyncQueue({ table: 'tickets', operation, data: ticket as unknown as Record<string, unknown> });
    }
  }
}

export async function syncActivityLog(log: ActivityLog): Promise<void> {
  await db.activityLogs.put(log);

  if (isSupabaseConfigured()) {
    if (isOnline && supabase) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('activity_logs') as any).insert({
          id: log.id,
          group_id: log.groupId,
          actor_id: log.actorId,
          action: log.action,
          ticket_id: log.ticketId,
          target_user_id: log.targetUserId,
          metadata: log.metadata,
          created_at: log.createdAt.toISOString(),
        });
      } catch (error) {
        console.error('Cloud sync failed, queuing:', error);
        addToSyncQueue({ table: 'activityLogs', operation: 'insert', data: log as unknown as Record<string, unknown> });
      }
    } else {
      addToSyncQueue({ table: 'activityLogs', operation: 'insert', data: log as unknown as Record<string, unknown> });
    }
  }
}

// Pull data from cloud to local
export async function pullFromCloud(userId: string): Promise<void> {
  if (!isOnline || !supabase) return;

  try {
    // Fetch groups where user is staff
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: staffRecords } = await (supabase.from('staff') as any)
      .select('group_id')
      .eq('user_id', userId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const staffGroupIds = staffRecords?.map((s: any) => s.group_id) || [];

    // Fetch groups
    if (staffGroupIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: groups } = await (supabase.from('groups') as any)
        .select('*')
        .in('id', staffGroupIds);

      if (groups) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const g of groups as any[]) {
          await db.groups.put(toCamelCase<Group>(g));
        }
      }

      // Fetch all staff for these groups
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allStaff } = await (supabase.from('staff') as any)
        .select('*')
        .in('group_id', staffGroupIds);

      if (allStaff) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const s of allStaff as any[]) {
          await db.staff.put(toCamelCase<Staff>(s));
        }
      }

      // Fetch idol members
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: members } = await (supabase.from('idol_members') as any)
        .select('*')
        .in('group_id', staffGroupIds);

      if (members) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const m of members as any[]) {
          await db.idolMembers.put(toCamelCase<IdolMember>(m));
        }
      }

      // Fetch templates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: templates } = await (supabase.from('ticket_templates') as any)
        .select('*')
        .in('group_id', staffGroupIds);

      if (templates) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const t of templates as any[]) {
          await db.ticketTemplates.put(toCamelCase<TicketTemplate>(t));
        }
      }
    }

    // Fetch user's own tickets
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tickets } = await (supabase.from('tickets') as any)
      .select('*')
      .eq('owner_id', userId);

    if (tickets) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const t of tickets as any[]) {
        await db.tickets.put(toCamelCase<Ticket>(t));
      }
    }

    // Also fetch tickets for groups user is staff of
    if (staffGroupIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: groupTickets } = await (supabase.from('tickets') as any)
        .select('*')
        .in('group_id', staffGroupIds);

      if (groupTickets) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const t of groupTickets as any[]) {
          await db.tickets.put(toCamelCase<Ticket>(t));
        }
      }
    }

    console.log('Cloud sync completed');
  } catch (error) {
    console.error('Pull from cloud failed:', error);
  }
}

// Claim a pending ticket (for QR code flow)
export async function claimPendingTicket(claimToken: string, userId: string): Promise<Ticket | null> {
  if (!isOnline || !supabase) {
    throw new Error('オンライン接続が必要です');
  }

  try {
    // Find the pending ticket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pending, error: fetchError } = await (supabase.from('pending_tickets') as any)
      .select('*')
      .eq('claim_token', claimToken)
      .is('claimed_by', null)
      .single();

    if (fetchError || !pending) {
      throw new Error('チケットが見つからないか、既に受け取り済みです');
    }

    // Check expiration
    if (pending.expires_at && new Date(pending.expires_at) < new Date()) {
      throw new Error('このチケットは有効期限切れです');
    }

    // Claim the pending ticket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: claimError } = await (supabase.from('pending_tickets') as any)
      .update({
        claimed_by: userId,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', pending.id)
      .is('claimed_by', null);

    if (claimError) {
      throw new Error('チケットの受け取りに失敗しました');
    }

    // Create the actual ticket
    const ticketId = crypto.randomUUID();
    const ticket: Ticket = {
      id: ticketId,
      templateId: pending.template_id,
      groupId: pending.group_id,
      ownerId: userId,
      issuedBy: pending.issued_by,
      issuedAt: new Date(pending.issued_at),
      status: 'active',
      expiresAt: pending.expires_at ? new Date(pending.expires_at) : undefined,
    };

    // Save to cloud
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tickets') as any).insert({
      id: ticket.id,
      template_id: ticket.templateId,
      group_id: ticket.groupId,
      owner_id: ticket.ownerId,
      issued_by: ticket.issuedBy,
      issued_at: ticket.issuedAt.toISOString(),
      status: ticket.status,
      expires_at: ticket.expiresAt?.toISOString(),
    });

    // Save locally
    await db.tickets.put(ticket);

    return ticket;
  } catch (error) {
    console.error('Claim ticket failed:', error);
    throw error;
  }
}

// Create a pending ticket for QR distribution
export async function createPendingTicket(
  templateId: string,
  groupId: string,
  issuedBy: string,
  expiresAt?: Date
): Promise<string> {
  const claimToken = crypto.randomUUID();

  if (isOnline && supabase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('pending_tickets') as any).insert({
      claim_token: claimToken,
      template_id: templateId,
      group_id: groupId,
      issued_by: issuedBy,
      expires_at: expiresAt?.toISOString(),
    });
  }

  return claimToken;
}

// Initialize sync on app start
export async function initializeSync(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  // Process any pending operations
  await processSyncQueue();

  // Pull latest data from cloud
  await pullFromCloud(userId);
}
