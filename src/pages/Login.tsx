import { useEffect, useState } from 'react';
import { authService } from '@/services/auth';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

export function Login() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const navigate = useNavigate();
  const emailFallback = import.meta.env.VITE_ENABLE_EMAIL_LOGIN !== 'false';

  useEffect(() => {
    if (params.get('denied') === '1') {
      setError('Esta conta não está autorizada nesta instalação privada do Hubora.');
      void authService.logout();
    }
  }, [params]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await authService.loginWithEmail(email, password); toast.success('Login realizado.'); navigate('/'); }
    catch { setError('E-mail ou senha inválidos.'); toast.error('Não foi possível entrar.'); }
  };
  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setError('');
    try { await authService.loginWithGoogle(); }
    catch { setError('Não foi possível iniciar o login com Google.'); toast.error('Falha no login com Google.'); setLoadingGoogle(false); }
  };

  return <><Helmet><title>Entrar | Hubora</title><meta name="description" content="Entre no Hubora para sincronizar sua biblioteca pessoal." /></Helmet>
    <AuthLayout title="Entrar no Hubora" description="Use sua conta Google para acessar a mesma biblioteca e o mesmo progresso no PC e no Android.">
      {error && <p className="mb-5 rounded-xl border border-red-500/25 bg-red-500/8 p-4 text-sm font-semibold text-red-500">{error}</p>}
      <Button onClick={handleGoogleLogin} size="lg" className="w-full" disabled={loadingGoogle}><span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-black text-black">G</span> {loadingGoogle ? 'Abrindo Google...' : 'Continuar com Google'}</Button>
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-4"><ShieldCheck className="mt-0.5 shrink-0 text-[var(--hub-brand)]" size={19}/><p className="text-xs leading-relaxed text-[var(--hub-muted)]">Esta instalação pode limitar o acesso aos e-mails configurados pelo proprietário. Seus dados ficam separados por conta no Supabase.</p></div>
      {emailFallback && <><div className="my-6 flex items-center gap-4"><div className="h-px flex-1 bg-[var(--hub-border)]"/><span className="text-[0.68rem] font-black uppercase tracking-[0.15em] text-[var(--hub-subtle)]">alternativa</span><div className="h-px flex-1 bg-[var(--hub-border)]"/></div><form onSubmit={handleLogin} className="space-y-4">
        <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.11em] text-[var(--hub-subtle)]">E-mail</span><div className="relative"><Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hub-subtle)]" size={18}/><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-11" placeholder="voce@email.com" required/></div></label>
        <label className="block"><div className="mb-2 flex justify-between"><span className="text-xs font-black uppercase tracking-[0.11em] text-[var(--hub-subtle)]">Senha</span><Link to="/forgot-password" className="text-xs font-bold text-[var(--hub-brand)] hover:underline">Esqueceu?</Link></div><div className="relative"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hub-subtle)]" size={18}/><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-11" placeholder="Sua senha" required/></div></label>
        <Button type="submit" size="lg" variant="outline" className="w-full">Entrar com e-mail</Button>
      </form></>}
    </AuthLayout>
  </>;
}
