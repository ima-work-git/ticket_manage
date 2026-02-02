import Dexie, { type Table } from 'dexie';
import type {
  User,
  Group,
  Staff,
  IdolMember,
  TicketTemplate,
  Ticket,
  ActivityLog,
  PendingTicket,
} from '../types';

export class TicketDatabase extends Dexie {
  users!: Table<User, string>;
  groups!: Table<Group, string>;
  staff!: Table<Staff, string>;
  idolMembers!: Table<IdolMember, string>;
  ticketTemplates!: Table<TicketTemplate, string>;
  tickets!: Table<Ticket, string>;
  activityLogs!: Table<ActivityLog, string>;
  pendingTickets!: Table<PendingTicket, string>;

  constructor() {
    super('TicketManageDB');

    this.version(1).stores({
      users: 'id, nickname, deviceKey',
      groups: 'id, name, ownerId',
      staff: 'id, groupId, userId, [groupId+userId]',
      idolMembers: 'id, groupId, status, [groupId+status]',
      ticketTemplates: 'id, groupId',
      tickets: 'id, templateId, groupId, ownerId, status, [groupId+ownerId], [groupId+status]',
      activityLogs: 'id, groupId, actorId, action, createdAt, [groupId+createdAt]',
    });

    // Version 2: Add pendingTickets table for tracking issued tickets
    this.version(2).stores({
      users: 'id, nickname, deviceKey',
      groups: 'id, name, ownerId',
      staff: 'id, groupId, userId, [groupId+userId]',
      idolMembers: 'id, groupId, status, [groupId+status]',
      ticketTemplates: 'id, groupId',
      tickets: 'id, templateId, groupId, ownerId, status, [groupId+ownerId], [groupId+status]',
      activityLogs: 'id, groupId, actorId, action, createdAt, [groupId+createdAt]',
      pendingTickets: 'id, groupId, templateId, issuedBy, status, [groupId+status], [groupId+issuedBy]',
    });
  }
}

export const db = new TicketDatabase();

export async function getCurrentUser(): Promise<User | undefined> {
  const deviceKey = localStorage.getItem('deviceKey');
  if (!deviceKey) return undefined;
  return db.users.where('deviceKey').equals(deviceKey).first();
}

export async function createUser(nickname: string): Promise<User> {
  const { v4: uuidv4 } = await import('uuid');
  const deviceKey = uuidv4();
  const user: User = {
    id: uuidv4(),
    nickname,
    deviceKey,
    createdAt: new Date(),
  };
  await db.users.add(user);
  localStorage.setItem('deviceKey', deviceKey);
  return user;
}
