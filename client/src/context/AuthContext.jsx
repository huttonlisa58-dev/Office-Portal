'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getMe } from '@/lib/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadMe = useCallback(async () => {
    try {
      const me = await getMe();
      if (me) { setUser(me.user); setCompany(me.company); setProfile(me.profile); }
      else { setUser(null); setCompany(null); setProfile(null); }
    } catch { setUser(null); setCompany(null); setProfile(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadMe();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setUser(null); setCompany(null); setProfile(null); }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadMe]);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const me = await getMe(); // throws (after sign-out) if portal access is disabled
    if (me) { setUser(me.user); setCompany(me.company); setProfile(me.profile); }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null); setCompany(null); setProfile(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, company, profile, loading, login, logout, refresh: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
