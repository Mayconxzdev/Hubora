import type { AuthUser } from '@/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

function requireClient() {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Sincronização em nuvem não configurada. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
  }
  return supabase;
}

function mapUser(user: NonNullable<Awaited<ReturnType<ReturnType<typeof requireClient>['auth']['getUser']>>['data']['user']>): AuthUser {
  return {
    uid: user.id,
    email: user.email || undefined,
    displayName: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
    photoURL: user.user_metadata?.avatar_url || undefined,
  };
}

export const authService = {
  loginWithGoogle: async () => {
    const client = requireClient();
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  },

  loginWithEmail: async (email: string, password: string) => {
    const client = requireClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  registerWithEmail: async (email: string, password: string) => {
    const client = requireClient();
    const { error } = await client.auth.signUp({ email, password });
    if (error) throw error;
  },

  resetPassword: async (email: string) => {
    const client = requireClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    if (error) throw error;
  },

  logout: async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange: (callback: (user: AuthUser | null) => void) => {
    if (!supabase) {
      callback(null);
      return () => undefined;
    }

    void supabase.auth.getSession().then(({ data }) => {
      callback(data.session?.user ? mapUser(data.session.user) : null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? mapUser(session.user) : null);
    });

    return () => data.subscription.unsubscribe();
  },
};
