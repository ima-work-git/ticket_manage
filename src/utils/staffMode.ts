const STAFF_MODE_KEY = 'staff_mode_enabled';

export function isStaffMode(): boolean {
  return localStorage.getItem(STAFF_MODE_KEY) === 'true';
}

export function enableStaffMode(): void {
  localStorage.setItem(STAFF_MODE_KEY, 'true');
}

export function disableStaffMode(): void {
  localStorage.removeItem(STAFF_MODE_KEY);
}

export function generateInviteToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

export function getInviteUrl(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/staff-invite?token=${token}`;
}

export function validateAdminKey(key: string): boolean {
  const adminKey = import.meta.env.VITE_ADMIN_KEY;
  if (!adminKey) {
    console.error('VITE_ADMIN_KEY is not set');
    return false;
  }
  return key === adminKey;
}
