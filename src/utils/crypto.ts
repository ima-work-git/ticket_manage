// QR payload types
export interface IssueQRData {
  ticketId: string;
  templateId: string;
  groupId: string;
  templateName: string;
  templateImage?: string;
  expiresInDays?: number;
  issuerId: string;
}

export interface ConsumeQRData {
  ticketId: string;
  templateId: string;
  templateName: string;
  templateImage?: string;
  groupId: string;
  ownerId: string;
  ownerNickname: string;
}

export interface StaffInviteQRData {
  groupId: string;
  groupName: string;
  inviterId: string;
}

// Fan shows this to operator after receiving ticket
export interface ReceiveConfirmQRData {
  ticketId: string;
  templateId: string;
  templateName: string;
  groupId: string;
  ownerId: string;
  ownerNickname: string;
  ownerEmail?: string; // Google account email for reliable restoration
}

export type QRPayload =
  | { type: 'issue'; data: IssueQRData; timestamp: number }
  | { type: 'consume'; data: ConsumeQRData; timestamp: number }
  | { type: 'staff_invite'; data: StaffInviteQRData; timestamp: number }
  | { type: 'receive_confirm'; data: ReceiveConfirmQRData; timestamp: number };

// QR expiration times (in milliseconds)
const QR_EXPIRATION: Record<string, number> = {
  issue: 10 * 60 * 1000, // 10 minutes for ticket issuance
  consume: 5 * 60 * 1000, // 5 minutes for consumption
  staff_invite: 24 * 60 * 60 * 1000, // 24 hours for staff invite
  receive_confirm: 10 * 60 * 1000, // 10 minutes for receive confirmation
};

export function generateQRPayload(
  type: 'issue',
  data: IssueQRData
): string;
export function generateQRPayload(
  type: 'consume',
  data: ConsumeQRData
): string;
export function generateQRPayload(
  type: 'staff_invite',
  data: StaffInviteQRData
): string;
export function generateQRPayload(
  type: 'receive_confirm',
  data: ReceiveConfirmQRData
): string;
export function generateQRPayload(
  type: 'issue' | 'consume' | 'staff_invite' | 'receive_confirm',
  data: IssueQRData | ConsumeQRData | StaffInviteQRData | ReceiveConfirmQRData
): string {
  const payload = {
    type,
    data,
    timestamp: Date.now(),
  };
  return JSON.stringify(payload);
}

export interface ParsedQR<T> {
  valid: boolean;
  expired?: boolean;
  type?: string;
  data?: T;
}

export function parseQRPayload(raw: string): ParsedQR<IssueQRData | ConsumeQRData | StaffInviteQRData | ReceiveConfirmQRData> {
  try {
    const payload = JSON.parse(raw) as QRPayload;
    const { type, data, timestamp } = payload;

    // Check if required fields exist
    if (!type || !data || !timestamp) {
      return { valid: false };
    }

    // Check if QR is expired
    const now = Date.now();
    const expiration = QR_EXPIRATION[type] || QR_EXPIRATION.issue;
    if (now - timestamp > expiration) {
      return { valid: false, expired: true };
    }

    return { valid: true, type, data };
  } catch {
    return { valid: false };
  }
}

// Type guards for QR data
export function isIssueQRData(data: unknown): data is IssueQRData {
  const d = data as IssueQRData;
  return !!(d?.ticketId && d?.templateId && d?.groupId && d?.issuerId);
}

export function isConsumeQRData(data: unknown): data is ConsumeQRData {
  const d = data as ConsumeQRData;
  return !!(d?.ticketId && d?.templateId && d?.groupId && d?.ownerId);
}

export function isStaffInviteQRData(data: unknown): data is StaffInviteQRData {
  const d = data as StaffInviteQRData;
  return !!(d?.groupId && d?.inviterId);
}

export function isReceiveConfirmQRData(data: unknown): data is ReceiveConfirmQRData {
  const d = data as ReceiveConfirmQRData;
  return !!(d?.ticketId && d?.templateId && d?.groupId && d?.ownerId && d?.ownerNickname);
}
