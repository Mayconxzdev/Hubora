import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { classifyAdult, getAdultMode } from '@/services/adultPolicy';
import { getVaultLockoutRemaining, hasVaultPin, isVaultUnlocked, lockVault, unlockVaultForSession, verifyVaultPin } from '@/services/vault';
import { Button } from '@/components/ui/Button';
import { MediaCard } from '@/components/ui/MediaCard';
import { SEO } from '@/components/ui/SEO';
import { toast } from 'sonner';

export function AdultVault() {
  const { user, getLibraryItems } = useStore();
  const [unlocked, setUnlocked] = useState(isVaultUnlocked());
  const [pin, setPin] = useState('');
  const [revealed, setRevealed] = useState(true);
  const [lockoutSeconds, setLockoutSeconds] = useState(getVaultLockoutRemaining());

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = window.setInterval(() => setLockoutSeconds(getVaultLockoutRemaining()), 1000);
    return () => window.clearInterval(timer);
  }, [lockoutSeconds]);

  const entries = useMemo(() => getLibraryItems().filter((entry) => classifyAdult(entry.media) !== 'safe'), [getLibraryItems]);

  if (!user) return <div className="hub-page"><SEO title="Cofre Adulto"/><div className="hub-empty-state"><Lock size={32}/><p>Entre na sua conta para ativar o Cofre Adulto neste aparelho.</p></div></div>;
  if (!user.preferences.adultVaultEnabled || getAdultMode(user) !== 'vault') return <div className="hub-page"><SEO title="Cofre Adulto"/><div className="hub-empty-state"><ShieldAlert size={32}/><p>O Cofre Adulto está desativado. Ative-o em Configurações.</p></div></div>;

  const unlock = async () => {
    const remaining = getVaultLockoutRemaining();
    if (remaining > 0) { setLockoutSeconds(remaining); toast.error(`Aguarde ${remaining}s antes de tentar novamente.`); return; }
    if (await verifyVaultPin(pin)) { unlockVaultForSession(); setUnlocked(true); setPin(''); setLockoutSeconds(0); toast.success('Cofre desbloqueado neste aparelho.'); }
    else { const next = getVaultLockoutRemaining(); setLockoutSeconds(next); toast.error(next ? `Muitas tentativas. Aguarde ${next}s.` : 'PIN incorreto.'); }
  };

  if (!unlocked && hasVaultPin()) return <div className="hub-page"><SEO title="Cofre Adulto"/><div className="mx-auto max-w-md hub-panel p-6 text-center"><Lock className="mx-auto text-[var(--hub-brand)]" size={34}/><h1 className="mt-4 text-2xl font-black text-[var(--hub-text-strong)]">Cofre Adulto</h1><p className="mt-2 text-sm text-[var(--hub-muted)]">Digite o PIN configurado neste aparelho.</p><input className="hub-field mt-5 text-center text-lg tracking-[0.3em]" type="password" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}/>{lockoutSeconds > 0 && <p className="mt-3 text-xs text-[var(--hub-danger)]">Bloqueio temporário: aguarde {lockoutSeconds}s.</p>}<Button className="mt-3 w-full" disabled={lockoutSeconds > 0} onClick={() => void unlock()}>Desbloquear</Button></div></div>;

  return <div className="hub-page"><SEO title="Cofre Adulto" description="Área pessoal e privada para conteúdos adultos."/><header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><Lock size={14}/> Privado e pessoal</div><h1 className="hub-page-title">Cofre Adulto</h1><p className="hub-page-subtitle">Itens desta área não entram em compartilhamentos públicos. O desbloqueio é local para cada aparelho.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setRevealed((value) => !value)}>{revealed ? <EyeOff size={17}/> : <Eye size={17}/>} {revealed ? 'Ocultar capas' : 'Revelar capas'}</Button><Button variant="outline" onClick={() => { lockVault(); setUnlocked(false); }}>Bloquear</Button></div></header><section><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{entries.map((entry) => <div key={entry.id} className={revealed ? '' : 'blur-xl transition hover:blur-md'}><MediaCard item={entry.media}/></div>)}{!entries.length && <div className="hub-empty-state col-span-full">Nenhum item adulto foi adicionado à sua biblioteca.</div>}</div></section></div>;
}
