'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { fetchApi } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginAsDemo: (name?: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      setLoading(true);
      const res = await fetchApi<{ user: User }>('/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch {
      // Not logged in or expired
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function loginWithGoogle(credential: string) {
    try {
      const res = await fetchApi('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      });

      if (res.token) {
        localStorage.setItem('pigeon_auth_token', res.token);
      }
      if (res.user) {
        setUser(res.user);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Google Login failed');
    }
  }

  async function loginAsDemo(name = 'Pigeon Demo User', email = 'demo@pigeon.email') {
    try {
      const res = await fetchApi('/auth/demo', {
        method: 'POST',
        body: JSON.stringify({ name, email }),
      });

      if (res.token) {
        localStorage.setItem('pigeon_auth_token', res.token);
      }
      if (res.user) {
        setUser(res.user);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Demo Login failed');
    }
  }

  async function logout() {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('pigeon_auth_token');
      localStorage.removeItem('reach_auth_token');
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginAsDemo, logout }}>
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
