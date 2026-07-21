import { useState } from 'react';
import { authService } from '@/services/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LockKeyhole, Mail, UserCheck } from 'lucide-react';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      localStorage.removeItem('hubora_guest_mode');
      await authService.registerWithEmail(email, password);
      toast.success('Conta criada com sucesso!');
      navigate('/');
    } catch {
      setError('Não foi possível criar a conta. Confira os dados e tente novamente.');
      toast.error('Erro ao criar conta no Supabase.');
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
        <title>Criar conta | Hubora</title>
      </Helmet>
      <AuthLayout
        title="Crie seu Hubora"
        description="Crie sua conta para sincronizar entre dispositivos ou navegue livremente como visitante."
      >
        {error && (
          <p className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold leading-relaxed text-red-400">
            {error}
          </p>
        )}

        <Button
          onClick={handleGuestMode}
          size="lg"
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black gap-2 rounded-2xl shadow-lg shadow-emerald-600/20 mb-4"
        >
          <UserCheck size={18} />
          Entrar como Visitante (Sem Cadastro)
        </Button>

        <form onSubmit={handleRegister} className="space-y-4">
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
                className="pl-11 rounded-xl"
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
                className="pl-11 rounded-xl"
                placeholder="No mínimo 8 caracteres"
                minLength={8}
                required
              />
            </div>
          </label>

          <p className="text-xs leading-relaxed text-[var(--hub-subtle)]">
            Ao criar sua conta, você concorda com os Termos e a Política de Privacidade do Hubora.
          </p>

          <Button type="submit" size="lg" className="w-full rounded-xl">
            Criar minha conta
          </Button>
        </form>

        <p className="mt-7 text-center text-sm text-[var(--hub-muted)]">
          Já usa o Hubora?{' '}
          <Link to="/login" className="font-bold text-[var(--hub-brand)] hover:underline">
            Entrar
          </Link>
        </p>
      </AuthLayout>
    </>
  );
}
