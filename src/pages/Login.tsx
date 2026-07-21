import { useEffect, useState } from 'react';
import { authService } from '@/services/auth';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LockKeyhole, Mail, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';

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
      setError('Esta conta não está autorizada nesta instalação do Hubora.');
      void authService.logout();
    }
  }, [params]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      localStorage.removeItem('hubora_guest_mode');
      await authService.loginWithEmail(email, password);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch {
      setError('E-mail ou senha inválidos, ou conta não cadastrada.');
      toast.error('Não foi possível entrar com e-mail.');
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setError('');
    try {
      localStorage.removeItem('hubora_guest_mode');
      await authService.loginWithGoogle();
    } catch (err: any) {
      setError('O login com Google não está habilitado no projeto Supabase atual. Você pode navegar como Visitante ou criar uma conta por e-mail.');
      toast.error('Google OAuth não habilitado no Supabase.');
      setLoadingGoogle(false);
    }
  };

  const handleGuestMode = () => {
    localStorage.setItem('hubora_guest_mode', 'true');
    toast.success('Modo Visitante ativo! Seus dados serão salvos localmente.');
    window.location.href = '/';
  };

  return (
    <>
      <Helmet>
        <title>Entrar | Hubora</title>
        <meta name="description" content="Entre no Hubora ou navegue no modo visitante privado." />
      </Helmet>
      <AuthLayout
        title="Entrar no Hubora"
        description="Acesse sua biblioteca pessoal ou experimente instantaneamente sem cadastro."
      >
        {error && (
          <p className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold leading-relaxed text-red-400">
            {error}
          </p>
        )}

        {/* Botão de Entrada como Visitante sem Cadastro */}
        <Button
          onClick={handleGuestMode}
          size="lg"
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black gap-2 rounded-2xl shadow-lg shadow-emerald-600/20 mb-3"
        >
          <UserCheck size={18} />
          Entrar como Visitante (Sem Cadastro)
        </Button>

        {/* Continuar com Google */}
        <Button
          onClick={handleGoogleLogin}
          size="lg"
          variant="outline"
          className="w-full gap-2 rounded-2xl border-white/10 hover:bg-white/5"
          disabled={loadingGoogle}
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-black text-black">G</span>
          {loadingGoogle ? 'Abrindo Google...' : 'Continuar com Google'}
        </Button>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-[var(--hub-brand)]" size={19} />
          <p className="text-xs leading-relaxed text-[var(--hub-muted)]">
            No <strong>Modo Visitante</strong>, sua biblioteca e progresso ficam guardados de forma 100% privada no seu próprio dispositivo.
          </p>
        </div>

        {emailFallback && (
          <>
            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-[var(--hub-border)]" />
              <span className="text-[0.68rem] font-black uppercase tracking-[0.15em] text-[var(--hub-subtle)]">
                ou com conta
              </span>
              <div className="h-px flex-1 bg-[var(--hub-border)]" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.11em] text-[var(--hub-subtle)]">
                  E-mail
                </span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hub-subtle)]" size={18} />
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-11 rounded-xl"
                    placeholder="voce@email.com"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <div className="mb-2 flex justify-between">
                  <span className="text-xs font-black uppercase tracking-[0.11em] text-[var(--hub-subtle)]">
                    Senha
                  </span>
                  <Link to="/forgot-password" className="text-xs font-bold text-[var(--hub-brand)] hover:underline">
                    Esqueceu?
                  </Link>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hub-subtle)]" size={18} />
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-11 rounded-xl"
                    placeholder="Sua senha"
                    required
                  />
                </div>
              </label>

              <Button type="submit" size="lg" variant="outline" className="w-full rounded-xl">
                Entrar com e-mail
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-[var(--hub-muted)]">
              Ainda não tem conta?{' '}
              <Link to="/register" className="font-bold text-[var(--hub-brand)] hover:underline">
                Criar conta no Hubora
              </Link>
            </div>
          </>
        )}
      </AuthLayout>
    </>
  );
}
