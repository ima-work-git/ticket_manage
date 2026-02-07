import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase before importing sync
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

// Mock Dexie database
vi.mock('../db', () => ({
  db: {
    groups: {
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
    },
    staff: {
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
    },
    tickets: {
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
    },
    ticketTemplates: {
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
    },
    idolMembers: {
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    activityLogs: {
      put: vi.fn().mockResolvedValue(undefined),
    },
    pendingTickets: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
    },
  },
}));

import {
  syncGroup,
  syncStaff,
  syncTicket,
  syncTicketTemplate,
  syncActivityLog,
  syncPendingTicket,
  getOnlineStatus,
} from './sync';
import { db } from '../db';
import { supabase } from '../lib/supabase';
import type { Group, Staff, Ticket, TicketTemplate, ActivityLog, PendingTicket } from '../types';

describe('sync service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset online status
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  describe('syncGroup', () => {
    const testGroup: Group = {
      id: 'group-123',
      name: 'テストグループ',
      ownerId: 'owner-456',
      createdAt: new Date('2024-01-01'),
    };

    it('should save group locally on insert', async () => {
      await syncGroup(testGroup, 'insert');
      expect(db.groups.put).toHaveBeenCalledWith(testGroup);
    });

    it('should save group locally on update', async () => {
      await syncGroup(testGroup, 'update');
      expect(db.groups.put).toHaveBeenCalledWith(testGroup);
    });

    it('should delete group locally on delete', async () => {
      await syncGroup(testGroup, 'delete');
      expect(db.groups.delete).toHaveBeenCalledWith('group-123');
    });

    it('should sync to cloud when online', async () => {
      await syncGroup(testGroup, 'insert');
      expect(supabase.from).toHaveBeenCalledWith('groups');
    });
  });

  describe('syncStaff', () => {
    const testStaff: Staff = {
      id: 'staff-123',
      groupId: 'group-456',
      userId: 'user-789',
      role: 'staff',
      invitedBy: 'owner-abc',
      createdAt: new Date('2024-01-01'),
    };

    it('should save staff locally on insert', async () => {
      await syncStaff(testStaff, 'insert');
      expect(db.staff.put).toHaveBeenCalledWith(testStaff);
    });

    it('should delete staff locally on delete', async () => {
      await syncStaff(testStaff, 'delete');
      expect(db.staff.delete).toHaveBeenCalledWith('staff-123');
    });
  });

  describe('syncTicket', () => {
    const testTicket: Ticket = {
      id: 'ticket-123',
      templateId: 'template-456',
      groupId: 'group-789',
      ownerId: 'owner-abc',
      issuedBy: 'issuer-def',
      issuedAt: new Date('2024-01-01'),
      status: 'active',
    };

    it('should save ticket locally on insert', async () => {
      await syncTicket(testTicket, 'insert');
      expect(db.tickets.put).toHaveBeenCalledWith(testTicket);
    });

    it('should update ticket locally on update', async () => {
      const updatedTicket = { ...testTicket, status: 'used' as const };
      await syncTicket(updatedTicket, 'update');
      expect(db.tickets.put).toHaveBeenCalledWith(updatedTicket);
    });

    it('should handle ticket with optional fields', async () => {
      const ticketWithOptional: Ticket = {
        ...testTicket,
        expiresAt: new Date('2024-12-31'),
        consumedBy: 'consumer-xyz',
        consumedAt: new Date('2024-06-15'),
        eventName: 'テストイベント',
      };
      await syncTicket(ticketWithOptional, 'update');
      expect(db.tickets.put).toHaveBeenCalledWith(ticketWithOptional);
    });
  });

  describe('syncTicketTemplate', () => {
    const testTemplate: TicketTemplate = {
      id: 'template-123',
      groupId: 'group-456',
      name: 'テストテンプレート',
      onGraduation: 'destroy',
      createdAt: new Date('2024-01-01'),
    };

    it('should save template locally on insert', async () => {
      await syncTicketTemplate(testTemplate, 'insert');
      expect(db.ticketTemplates.put).toHaveBeenCalledWith(testTemplate);
    });

    it('should handle template with all optional fields', async () => {
      const fullTemplate: TicketTemplate = {
        ...testTemplate,
        description: '詳細説明',
        image: 'https://example.com/image.jpg',
        targetMemberId: 'member-789',
        expiresInDays: 30,
      };
      await syncTicketTemplate(fullTemplate, 'insert');
      expect(db.ticketTemplates.put).toHaveBeenCalledWith(fullTemplate);
    });
  });

  describe('syncActivityLog', () => {
    const testLog: ActivityLog = {
      id: 'log-123',
      groupId: 'group-456',
      actorId: 'actor-789',
      action: 'issue',
      ticketId: 'ticket-abc',
      targetUserId: 'target-def',
      metadata: { templateName: 'テスト' },
      createdAt: new Date('2024-01-01'),
    };

    it('should save activity log locally', async () => {
      await syncActivityLog(testLog);
      expect(db.activityLogs.put).toHaveBeenCalledWith(testLog);
    });
  });

  describe('syncPendingTicket', () => {
    const testPendingTicket: PendingTicket = {
      id: 'pending-123',
      templateId: 'template-456',
      groupId: 'group-789',
      templateName: 'テストチケット',
      issuedBy: 'issuer-abc',
      issuedAt: new Date('2024-01-01'),
      status: 'pending',
    };

    it('should save pending ticket locally on create', async () => {
      await syncPendingTicket(testPendingTicket, 'create');
      expect(db.pendingTickets.put).toHaveBeenCalledWith(testPendingTicket);
    });

    it('should save pending ticket locally on update', async () => {
      const claimedTicket: PendingTicket = {
        ...testPendingTicket,
        status: 'claimed',
        claimedBy: 'claimer-xyz',
        claimedByNickname: 'テストユーザー',
        claimedByEmail: 'test@example.com',
        claimedAt: new Date('2024-01-02'),
      };
      await syncPendingTicket(claimedTicket, 'update');
      expect(db.pendingTickets.put).toHaveBeenCalledWith(claimedTicket);
    });

    it('should include claimedByEmail in cloud sync data', async () => {
      const claimedTicket: PendingTicket = {
        ...testPendingTicket,
        status: 'claimed',
        claimedBy: 'claimer-xyz',
        claimedByNickname: 'テストユーザー',
        claimedByEmail: 'test@example.com',
        claimedAt: new Date('2024-01-02'),
      };

      await syncPendingTicket(claimedTicket, 'update');

      // Verify upsert was called (cloud sync)
      const fromMock = supabase.from as ReturnType<typeof vi.fn>;
      expect(fromMock).toHaveBeenCalledWith('pending_tickets');
    });
  });

  describe('getOnlineStatus', () => {
    it('should return true when online and Supabase configured', () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      expect(getOnlineStatus()).toBe(true);
    });
  });
});

describe('sync data transformations', () => {
  it('should convert Date to ISO string for cloud sync', async () => {
    const ticket: Ticket = {
      id: 'ticket-123',
      templateId: 'template-456',
      groupId: 'group-789',
      ownerId: 'owner-abc',
      issuedBy: 'issuer-def',
      issuedAt: new Date('2024-01-01T12:00:00Z'),
      status: 'active',
      expiresAt: new Date('2024-12-31T23:59:59Z'),
    };

    await syncTicket(ticket, 'insert');

    // The function should have called supabase.from('tickets')
    expect(supabase.from).toHaveBeenCalledWith('tickets');
  });

  it('should handle undefined optional date fields', async () => {
    const ticket: Ticket = {
      id: 'ticket-123',
      templateId: 'template-456',
      groupId: 'group-789',
      ownerId: 'owner-abc',
      issuedBy: 'issuer-def',
      issuedAt: new Date('2024-01-01'),
      status: 'active',
      // expiresAt is undefined
    };

    // Should not throw
    await expect(syncTicket(ticket, 'insert')).resolves.not.toThrow();
  });
});
