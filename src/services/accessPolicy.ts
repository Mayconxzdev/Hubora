import type { AuthUser } from '@/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export function configuredAllowedEmails(): string[] {
  return String(import.meta.env.VITE_ALLOWED_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isUserAllowed(user: AuthUser | null | undefined): boolean {
  if (!user?.email) return false;
  const allowed = configuredAllowedEmails();
  return allowed.length === 0 || allowed.includes(user.email.toLowerCase());
}

/**
 * Confirma o acesso em duas camadas: allowlist do bundle e RPC protegida no Supabase.
 * A verificação remota impede que a allowlist seja burlada alterando apenas o JavaScript
 * entregue ao navegador. Em modo local sem Supabase, somente a regra local é aplicada.
 */
export async function verifyUserAllowed(user: AuthUser | null | undefined): Promise<boolean> {
  if (!isUserAllowed(user)) return false;
  if (!isSupabaseConfigured || !supabase || import.meta.env.VITE_ENFORCE_SERVER_ALLOWLIST === 'false') return true;

  const { data, error } = await supabase.rpc('is_hubora_allowed_user');
  if (error) {
    console.warn('A allowlist remota não pôde ser validada:', error.message);
    return false;
  }
  return data === true;
}
