import { useMemo, useState } from 'react';
import { ArrowRight, Clock3, Dices, LoaderCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { api } from '@/services/api';
import { parseDiscoveryIntent, rankCandidates, type RankedRecommendation } from '@/services/discovery';
import { pickFromBacklog } from '@/services/roulette';
import { useStore } from '@/store/useStore';
import type { MediaType } from '@/types';

const TYPE_OPTIONS: Array<{ id: 'any' | MediaType; label: string }> = [
  { id: 'any', label: 'Qualquer mídia' }, { id: 'movie', label: 'Filme' }, { id: 'tv', label: 'Série/Dorama' }, { id: 'anime', label: 'Anime' },
  { id: 'manga', label: 'Mangá' }, { id: 'comic', label: 'Quadrinho' }, { id: 'book', label: 'Livro' }, { id: 'game', label: 'Jogo' },
];
const MOODS = [
  { id: 'comfort', label: 'Confortável', query: 'confortável leve' },
  { id: 'intense', label: 'Intenso', query: 'intenso emocionante' },
  { id: 'focused', label: 'Quero focar', query: 'complexo envolvente' },
  { id: 'surprise', label: 'Surpreenda', query: 'bem avaliado interessante' },
] as const;

export function ChoiceForToday() {
  const navigate = useNavigate();
  const libraryById = useStore((state) => state.library);
  const library = useMemo(() => Object.values(libraryById), [libraryById]);
  const user = useStore((state) => state.user);
  const [minutes, setMinutes] = useState(90);
  const [mediaType, setMediaType] = useState<'any' | MediaType>('any');
  const [mood, setMood] = useState<(typeof MOODS)[number]['id']>('surprise');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RankedRecommendation[]>([]);
  const backlog = useMemo(() => pickFromBacklog(library.filter((entry) => mediaType === 'any' || entry.mediaType === mediaType), { minutes, mood, forgottenBoost: true }), [library, minutes, mood, mediaType]);

  const generate = async () => {
    setLoading(true);
    try {
      const moodQuery = MOODS.find((item) => item.id === mood)?.query || '';
      const typeQuery = mediaType === 'any' ? '' : TYPE_OPTIONS.find((item) => item.id === mediaType)?.label || '';
      const favoriteGenres = user?.preferences.favoriteGenres?.slice(0, 3).join(' ') || '';
      const prompt = `${typeQuery} ${moodQuery} duração compatível com ${minutes} minutos ${favoriteGenres}`.trim();
      const settled = await Promise.allSettled([api.getTrending(), api.searchMulti(prompt, 1)]);
      const candidates = Array.from(new Map(
        settled
          .flatMap((result) => result.status === 'fulfilled' ? result.value : [])
          .map((item) => [`${item.mediaType}:${item.source || 'unknown'}:${item.id}`, item]),
      ).values());
      const ranked = rankCandidates(candidates.filter((item) => mediaType === 'any' || item.mediaType === mediaType), parseDiscoveryIntent(prompt), user, library)
        .filter(({ item }) => !library.some((entry) => String(entry.mediaId) === String(item.id) && entry.status === 'completed'))
        .slice(0, 3);
      const output = backlog && !ranked.some((item) => String(item.item.id) === String(backlog.entry.mediaId))
        ? [{ item: backlog.entry.media, score: 96, reasons: backlog.reasons }, ...ranked].slice(0, 3)
        : ranked;
      if (!output.length && backlog) output.push({ item: backlog.entry.media, score: 90, reasons: backlog.reasons });
      if (!output.length) throw new Error('Não encontrei opções suficientes. Adicione itens ao backlog ou tente outra categoria.');
      setRecommendations(output);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível escolher agora.');
    } finally { setLoading(false); }
  };

  const open = (recommendation: RankedRecommendation) => navigate(`/details/${recommendation.item.id}`, { state: { media: recommendation.item } });

  return <section className="hub-panel overflow-hidden p-5 sm:p-7">
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(30rem,1.1fr)] xl:items-start">
      <div><div className="hub-section-eyebrow"><Sparkles size={14}/> Escolha de Hoje + Backlog Roulette</div><h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[var(--hub-text-strong)]">Diga só o necessário.</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--hub-muted)]">Três escolhas rápidas. O Hubora usa sua biblioteca, gostos, itens esquecidos e catálogos para entregar uma opção principal e duas alternativas.</p>
        <div className="mt-5"><p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--hub-subtle)]">1. Quanto tempo?</p><div className="flex flex-wrap gap-2">{[25, 45, 60, 90, 120, 180].map((value) => <button key={value} className={`hub-chip ${minutes === value ? 'border-[var(--hub-brand)] bg-[var(--hub-brand-soft)] text-[var(--hub-text-strong)]' : ''}`} onClick={() => setMinutes(value)}><Clock3 size={14}/> {value} min</button>)}</div></div>
        <div className="mt-4"><p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--hub-subtle)]">2. O que consumir?</p><div className="flex flex-wrap gap-2">{TYPE_OPTIONS.map((item) => <button key={item.id} className={`hub-chip ${mediaType === item.id ? 'border-[var(--hub-brand)] bg-[var(--hub-brand-soft)] text-[var(--hub-text-strong)]' : ''}`} onClick={() => setMediaType(item.id)}>{item.label}</button>)}</div></div>
        <div className="mt-4"><p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--hub-subtle)]">3. Qual clima?</p><div className="flex flex-wrap gap-2">{MOODS.map((item) => <button key={item.id} className={`hub-chip ${mood === item.id ? 'border-[var(--hub-brand)] bg-[var(--hub-brand-soft)] text-[var(--hub-text-strong)]' : ''}`} onClick={() => setMood(item.id)}>{item.label}</button>)}</div></div>
        <Button className="mt-5" size="lg" onClick={() => void generate()} disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={18}/> : <Dices size={18}/>} {loading ? 'Escolhendo...' : 'Escolher para mim'}</Button>
      </div>
      <div className="grid gap-3">{recommendations.length ? recommendations.map((recommendation, index) => <article key={`${recommendation.item.mediaType}:${recommendation.item.id}`} className={`relative overflow-hidden rounded-3xl border p-4 ${index === 0 ? 'border-[var(--hub-brand)] bg-[linear-gradient(135deg,var(--hub-brand-soft),var(--hub-surface-2))]' : 'border-[var(--hub-border)] bg-[var(--hub-surface-2)]'}`}><div className="flex gap-4"><div className="h-32 w-24 shrink-0 overflow-hidden rounded-2xl bg-[var(--hub-surface-3)]">{recommendation.item.posterPath ? <img src={recommendation.item.posterPath} alt="" className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center"><Sparkles/></div>}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[var(--hub-brand)]">{index === 0 ? 'Escolha principal' : `Alternativa ${index}`}</p><span className="rounded-full bg-[var(--hub-surface-3)] px-2 py-1 text-[0.67rem] font-black text-[var(--hub-muted)]">{Math.round(recommendation.score)}%</span></div><h3 className="mt-1 line-clamp-2 text-lg font-black text-[var(--hub-text-strong)]">{recommendation.item.title}</h3><p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[var(--hub-muted)]">{recommendation.reasons.slice(0, 3).join(' • ')}</p><Button className="mt-3" size="sm" variant={index === 0 ? 'default' : 'outline'} onClick={() => open(recommendation)}>Abrir <ArrowRight size={15}/></Button></div></div></article>) : <div className="hub-empty-state min-h-72"><Sparkles className="mx-auto mb-3 text-[var(--hub-brand)]" size={34}/>Sua escolha aparecerá aqui. Itens do backlog ganham prioridade quando combinam com o momento.</div>}</div>
    </div>
  </section>;
}
