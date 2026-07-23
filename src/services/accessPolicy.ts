import type { AuthUser } from '@/types';

export function isUserAllowed(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.uid);
}

/**
 * O Hubora é uma aplicação pública: qualquer conta autenticada pode entrar. O
 * isolamento de dados é garantido pelas policies RLS do Supabase, sempre por
 * auth.uid(), e não por uma lista de e-mails exposta no bundle do navegador.
 */
export async function verifyUserAllowed(user: AuthUser | null | undefined): Promise<boolean> {
  return isUserAllowed(user);
}
