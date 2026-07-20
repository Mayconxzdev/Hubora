import { useState } from 'react';
import { authService } from '@/services/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LockKeyhole, Mail } from 'lucide-react';

export function Register() {
  const signupAllowed = import.meta.env.VITE_ALLOW_PUBLIC_SIGNUP === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await authService.registerWithEmail(email, password); toast.success('Conta criada com sucesso'); navigate('/'); }
    catch { setError('Não foi possível criar a conta. Confira os dados e tente novamente.'); toast.error('Erro ao criar conta'); }
  };
  if (!signupAllowed) return (
    <><Helmet><title>Convite necessário | Hubora</title></Helmet><AuthLayout title="Acesso por convite" description="Novas contas estão fechadas neste Hubora pessoal. Peça ao responsável para criar ou convidar sua conta."><p className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-4 text-sm leading-relaxed text-[var(--hub-muted)]">O catálogo não está aberto para cadastros públicos. Quem já possui conta pode entrar normalmente.</p><Button size="lg" className="mt-5 w-full" onClick={() => navigate('/login')}>Ir para entrar</Button></AuthLayout></>
  );
  return (
    <><Helmet><title>Criar conta | Hubora</title></Helmet>
      <AuthLayout title="Crie seu Hubora" description="Comece localmente e conecte sua conta para sincronizar quando estiver pronto.">
        {error && <p className="mb-5 rounded-xl border border-red-500/25 bg-red-500/8 p-4 text-sm font-semibold text-red-500">{error}</p>}
        <form onSubmit={handleRegister} className="space-y-4">
          <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.11em] text-[var(--hub-subtle)]">E-mail</span><div className="relative"><Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hub-subtle)]" size={18} /><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-11" placeholder="voce@email.com" required /></div></label>
          <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.11em] text-[var(--hub-subtle)]">Senha</span><div className="relative"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hub-subtle)]" size={18} /><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-11" placeholder="No mínimo 8 caracteres" minLength={8} required /></div></label>
          <p className="text-xs leading-relaxed text-[var(--hub-subtle)]">Ao criar sua conta, você concorda com os Termos e a Política de Privacidade do Hubora.</p>
          <Button type="submit" size="lg" className="w-full">Criar minha conta</Button>
        </form>
        <p className="mt-7 text-center text-sm text-[var(--hub-muted)]">Já usa o Hubora? <Link to="/login" className="font-bold text-[var(--hub-brand)] hover:underline">Entrar</Link></p>
      </AuthLayout>
    </>
  );
}
