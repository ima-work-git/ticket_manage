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

interface AuthContextType {
  user: User | null;
  supabaseUser: AuthSession | null;
  loading: boolean;
  isOnline: boolean;
  isFirstTimeUser: boolean; // True if no user has ever logged in on this device
  loginOffline: () => Promise<void>; // Quick offline login for returning users
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
  syncNow: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

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
    const initialize = async () => {
      try {
        // Request persistent storage to protect data from automatic cleanup
        requestPersistentStorage();

        // Check if this is a first-time user (no users in local DB)
        const userCount = await db.users.count();
        setIsFirstTimeUser(userCount === 0);

        // Check for Supabase session first
        if (isSupabaseConfigured() && supabase) {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            setSupabaseUser(session.user);

            // Get or create local user linked to Supabase user
            let localUser = await db.users.get(session.user.id);

            if (!localUser) {
              // Create local user from Supabase profile
              const nickname = session.user.user_metadata?.name ||
                              session.user.user_metadata?.full_name ||
                              session.user.email?.split('@')[0] ||
                              'ユーザー';

              localUser = {
                id: session.user.id,
                nickname,
                deviceKey: session.user.id,
                createdAt: new Date(),
              };
              await db.users.add(localUser);
            }

            setUser(localUser);
            setIsFirstTimeUser(false); // User has logged in

            // Initialize sync
            if (isOnline) {
              await initializeSync(session.user.id);
            }

            setLoading(false);
            return;
          }
        }

        // Fall back to local-only auth (for returning users)
        const localUser = await getCurrentUser();
        setUser(localUser || null);
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // Fall back to local auth on error
        const localUser = await getCurrentUser();
        setUser(localUser || null);
        setLoading(false);
      }
    };

    initialize();

    // Listen for Supabase auth changes
    if (isSupabaseConfigured() && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            setSupabaseUser(session.user);

            let localUser = await db.users.get(session.user.id);

            if (!localUser) {
              const nickname = session.user.user_metadata?.name ||
                              session.user.user_metadata?.full_name ||
                              session.user.email?.split('@')[0] ||
                              'ユーザー';

              localUser = {
                id: session.user.id,
                nickname,
                deviceKey: session.user.id,
                createdAt: new Date(),
              };
              await db.users.add(localUser);
            }

            setUser(localUser);

            // Sync on sign in
            if (navigator.onLine) {
              await initializeSync(session.user.id);
            }
          } else if (event === 'SIGNED_OUT') {
            setSupabaseUser(null);
            // Keep local user for offline access
          }
        }
      );

      return () => subscription.unsubscribe();
    }
  }, [isOnline]);

  // Offline login for returning users (uses existing local user)
  // If online, will still sync with cloud
  const loginOffline = async () => {
    const localUser = await getCurrentUser();
    if (!localUser) {
      throw new Error('ローカルユーザーが見つかりません。Googleでログインしてください。');
    }

    setUser(localUser);

    // If online and Supabase is configured, try to sync
    if (isOnline && isSupabaseConfigured() && supabase) {
      try {
        // Check if there's an existing Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSupabaseUser(session.user);
          await initializeSync(session.user.id);
        }
      } catch (error) {
        console.error('Cloud sync failed, continuing offline:', error);
      }
    }
  };

  // Google login via Supabase
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

  // Logout
  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSupabaseUser(null);
    // Keep local user data for offline access
  };

  // Update nickname
  const updateNickname = async (nickname: string) => {
    if (!user) return;

    await db.users.update(user.id, { nickname });
    setUser({ ...user, nickname });

    // Sync to cloud if available
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

  // Manual sync trigger
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
