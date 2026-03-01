import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const fetchRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setUserRole(data?.role || 'Retail');
    } catch (err) {
      console.error("Profile not found or error:", err.message);
      setUserRole('Retail'); // Default fallback so the app doesn't hang
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    // 1. Initial Session Check
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session);
        
        if (session?.user) {
          await fetchRole(session.user.id);
        } else {
          setIsLoadingAuth(false);
        }
      } catch (e) {
        setIsLoadingAuth(false);
      }
    };

    initAuth();

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        await fetchRole(session.user.id);
      } else {
        setUserRole(null);
        setIsLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); 
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, isAuthenticated, isLoadingAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}