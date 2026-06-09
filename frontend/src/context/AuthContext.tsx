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
    // STEP 1: Get initial session — setLoading(false) as soon as we know the auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      setLoading(false); // Auth state is resolved — stop showing spinner

      // Profile fetch is best-effort and doesn't block rendering
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    }).catch(() => {
      // Even on error, stop the loading spinner
      setLoading(false);
    });

    // STEP 2: Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);

        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
