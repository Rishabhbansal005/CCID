import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface AuthContextValue {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // loading = true only until we know whether a session exists or not
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (supabaseUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUserId)
        .maybeSingle();  // maybeSingle() returns null instead of error when no row found

      if (data && !error) {
        setUser(data as User);
      }
    } catch (e) {
      // Non-fatal: users table may not exist yet or profile row not created
      console.warn('[CCID] Could not load user profile (non-fatal):', e);
    }
  };

  const refreshUser = async () => {
    if (supabaseUser) {
      await fetchUserProfile(supabaseUser.id);
    }
  };

  useEffect(() => {
    // Mock: immediately resolve auth state and auto-login
    const fakeSession = { user: { id: 'mock-user-1', email: 'mock@agency.gov' } } as any;
    setSession(fakeSession);
    setSupabaseUser(fakeSession.user);
    setUser({ id: 'mock-user-1', email: 'mock@agency.gov', full_name: 'Mock Analyst', role: 'investigator', created_at: new Date().toISOString() } as User);
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    // Mock login
    const fakeSession = { user: { id: 'mock-user-1', email } } as any;
    setSession(fakeSession);
    setSupabaseUser(fakeSession.user);
    setUser({ id: 'mock-user-1', email, full_name: 'Mock Analyst', role: 'investigator', created_at: new Date().toISOString() } as User);
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    const fakeSession = { user: { id: 'mock-user-1', email } } as any;
    setSession(fakeSession);
    setSupabaseUser(fakeSession.user);
    setUser({ id: 'mock-user-1', email, full_name: fullName, role, created_at: new Date().toISOString() } as User);
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setSupabaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, supabaseUser, user, loading, signIn, signUp, signOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
