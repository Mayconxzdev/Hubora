import { useState } from 'react';
import { Bot, Clock, Play, PlayCircle, Sparkles, Target } from 'lucide-react';
import { Button } from './Button';
import { rankQuickPick } from '@/services/discovery';
import { useStore } from '@/store/useStore';
import { MediaItem } from '@/types';
import { api } from '@/services/api';
import { MediaCard } from './MediaCard';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './Dialog';

 type QuickPickMode = 'watchlist' | 'continue' | 'short_today' | 'surprise_me';

const MODES = [
  { id: 'watchlist', icon: Target, label: 'Da minha lista', description: 'Começar algo já salvo' },
  { id: 'continue', icon: PlayCircle, label: 'Continuar', description: 'Retomar o que comecei' },
  { id: 'short_today', icon: Clock, label: 'Algo rápido', description: 'Para pouco tempo agora' },
  { id: 'surprise_me', icon: Bot, label: 'Surpreenda-me', description: 'Uma boa escolha sem pensar' },
] as const;

export function QuickPickModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<{ main: any; alternatives: any[] } | null>(null);
  const [selectedMode, setSelectedMode] = useState<QuickPickMode | null>(null);
  const getLibraryItems = useStore((state) => state.getLibraryItems);

  const handlePick = async (mode: QuickPickMode) => {
    setSelectedMode(mode);
    setLoading(true);
    try {
      const library = getLibraryItems();
      const watchlist = library.filter((item) => item.status === 'planning');
      const consuming = library.filter((item) => item.status === 'consuming');
      let candidates: MediaItem[] = [];
      if (mode === 'watchlist') candidates = watchlist.map((item) => item.media);
      else if (mode === 'continue') candidates = consuming.map((item) => item.media);
      else candidates = await api.getTrending();
      if (!candidates.length) candidates = await api.getTrending();
      const ranked = rankQuickPick(candidates, mode, library).slice(0, 2);
      if (!ranked.length) throw new Error('Nenhum candidato disponível');
      setRecommendations({
        main: { item: ranked[0].item, reason: ranked[0].reasons.length ? `Escolhi porque ${ranked[0].reasons.join(', ')}.` : 'É a opção mais equilibrada para este momento.' },
        alternatives: ranked.slice(1).map((result) => ({ item: result.item, reason: result.reasons.length ? result.reasons.join(', ') : 'Boa alternativa pelos dados do catálogo.' })),
      });
    } catch (error) {
      console.error('QuickPick indisponível:', error);
      setRecommendations(null);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setRecommendations(null);
    setSelectedMode(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="text-[var(--hub-brand)]" size={22} /> Escolha rápida</DialogTitle>
            <DialogDescription>Diga o momento; o Hubora cruza sua biblioteca e explica a decisão.</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          {!selectedMode && !loading && !recommendations && (
            <div>
              <h3 className="text-2xl font-black tracking-[-0.04em] text-[var(--hub-text-strong)]">O que você precisa agora?</h3>
              <p className="mt-2 text-sm text-[var(--hub-muted)]">Escolha uma situação. O resultado principal vem primeiro e com um motivo curto.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {MODES.map((mode) => (
                  <button key={mode.id} onClick={() => handlePick(mode.id)} className="group flex min-h-28 items-center gap-4 rounded-[1.25rem] border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-4 text-left transition hover:-translate-y-1 hover:border-[var(--hub-border-strong)] hover:bg-[var(--hub-surface-3)]">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] bg-[var(--hub-surface-1)] text-[var(--hub-brand)] shadow-[var(--hub-shadow-sm)] transition group-hover:scale-105"><mode.icon size={22} /></span>
                    <span><strong className="block text-sm font-extrabold text-[var(--hub-text-strong)]">{mode.label}</strong><small className="mt-1 block leading-relaxed text-[var(--hub-muted)]">{mode.description}</small></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="grid min-h-80 place-items-center text-center">
              <div><span className="mx-auto grid h-16 w-16 place-items-center rounded-[1.25rem] bg-[var(--hub-brand-soft)] text-[var(--hub-brand)]"><Sparkles className="animate-pulse" size={30} /></span><h3 className="mt-5 text-2xl font-black text-[var(--hub-text-strong)]">Comparando as melhores opções</h3><p className="mt-2 text-[var(--hub-muted)]">Preferências, duração, progresso e qualidade entram na escolha.</p></div>
            </div>
          )}

          {recommendations && (
            <div className="space-y-7">
              <div className="grid gap-6 rounded-[1.45rem] border border-[color-mix(in_srgb,var(--hub-brand)_28%,var(--hub-border))] bg-[linear-gradient(135deg,var(--hub-brand-soft),var(--hub-surface-1))] p-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
                <MediaCard item={recommendations.main.item} />
                <div><span className="hub-chip" data-active="true"><Sparkles size={13} /> Melhor escolha</span><h3 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--hub-text-strong)]">{recommendations.main.item.title}</h3><p className="mt-3 leading-relaxed text-[var(--hub-muted)]">{recommendations.main.reason}</p><Button className="mt-5" onClick={() => { window.location.href = `/details/${recommendations.main.item.id}`; }}><Play size={17} fill="currentColor" /> Ver detalhes</Button></div>
              </div>

              {recommendations.alternatives.length > 0 && (
                <div><h4 className="mb-4 font-extrabold text-[var(--hub-text-strong)]">Boas alternativas</h4><div className="grid gap-4 sm:grid-cols-2">{recommendations.alternatives.map((alternative, index) => <div key={index} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 rounded-[1.25rem] border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-3"><MediaCard item={alternative.item} /><div className="self-center"><h5 className="font-extrabold text-[var(--hub-text-strong)]">{alternative.item.title}</h5><p className="mt-2 text-xs leading-relaxed text-[var(--hub-muted)]">{alternative.reason}</p></div></div>)}</div></div>
              )}

              <div className="flex justify-center"><Button variant="outline" onClick={reset}>Escolher outro momento</Button></div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
