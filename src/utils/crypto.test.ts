import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateQRPayload,
  parseQRPayload,
  isIssueQRData,
  isConsumeQRData,
  isStaffInviteQRData,
  isReceiveConfirmQRData,
  type IssueQRData,
  type ConsumeQRData,
  type StaffInviteQRData,
  type ReceiveConfirmQRData,
} from './crypto';

describe('crypto utilities', () => {
  describe('generateQRPayload', () => {
    it('should generate valid issue QR payload', () => {
      const data: IssueQRData = {
        ticketId: 'ticket-123',
        templateId: 'template-456',
        groupId: 'group-789',
        templateName: 'テストチケット',
        issuerId: 'issuer-abc',
      };

      const payload = generateQRPayload('issue', data);
      const parsed = JSON.parse(payload);

      expect(parsed.type).toBe('issue');
      expect(parsed.data).toEqual(data);
      expect(parsed.timestamp).toBeTypeOf('number');
    });

    it('should generate valid consume QR payload', () => {
      const data: ConsumeQRData = {
        ticketId: 'ticket-123',
        templateId: 'template-456',
        templateName: 'テストチケット',
        groupId: 'group-789',
        ownerId: 'owner-abc',
        ownerNickname: 'テストユーザー',
      };

      const payload = generateQRPayload('consume', data);
      const parsed = JSON.parse(payload);

      expect(parsed.type).toBe('consume');
      expect(parsed.data).toEqual(data);
    });

    it('should generate valid staff_invite QR payload', () => {
      const data: StaffInviteQRData = {
        groupId: 'group-789',
        groupName: 'テストグループ',
        inviterId: 'inviter-abc',
      };

      const payload = generateQRPayload('staff_invite', data);
      const parsed = JSON.parse(payload);

      expect(parsed.type).toBe('staff_invite');
      expect(parsed.data).toEqual(data);
    });

    it('should generate valid receive_confirm QR payload', () => {
      const data: ReceiveConfirmQRData = {
        ticketId: 'ticket-123',
        templateId: 'template-456',
        templateName: 'テストチケット',
        groupId: 'group-789',
        ownerId: 'owner-abc',
        ownerNickname: 'テストユーザー',
        ownerEmail: 'test@example.com',
      };

      const payload = generateQRPayload('receive_confirm', data);
      const parsed = JSON.parse(payload);

      expect(parsed.type).toBe('receive_confirm');
      expect(parsed.data.ownerEmail).toBe('test@example.com');
    });
  });

  describe('parseQRPayload', () => {
    it('should parse valid QR payload', () => {
      const data: IssueQRData = {
        ticketId: 'ticket-123',
        templateId: 'template-456',
        groupId: 'group-789',
        templateName: 'テストチケット',
        issuerId: 'issuer-abc',
      };

      const payload = generateQRPayload('issue', data);
      const result = parseQRPayload(payload);

      expect(result.valid).toBe(true);
      expect(result.type).toBe('issue');
      expect(result.data).toEqual(data);
    });

    it('should reject invalid JSON', () => {
      const result = parseQRPayload('not json');
      expect(result.valid).toBe(false);
    });

    it('should reject payload without type', () => {
      const result = parseQRPayload(JSON.stringify({ data: {}, timestamp: Date.now() }));
      expect(result.valid).toBe(false);
    });

    it('should reject expired issue QR (10 minutes)', () => {
      const data: IssueQRData = {
        ticketId: 'ticket-123',
        templateId: 'template-456',
        groupId: 'group-789',
        templateName: 'テストチケット',
        issuerId: 'issuer-abc',
      };

      // 11 minutes ago
      const payload = JSON.stringify({
        type: 'issue',
        data,
        timestamp: Date.now() - 11 * 60 * 1000,
      });

      const result = parseQRPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });

    it('should accept valid issue QR within 10 minutes', () => {
      const data: IssueQRData = {
        ticketId: 'ticket-123',
        templateId: 'template-456',
        groupId: 'group-789',
        templateName: 'テストチケット',
        issuerId: 'issuer-abc',
      };

      // 5 minutes ago
      const payload = JSON.stringify({
        type: 'issue',
        data,
        timestamp: Date.now() - 5 * 60 * 1000,
      });

      const result = parseQRPayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should accept staff_invite QR for 24 hours', () => {
      const data: StaffInviteQRData = {
        groupId: 'group-789',
        groupName: 'テストグループ',
        inviterId: 'inviter-abc',
      };

      // 23 hours ago
      const payload = JSON.stringify({
        type: 'staff_invite',
        data,
        timestamp: Date.now() - 23 * 60 * 60 * 1000,
      });

      const result = parseQRPayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should reject expired staff_invite QR (over 24 hours)', () => {
      const data: StaffInviteQRData = {
        groupId: 'group-789',
        groupName: 'テストグループ',
        inviterId: 'inviter-abc',
      };

      // 25 hours ago
      const payload = JSON.stringify({
        type: 'staff_invite',
        data,
        timestamp: Date.now() - 25 * 60 * 60 * 1000,
      });

      const result = parseQRPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });
  });

  describe('type guards', () => {
    it('isIssueQRData should validate correctly', () => {
      expect(isIssueQRData({
        ticketId: 'a',
        templateId: 'b',
        groupId: 'c',
        issuerId: 'd',
      })).toBe(true);

      expect(isIssueQRData({
        ticketId: 'a',
        templateId: 'b',
        groupId: 'c',
        // missing issuerId
      })).toBe(false);

      expect(isIssueQRData(null)).toBe(false);
      expect(isIssueQRData(undefined)).toBe(false);
    });

    it('isConsumeQRData should validate correctly', () => {
      expect(isConsumeQRData({
        ticketId: 'a',
        templateId: 'b',
        groupId: 'c',
        ownerId: 'd',
      })).toBe(true);

      expect(isConsumeQRData({
        ticketId: 'a',
        // missing other fields
      })).toBe(false);
    });

    it('isStaffInviteQRData should validate correctly', () => {
      expect(isStaffInviteQRData({
        groupId: 'a',
        inviterId: 'b',
      })).toBe(true);

      expect(isStaffInviteQRData({
        groupId: 'a',
        // missing inviterId
      })).toBe(false);
    });

    it('isReceiveConfirmQRData should validate correctly', () => {
      expect(isReceiveConfirmQRData({
        ticketId: 'a',
        templateId: 'b',
        groupId: 'c',
        ownerId: 'd',
        ownerNickname: 'e',
      })).toBe(true);

      // ownerEmail is optional
      expect(isReceiveConfirmQRData({
        ticketId: 'a',
        templateId: 'b',
        groupId: 'c',
        ownerId: 'd',
        ownerNickname: 'e',
        ownerEmail: 'test@example.com',
      })).toBe(true);

      expect(isReceiveConfirmQRData({
        ticketId: 'a',
        templateId: 'b',
        groupId: 'c',
        ownerId: 'd',
        // missing ownerNickname
      })).toBe(false);
    });
  });
});
