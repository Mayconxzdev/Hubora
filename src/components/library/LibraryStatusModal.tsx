import { useEffect, useState } from 'react';
import { BellRing, Check, Heart, Star, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { MediaItem, LibraryStatus, ProgressState, LibraryPriority, type ReleasePreferences } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { createEntryId, findLibraryEntry } from '@/services/identity';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { DEFAULT_RELEASE_PREFERENCES, notificationService, preferencesForMedia, releaseKindFor } from '@/services/notifications';

interface LibraryStatusModalProps { item: MediaItem; isOpen: boolean; onClose: () => void; }

const STATUSES: Array<{ value: LibraryStatus; label: string }> = [
  { value: 'planning', label: 'Quero consumir' },
  { value: 'consuming', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'paused', label: 'Pausado' },
  { value: 'dropped', label: 'Abandonado' },
];

const PRIORITIES: Array<{ value: LibraryPriority; label: string }> = [
  { value: 'low', label: 'Baixa' }, { value: 'medium', label: 'Normal' }, { value: 'high', label: 'Alta' }, { value: 'must', label: 'Prioridade máxima' },
];

export function LibraryStatusModal({ item, isOpen, onClose }: LibraryStatusModalProps) {
  const { library, updateLibraryItem, addToLibrary, removeFromLibrary, user } = useStore();
  const inLibrary = findLibraryEntry(library, item);
  const [status, setStatus] = useState<LibraryStatus>(inLibrary?.status || 'planning');
  const [progress, setProgress] = useState<ProgressState>(inLibrary?.progress || {});
  const [rating, setRating] = useState(inLibrary?.rating || 0);
  const [priority, setPriority] = useState<LibraryPriority>(inLibrary?.priority || 'medium');
  const [isFavorite, setIsFavorite] = useState(inLibrary?.isFavorite || false);
  const [isTrackedRelease, setIsTrackedRelease] = useState(inLibrary?.isTrackedRelease || false);
  const [releasePreferences, setReleasePreferences] = useState<ReleasePreferences>(inLibrary?.releasePreferences || DEFAULT_RELEASE_PREFERENCES);

  useEffect(() => {
    setStatus(inLibrary?.status || 'planning');
    setProgress(inLibrary?.progress || {});
    setRating(inLibrary?.rating || 0);
    setPriority(inLibrary?.priority || 'medium');
    setIsFavorite(inLibrary?.isFavorite || false);
    setIsTrackedRelease(inLibrary?.isTrackedRelease || false);
    setReleasePreferences(inLibrary?.releasePreferences || DEFAULT_RELEASE_PREFERENCES);
  }, [inLibrary, isOpen]);

  const updateProgress = <K extends keyof ProgressState>(key: K, value: ProgressState[K]) => setProgress((current) => ({ ...current, [key]: value }));

  const save = () => {
    const entryId = inLibrary?.id || createEntryId(item);
    if (inLibrary) {
      updateLibraryItem(entryId, { status, progress, rating, priority, isFavorite, isTrackedRelease, releasePreferences });
      toast.success('Biblioteca atualizada');
    } else {
      addToLibrary(item, status);
      updateLibraryItem(entryId, { progress, rating, priority, isFavorite, isTrackedRelease, releasePreferences });
      toast.success('Adicionado à biblioteca');
    }
    if (user) void notificationService.syncSubscription({ userId: user.uid, entryId, item, enabled: isTrackedRelease, preferences: releasePreferences }).catch(() => toast.warning('O progresso foi salvo, mas o acompanhamento remoto será repetido na próxima sincronização.'));
    onClose();
  };

  const remove = () => {
    if (!inLibrary) return;
    removeFromLibrary(inLibrary.id);
    toast.success('Removido da biblioteca');
    onClose();
  };

  const progressFields = () => {
    if (item.mediaType === 'movie') {
      return <button onClick={() => { updateProgress('watched', !progress.watched); if (!progress.watched) setStatus('completed'); }} className={cn('flex min-h-12 w-full items-center gap-3 rounded-xl border p-3 text-left font-bold transition', progress.watched || status === 'completed' ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-500' : 'border-[var(--hub-border)] bg-[var(--hub-surface-2)] text-[var(--hub-text)]')}><span className="grid h-7 w-7 place-items-center rounded-full border border-current"><Check size={15} /></span> Marcar como assistido</button>;
    }
    if (item.mediaType === 'tv') return <div className="grid grid-cols-2 gap-3"><Field label="Temporada"><Input type="number" min={0} value={progress.currentSeason || ''} onChange={(e) => updateProgress('currentSeason', Number(e.target.value))} /></Field><Field label="Episódio"><Input type="number" min={0} value={progress.currentEpisode || ''} onChange={(e) => updateProgress('currentEpisode', Number(e.target.value))} /></Field></div>;
    if (item.mediaType === 'anime') return <div className="grid grid-cols-2 gap-3"><Field label="Episódio atual"><Input type="number" min={0} value={progress.currentEpisode || ''} onChange={(e) => updateProgress('currentEpisode', Number(e.target.value))} /></Field><Field label="Total de episódios"><Input type="number" min={0} value={progress.totalEpisodes || item.episodesCount || ''} onChange={(e) => updateProgress('totalEpisodes', Number(e.target.value))} /></Field></div>;
    if (item.mediaType === 'manga' || item.mediaType === 'comic') return <div className="grid grid-cols-2 gap-3"><Field label={item.mediaType === 'manga' ? 'Capítulo' : 'Edição'}><Input type="number" min={0} value={item.mediaType === 'manga' ? progress.currentChapter || '' : progress.currentIssue || ''} onChange={(e) => updateProgress(item.mediaType === 'manga' ? 'currentChapter' : 'currentIssue', Number(e.target.value))} /></Field><Field label="Volume"><Input type="number" min={0} value={progress.currentVolume || ''} onChange={(e) => updateProgress('currentVolume', Number(e.target.value))} /></Field></div>;
    if (item.mediaType === 'book' || item.mediaType === 'novel') return <div className="grid grid-cols-2 gap-3"><Field label="Página atual"><Input type="number" min={0} value={progress.currentPage || ''} onChange={(e) => updateProgress('currentPage', Number(e.target.value))} /></Field><Field label="Total de páginas"><Input type="number" min={0} value={progress.totalPages || item.pages || ''} onChange={(e) => updateProgress('totalPages', Number(e.target.value))} /></Field></div>;
    if (item.mediaType === 'game') return <div className="grid grid-cols-2 gap-3"><Field label="Horas jogadas"><Input type="number" min={0} value={progress.hoursPlayed || ''} onChange={(e) => updateProgress('hoursPlayed', Number(e.target.value))} /></Field><Field label="Plataforma"><Input value={progress.platform || ''} onChange={(e) => updateProgress('platform', e.target.value)} placeholder="PC, PS5, Switch..." /></Field></div>;
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex min-w-0 gap-3 pr-10">
            <OptimizedImage src={item.posterPath || item.backdropPath || '/icons/hubora-512.png'} alt="" className="h-20 w-14 shrink-0 rounded-lg" />
            <div className="min-w-0"><DialogTitle className="truncate">{item.title}</DialogTitle><DialogDescription>Organize status, progresso, prioridade e atualizações.</DialogDescription></div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-6">
          <Field label="Status">
            <div className="flex flex-wrap gap-2">{STATUSES.map((option) => <button key={option.value} onClick={() => setStatus(option.value)} className="hub-chip transition hover:border-[var(--hub-border-strong)]" data-active={status === option.value}>{status === option.value && <Check size={13} />}{option.label}</button>)}</div>
          </Field>

          <Field label="Progresso">{progressFields()}</Field>

          <Field label="Minha avaliação">
            <div className="flex flex-wrap items-center gap-1.5">{Array.from({ length: 10 }).map((_, index) => { const value = index + 1; return <button key={value} onClick={() => setRating(rating === value ? 0 : value)} className={cn('grid h-9 w-9 place-items-center rounded-full border text-xs font-black transition', value <= rating ? 'border-amber-400/35 bg-amber-400/12 text-amber-500' : 'border-[var(--hub-border)] bg-[var(--hub-surface-2)] text-[var(--hub-subtle)] hover:text-[var(--hub-text)]')} aria-label={`Nota ${value}`}><Star size={14} className={value <= rating ? 'fill-current' : ''} /></button>; })}<span className="ml-2 text-sm font-bold text-[var(--hub-muted)]">{rating ? `${rating}/10` : 'Sem nota'}</span></div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prioridade"><select className="hub-select" value={priority} onChange={(e) => setPriority(e.target.value as LibraryPriority)}>{PRIORITIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
            <Field label="Favorito"><button onClick={() => setIsFavorite((value) => !value)} className={cn('flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 font-bold transition', isFavorite ? 'border-rose-500/35 bg-rose-500/10 text-rose-500' : 'border-[var(--hub-border)] bg-[var(--hub-surface-2)] text-[var(--hub-muted)]')}><Heart size={18} className={isFavorite ? 'fill-current' : ''} />{isFavorite ? 'Nos favoritos' : 'Adicionar aos favoritos'}</button></Field>
          </div>
          <Field label="Atualizações">
            <button onClick={() => setIsTrackedRelease((value) => !value)} className={cn('flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 text-left font-bold transition', isTrackedRelease ? 'border-[var(--hub-brand)] bg-[var(--hub-brand-soft)] text-[var(--hub-text-strong)]' : 'border-[var(--hub-border)] bg-[var(--hub-surface-2)] text-[var(--hub-muted)]')}><BellRing size={18}/><span><span className="block">{isTrackedRelease ? 'Acompanhando atualizações' : 'Acompanhar esta obra'}</span><small className="block font-normal text-[var(--hub-subtle)]">{releaseKindFor(item.mediaType)} • resumo diário por padrão</small></span></button>
            {isTrackedRelease && <div className="mt-3 grid gap-2 sm:grid-cols-2">{preferencesForMedia(item.mediaType).map((option) => <label key={option.key} className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] px-3 text-sm text-[var(--hub-muted)]"><input type="checkbox" checked={releasePreferences[option.key]} onChange={(event) => setReleasePreferences((current) => ({ ...current, [option.key]: event.target.checked }))}/><span>{option.label}</span></label>)}</div>}
          </Field>

        </DialogBody>

        <DialogFooter className="justify-between">
          {inLibrary ? <Button variant="ghost" className="text-red-500 hover:bg-red-500/8 hover:text-red-500" onClick={remove}><Trash2 size={17} /> Remover</Button> : <span />}
          <div className="flex gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save}>Salvar alterações</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-2 block text-xs font-black uppercase tracking-[0.11em] text-[var(--hub-subtle)]">{label}</label>{children}</div>;
}
