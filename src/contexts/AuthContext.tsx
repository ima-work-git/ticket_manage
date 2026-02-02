import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { User as AuthSession } from '@supabase/supabase-js';
import type { User } from '../types';
import { getCurrentUser, createUser, db } from '../db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { initializeSync, pullFromCloud } from '../services/sync';
import { requestPersistentStorage } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  supabaseUser: AuthSession | null;
  loading: boolean;
  isOnline: boolean;
  login: (nickname: string) => Promise<void>;
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

            // Initialize sync
            if (isOnline) {
              await initializeSync(session.user.id);
            }

            setLoading(false);
            return;
          }
        }

        // Fall back to local-only auth
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

  // Local login (nickname only, no cloud sync)
  const login = async (nickname: string) => {
    const newUser = await createUser(nickname);
    setUser(newUser);
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
        login,
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
