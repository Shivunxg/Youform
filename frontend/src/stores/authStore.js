import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
export const useAuthStore = create((set) => ({
  user: null, session: null, loading: true,
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, loading: false });
    supabase.auth.onAuthStateChange((_e, session) => set({ session, user: session?.user ?? null }));
  },
  signUp: async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) throw error; return data;
  },
  signIn: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error; return data;
  },
  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } });
    if (error) throw error;
  },
  signOut: async () => { await supabase.auth.signOut(); set({ user: null, session: null }); },
}));
