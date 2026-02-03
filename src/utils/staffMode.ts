import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

// Check if user is staff in any group from cloud
export async function checkAndEnableStaffMode(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    return isStaffMode();
  }

  try {
    // Check if user is in staff table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('staff') as any)
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('Failed to check staff status:', error);
      return isStaffMode();
    }

    if (data && data.length > 0) {
      // User is staff in at least one group
      enableStaffMode();
      return true;
    }

    return isStaffMode();
  } catch (error) {
    console.error('Failed to check staff status:', error);
    return isStaffMode();
  }
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
  const adminKey = import.meta.env.VITE_admin_key;
  if (!adminKey) {
    console.error('VITE_admin_key is not set');
    return false;
  }
  return key === adminKey;
}
