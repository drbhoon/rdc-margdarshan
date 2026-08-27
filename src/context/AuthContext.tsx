'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  employeeCode: string;
  email: string;
  name: string;
  role: 'MENTEE' | 'MENTOR' | 'ADMIN';
  department: string;
  designation: string;
  discStyle: string | null;
  isConsentShared: boolean;
  careerGoals: string | null;
  topics: string[];
  challenges: string[];
  availability: string | null;
  commStyleNotes: string | null;
}

const DEFAULT_ADMIN: User = {
  employeeCode: 'EMP001',
  name: 'Puja Singh',
  email: 'puja.singh@rdc.in',
  role: 'ADMIN',
  department: 'HR, L&D & Operational Excellence',
  designation: 'Head of L&D and Operational Excellence',
  discStyle: null,
  isConsentShared: true,
  careerGoals: null,
  topics: [],
  challenges: [],
  availability: null,
  commStyleNotes: null,
};

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  loading: boolean;
  login: (employeeCode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshAllUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Default to Admin so the main Admin Dashboard always loads immediately
  const [user, setUser] = useState<User | null>(DEFAULT_ADMIN);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          setAllUsers(data.users);
        }
      }
    } catch (e) {
      console.error('Error fetching all users roster:', e);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          return data.user;
        }
      }
    } catch (e) {
      console.error('Error fetching session profile:', e);
    }
    return null;
  };

  const login = async (employeeCode: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode }),
      });
      const data = await res.json();
      if (res.ok) {
        const fullUser = await fetchProfile();
        if (!fullUser) {
          setUser(data.user);
        }
        await fetchAllUsers();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (e) {
      return { success: false, error: 'Network error occurred' };
    }
  };

  const initAuth = async () => {
    try {
      await fetchAllUsers();

      // 1. Check if a magic parameter ?emp=... or ?code=... is in the URL
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const magicEmpCode = params.get('emp') || params.get('code') || params.get('employeeCode');

        if (magicEmpCode) {
          await login(magicEmpCode);
          return;
        }
      }

      // 2. Fetch active session
      await fetchProfile();
    } catch (e) {
      console.error('Auth initialization error:', e);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(DEFAULT_ADMIN);
      await login('EMP001');
      await fetchAllUsers();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const refreshUser = async () => {
    await fetchProfile();
    await fetchAllUsers();
  };

  const refreshAllUsers = async () => {
    await fetchAllUsers();
  };

  return (
    <AuthContext.Provider value={{ user, allUsers, loading, login, logout, refreshUser, refreshAllUsers }}>
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

