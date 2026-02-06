import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { User as AuthSession } from '@supabase/supabase-js';
import type { User } from '../types';
import { getCurrentUser, db } from '../db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { initializeSync, pullFromCloud } from '../services/sync';
import { requestPersistentStorage } from '../utils/storage';
import { checkAndEnableStaffMode } from '../utils/staffMode';

interface AuthContextType {
  user: User | null;
  supabaseUser: AuthSession | null;
  loading: boolean;
  isOnline: boolean;
  isFirstTimeUser: boolean;
  loginOffline: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
  syncNow: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Helper to create or get local user from Supabase session
async function getOrCreateLocalUser(sessionUser: AuthSession): Promise<User> {
  let localUser = await db.users.get(sessionUser.id);

  if (!localUser) {
    const nickname = sessionUser.user_metadata?.name ||
                    sessionUser.user_metadata?.full_name ||
                    sessionUser.email?.split('@')[0] ||
                    'ユーザー';

    localUser = {
      id: sessionUser.id,
      nickname,
      deviceKey: sessionUser.id,
      createdAt: new Date(),
    };
    await db.users.add(localUser);
  }

  localStorage.setItem('deviceKey', sessionUser.id);
  return localUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);

  // Online/offline handling
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize auth
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Request persistent storage
        requestPersistentStorage();

        // Check if first-time user
        const userCount = await db.users.count();
        if (mounted) setIsFirstTimeUser(userCount === 0);

        // Check for Supabase session with timeout
        if (isSupabaseConfigured() && supabase) {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => {
            setTimeout(() => resolve({ data: { session: null } }), 5000);
          });

          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

          if (session?.user) {
            if (mounted) setSupabaseUser(session.user);

            const localUser = await getOrCreateLocalUser(session.user);

            if (mounted) {
              setUser(localUser);
              setIsFirstTimeUser(false);
              setLoading(false);
            }

            // Check staff status and sync in background
            if (navigator.onLine) {
              checkAndEnableStaffMode(session.user.id).catch(console.error);
              initializeSync(session.user.id).catch(console.error);
            }

            return;
          }
        }

        // Fall back to local auth
        const localUser = await getCurrentUser();
        if (mounted) {
          setUser(localUser || null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        if (mounted) {
          try {
            const localUser = await getCurrentUser();
            setUser(localUser || null);
          } catch {
            setUser(null);
          }
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // Listen for Supabase auth changes
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setSupabaseUser(session.user);

          const localUser = await getOrCreateLocalUser(session.user);
          setUser(localUser);

          // Check staff status and sync in background
          if (navigator.onLine) {
            checkAndEnableStaffMode(session.user.id).catch(console.error);
            initializeSync(session.user.id).catch(console.error);
          }
        } else if (event === 'SIGNED_OUT') {
          setSupabaseUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loginOffline = async () => {
    const localUser = await getCurrentUser();
    if (!localUser) {
      throw new Error('ローカルユーザーが見つかりません。Googleでログインしてください。');
    }

    setUser(localUser);

    if (isOnline && isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSupabaseUser(session.user);
          initializeSync(session.user.id).catch(console.error);
        }
      } catch (error) {
        console.error('Cloud sync failed:', error);
      }
    }
  };

  const loginWithGoogle = async () => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Cloud機能が設定されていません');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      throw error;
    }
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSupabaseUser(null);
  };

  const updateNickname = async (nickname: string) => {
    if (!user) return;

    await db.users.update(user.id, { nickname });
    setUser({ ...user, nickname });

    if (isSupabaseConfigured() && supabase && supabaseUser && isOnline) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('profiles') as any)
          .update({ nickname })
          .eq('id', user.id);
      } catch (error) {
        console.error('Failed to sync nickname:', error);
      }
    }
  };

  const syncNow = async () => {
    if (!user || !isOnline || !isSupabaseConfigured()) return;
    await pullFromCloud(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        loading,
        isOnline,
        isFirstTimeUser,
        loginOffline,
        loginWithGoogle,
        logout,
        updateNickname,
        syncNow,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
