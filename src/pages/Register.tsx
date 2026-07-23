import { useState } from 'react';
import { authService } from '@/services/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LockKeyhole, LogIn, Mail, UserCheck } from 'lucide-react';
import { accessConfiguration } from '@/config/access';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const navigate = useNavigate();
  const { allowGuestMode, allowPublicSignup } = accessConfiguration();

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      localStorage.removeItem('hubora_guest_mode');
      const result = await authService.registerWithEmail(email.trim(), password);
      if (result.requiresEmailConfirmation) {
        setConfirmationEmail(email.trim());
        setPassword('');
        toast.success('Conta criada. Confirme seu e-mail para entrar.');
        return;
      }
      toast.success('Conta criada com sucesso!');
      navigate('/');
    } catch {
      setError('Não foi possível criar a conta. Confira os dados e tente novamente.');
      toast.error('Erro ao criar conta no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    localStorage.setItem('hubora_guest_mode', 'true');
    toast.success('Modo Visitante ativo! Seus dados serão salvos localmente.');
    window.location.href = '/';
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoadingGoogle(true);
    try {
      localStorage.removeItem('hubora_guest_mode');
      await authService.loginWithGoogle();
    } catch {
      setError('O acesso com Google não está habilitado no projeto Supabase atual. Use o modo visitante ou crie uma conta por e-mail.');
      toast.error('Google OAuth não habilitado no Supabase.');
      setLoadingGoogle(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Criar conta | Hubora</title>
      </Helmet>
      <AuthLayout
        title="Crie seu Hubora"
        description="Crie sua conta para sincronizar entre dispositivos ou navegue livremente como visitante."
      >
        {!allowPublicSignup && (
          <p className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-semibold leading-relaxed text-amber-300">
            O cadastro público está desativado nesta instalação privada. Solicite ao proprietário uma conta autorizada.
          </p>
        )}
        {error && (
          <p className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold leading-relaxed text-red-400">
            {error}
          </p>
        )}

        {allowGuestMode && (
          <Button
            onClick={handleGuestMode}
            size="lg"
            variant="outline"
            className="mb-4 w-full"
          >
            <UserCheck size={18} />
            Entrar como Visitante (Sem Cadastro)
          </Button>
        )}

        <Button onClick={() => void handleGoogleLogin()} size="lg" className="mb-4 w-full" disabled={loadingGoogle}>
          <LogIn size={18} aria-hidden="true" />
          {loadingGoogle ? 'Abrindo Google...' : 'Continuar com Google'}
        </Button>

        {confirmationEmail && (
          <div role="status" className="rounded-xl border border-[color-mix(in_srgb,var(--hub-brand)_40%,var(--hub-border))] bg-[var(--hub-brand-soft)] p-5 text-sm leading-relaxed text-[var(--hub-text)]">
            <strong className="block text-base text-[var(--hub-text-strong)]">Confirme seu e-mail</strong>
            <span className="mt-2 block">Enviamos uma confirmação para <strong>{confirmationEmail}</strong>. Abra a mensagem e depois volte para entrar. Se ela não aparecer, verifique o spam.</span>
            <Link to="/login" className="hub-auth-link mt-4 inline-flex min-h-11 items-center font-bold hover:underline">Ir para o login</Link>
          </div>
        )}

        {allowPublicSignup && !confirmationEmail && <form onSubmit={handleRegister} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.11em] text-[var(--hub-subtle)]">
              E-mail
            </span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hub-subtle)]" size={18} />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="hub-field-with-leading-icon rounded-xl"
                placeholder="voce@email.com"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.11em] text-[var(--hub-subtle)]">
              Senha
            </span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hub-subtle)]" size={18} />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="hub-field-with-leading-icon rounded-xl"
                placeholder="No mínimo 8 caracteres"
                minLength={8}
                required
              />
            </div>
          </label>

          <p className="text-xs leading-relaxed text-[var(--hub-subtle)]">
            Ao criar sua conta, você concorda com os Termos e a Política de Privacidade do Hubora.
          </p>

          <Button type="submit" size="lg" className="w-full rounded-xl" disabled={loading} aria-busy={loading}>
            {loading ? 'Criando conta…' : 'Criar minha conta'}
          </Button>
        </form>}

        <p className="mt-7 text-center text-sm text-[var(--hub-muted)]">
          Já usa o Hubora?{' '}
          <Link to="/login" className="hub-auth-link font-bold hover:underline">
            Entrar
          </Link>
        </p>
      </AuthLayout>
    </>
  );
}
