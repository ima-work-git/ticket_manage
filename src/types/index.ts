export interface User {
  id: string;
  nickname: string;
  createdAt: Date;
  deviceKey: string;
}

export interface Group {
  id: string;
  name: string;
  image?: string;
  ownerId: string;
  createdAt: Date;
}

export interface Staff {
  id: string;
  groupId: string;
  userId: string;
  role: 'owner' | 'staff';
  invitedBy?: string;
  createdAt: Date;
}

export interface IdolMember {
  id: string;
  groupId: string;
  name: string;
  image?: string;
  status: 'active' | 'graduated';
  graduatedAt?: Date;
  createdAt: Date;
}

export type OnGraduationAction = 'destroy' | 'convert' | 'refund';

export interface TicketTemplate {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  image?: string;
  targetMemberId?: string;
  expiresInDays?: number;
  onGraduation: OnGraduationAction;
  createdAt: Date;
}

export type TicketStatus = 'active' | 'used' | 'expired' | 'refunded';

export interface Ticket {
  id: string;
  templateId: string;
  groupId: string;
  ownerId: string;
  issuedBy: string;
  issuedAt: Date;
  status: TicketStatus;
  expiresAt?: Date;
  consumedBy?: string;
  consumedAt?: Date;
  eventName?: string;
}

export type ActivityAction =
  | 'issue'
  | 'consume'
  | 'staff_add'
  | 'staff_remove'
  | 'member_add'
  | 'member_graduate'
  | 'template_create'
  | 'template_update'
  | 'template_delete';

export interface ActivityLog {
  id: string;
  groupId: string;
  actorId: string;
  action: ActivityAction;
  ticketId?: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface QRPayload {
  type: 'issue' | 'consume' | 'staff_invite';
  data: Record<string, string>;
  timestamp: number;
  signature: string;
}

// Pending ticket - issued by staff, waiting for fan to claim
export type PendingTicketStatus = 'pending' | 'claimed' | 'expired';

export interface PendingTicket {
  id: string; // Same as ticketId in QR
  templateId: string;
  groupId: string;
  templateName: string;
  templateImage?: string;
  expiresInDays?: number;
  issuedBy: string;
  issuedAt: Date;
  status: PendingTicketStatus;
  // Filled when claimed
  claimedBy?: string;
  claimedByNickname?: string;
  claimedByEmail?: string; // Google account email for reliable restoration
  claimedAt?: Date;
}
