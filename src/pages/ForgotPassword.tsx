import { useState } from 'react';
import { authService } from '@/services/auth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { ArrowLeft, Mail } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { AuthLayout } from '@/components/layout/AuthLayout';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try { await authService.resetPassword(email); setIsSent(true); toast.success('Instruções enviadas'); }
    catch { toast.error('Não foi possível enviar o e-mail'); }
    finally { setIsLoading(false); }
  };
  return (
    <><Helmet><title>Recuperar senha | Hubora</title></Helmet>
      <AuthLayout title="Recupere seu acesso" description={isSent ? 'Confira sua caixa de entrada e também a pasta de spam.' : 'Informe o e-mail usado na conta para receber as instruções de recuperação.'}>
        {!isSent ? <form onSubmit={handleSubmit} className="space-y-5"><label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.11em] text-[var(--hub-subtle)]">E-mail da conta</span><div className="relative"><Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hub-subtle)]" size={18} /><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="hub-field-with-leading-icon" placeholder="voce@email.com" required /></div></label><Button type="submit" size="lg" className="w-full" disabled={isLoading}>{isLoading ? 'Enviando...' : 'Enviar instruções'}</Button></form> : <div className="rounded-[1.25rem] border border-emerald-500/25 bg-emerald-500/8 p-5"><p className="font-bold text-emerald-500">E-mail enviado com sucesso.</p><Button variant="ghost" className="mt-3 px-0" onClick={() => setIsSent(false)}>Enviar para outro e-mail</Button></div>}
        <Link to="/login" className="mt-7 flex items-center justify-center gap-2 text-sm font-bold text-[var(--hub-muted)] hover:text-[var(--hub-text)]"><ArrowLeft size={17} /> Voltar para o login</Link>
      </AuthLayout>
    </>
  );
}
