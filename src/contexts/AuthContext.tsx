import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { User } from '../types';
import { getCurrentUser, createUser } from '../db';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (nickname: string) => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u || null);
      setLoading(false);
    });
  }, []);

  const login = async (nickname: string) => {
    const newUser = await createUser(nickname);
    setUser(newUser);
  };

  const updateNickname = async (nickname: string) => {
    if (!user) return;
    const { db } = await import('../db');
    await db.users.update(user.id, { nickname });
    setUser({ ...user, nickname });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, updateNickname }}>
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
