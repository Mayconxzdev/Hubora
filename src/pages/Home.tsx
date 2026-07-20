import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Clapperboard,
  Compass,
  Dice5,
  Drama,
  Gamepad2,
  Headphones,
  Layers3,
  Library,
  PanelsTopLeft,
  Play,
  PlayCircle,
  Server,
  ScrollText,
  Sparkles,
  Tv,
  Zap,
} from 'lucide-react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/Button';
import type { MediaItem } from '@/types';
import { useStore } from '@/store/useStore';
import { SEO } from '@/components/ui/SEO';
import { ContentRail } from '@/components/home/ContentRail';
import { ContinueCard } from '@/components/home/ContinueCard';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { label: 'Filmes', path: '/movies', icon: Clapperboard, tone: 'orange' },
  { label: 'Séries', path: '/series', icon: Tv, tone: 'blue' },
  { label: 'Animes', path: '/anime', icon: Zap, tone: 'violet' },
  { label: 'Mangás', path: '/manga', icon: Layers3, tone: 'green' },
  { label: 'Doramas', path: '/doramas', icon: Drama, tone: 'pink' },
  { label: 'Livros', path: '/books', icon: BookOpen, tone: 'yellow' },
  { label: 'Quadrinhos', path: '/comics', icon: PanelsTopLeft, tone: 'cyan' },
  { label: 'Jogos', path: '/games', icon: Gamepad2, tone: 'indigo' },
  { label: 'Novels', path: '/providers?category=novels', icon: ScrollText, tone: 'pink' },
  { label: 'Audiolivros', path: '/providers?category=audiobooks', icon: Headphones, tone: 'yellow' },
] as const;

type DecisionMode = 'continue' | 'short' | 'discover' | 'surprise';

const DECISIONS = [
  { id: 'continue', label: 'Quero continuar', description: 'Retomar exatamente de onde parei', icon: PlayCircle },
  { id: 'short', label: 'Tenho pouco tempo', description: 'Algo rápido e marcante', icon: Clock3 },
  { id: 'discover', label: 'Quero descobrir', description: 'Uma história fora da minha lista', icon: Compass },
  { id: 'surprise', label: 'Me surpreenda', description: 'Escolha uma boa opção por mim', icon: Dice5 },
] as const;

function itemKey(item: MediaItem) {
  return `${item.source || 'unknown'}:${item.mediaType}:${item.sourceId || item.id}`;
}

function shortScore(item: MediaItem) {
  if (item.mediaType === 'movie') return item.runtime && item.runtime <= 115 ? 0 : 4;
  if (item.mediaType === 'tv' || item.mediaType === 'anime') return 1;
  if (item.mediaType === 'comic' || item.mediaType === 'manga') return 2;
  if (item.mediaType === 'game') return 3;
  return item.pages && item.pages <= 250 ? 2 : 4;
}

function reasonFor(mode: DecisionMode, item: MediaItem, continuing: boolean) {
  if (mode === 'continue' && continuing) return 'Você já começou esta obra. É o caminho mais curto entre abrir o Hubora e voltar para a história.';
  if (mode === 'short') {
    if (item.mediaType === 'tv' || item.mediaType === 'anime') return 'Um episódio cabe melhor numa janela curta e mantém seu progresso fácil de retomar.';
    if (item.runtime) return `A duração de aproximadamente ${item.runtime} minutos combina melhor com o tempo que você tem agora.`;
    return 'É uma opção direta, com progresso simples de salvar e continuar depois.';
  }
  if (mode === 'discover') return 'Ainda não está na sua biblioteca e aparece bem avaliada entre as fontes conectadas.';
  return 'Mistura popularidade, variedade de mídia e o que já existe na sua biblioteca sem criar outra lista infinita.';
}

export function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<DecisionMode>('surprise');
  const [shuffle, setShuffle] = useState(0);
  const { library: libraryById, user } = useStore();
  const library = useMemo(() => Object.values(libraryById), [libraryById]);
  const continueItems = useMemo(() => library.filter((item) => item.status === 'consuming').sort((a, b) => b.lastInteractedAt - a.lastInteractedAt), [library]);
  const planningItems = useMemo(() => library.filter((item) => item.status === 'planning').sort((a, b) => b.lastInteractedAt - a.lastInteractedAt), [library]);

  const { data: feed = [], isLoading } = useQuery({
    queryKey: ['home-universal-feed'],
    queryFn: api.getTrending,
    staleTime: 1000 * 60 * 25,
  });

  const libraryKeys = useMemo(() => new Set(library.map((entry) => itemKey(entry.media))), [library]);
  const candidates = useMemo(() => {
    if (mode === 'continue' && continueItems.length) return continueItems.map((entry) => entry.media);
    if (mode === 'continue' && planningItems.length) return planningItems.map((entry) => entry.media);
    
    if (mode === 'short') {
      const localShorts = library
        .filter((entry) => entry.status === 'consuming' || entry.status === 'planning')
        .map((entry) => entry.media)
        .filter((m) => ['anime', 'manga', 'comic', 'book'].includes(m.mediaType) || (m.runtime && m.runtime <= 45));
      
      const feedShorts = [...feed].filter((m) => ['anime', 'manga', 'comic'].includes(m.mediaType) || (m.runtime && m.runtime <= 110));
      
      const combined = [...localShorts, ...feedShorts];
      return combined.sort((a, b) => shortScore(a) - shortScore(b));
    }
    
    if (mode === 'discover') return feed.filter((item) => !libraryKeys.has(itemKey(item)));
    
    // surprise / Escolha por mim personalizada localmente
    const favs = new Set(user?.preferences?.favoriteGenres?.map(g => g.toLowerCase()) || []);
    const dislikes = new Set(user?.preferences?.dislikedGenres?.map(g => g.toLowerCase()) || []);
    
    const scored = feed.map((item) => {
      let score = item.voteAverage || 7.0;
      const itemGenres = item.genres?.map(g => g.toLowerCase()) || [];
      if (itemGenres.some(g => favs.has(g))) score += 2.0;
      if (itemGenres.some(g => dislikes.has(g))) score -= 5.0;
      return { item, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.item);
  }, [continueItems, feed, libraryKeys, mode, planningItems, library, user]);

  const decisionItem = candidates.length ? candidates[shuffle % Math.min(candidates.length, 12)] : feed[0];
  const continuing = Boolean(decisionItem && continueItems.some((entry) => itemKey(entry.media) === itemKey(decisionItem)));
  const decision = DECISIONS.find((item) => item.id === mode) || DECISIONS[3];
  const background = decisionItem?.backdropPath || decisionItem?.posterPath;

  const chooseMode = (next: DecisionMode) => {
    setMode(next);
    setShuffle(0);
  };

  const openDecision = () => {
    if (!decisionItem) { navigate('/discover'); return; }
    navigate(`/details/${decisionItem.id}`, { state: { media: decisionItem } });
  };

  return (
    <div className="hub-page hub-home-page hub-home-v9">
      <SEO title="Início" description="Escolha o que combina com seu momento e encontre a melhor fonte para consumir." />

      {/* Cinematic Blur Background Wrapper */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center scale-110 blur-[120px] opacity-15 transition-all duration-700"
          style={background ? { backgroundImage: `url("${background}")` } : undefined}
        />
        <div className="absolute inset-0 bg-slate-950/60" />
      </div>

      <div className="relative z-10 space-y-12">
        {/* Título Centralizado do Assistente Pessoal (Visual D) */}
        <section className="text-center py-6 max-w-2xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--hub-brand-soft)] text-[var(--hub-brand)] text-xs font-bold tracking-wide uppercase">
            <Sparkles size={12} /> Hubora Assistant
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
            O que combina com você agora? ✨
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            Me conte seu momento que eu escolho algo perfeito para você.
          </p>
        </section>

        {/* Grid de Modos de Decisão (Visual D) */}
        <section className="hub-decision-modes" aria-label="Escolher o momento">
          {DECISIONS.map((item) => (
            <button 
              key={item.id} 
              className={cn("transition-all duration-300", mode === item.id ? 'is-active' : '')} 
              onClick={() => chooseMode(item.id)} 
              aria-pressed={mode === item.id}
            >
              <span><item.icon size={20} /></span>
              <div>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </div>
            </button>
          ))}
        </section>

        {/* Painel de Recomendação (Visual D) */}
        <section className="hub-recommendation-panel" aria-live="polite">
          <div className="hub-recommendation-art">
            {decisionItem && (decisionItem.backdropPath || decisionItem.posterPath) ? (
              <img src={decisionItem.backdropPath || decisionItem.posterPath} alt={decisionItem.title} />
            ) : (
              <div className="grid place-items-center h-full text-slate-600 bg-slate-900/20"><Sparkles size={38} /></div>
            )}
          </div>
          <div className="hub-recommendation-copy">
            <span className="hub-recommendation-label">
              <Sparkles size={12} /> Escolha para você
            </span>
            <h2>
              {isLoading && !decisionItem ? 'Comparando opções...' : decisionItem?.title || 'Sua próxima jornada'}
            </h2>
            {decisionItem && (
              <p className="hub-recommendation-meta">
                {decisionItem.mediaType === 'tv' ? 'Série' : decisionItem.mediaType === 'movie' ? 'Filme' : decisionItem.mediaType === 'comic' ? 'Quadrinho' : decisionItem.mediaType === 'book' ? 'Livro' : decisionItem.mediaType === 'game' ? 'Jogo' : decisionItem.mediaType === 'manga' ? 'Mangá' : 'Anime'}
                {decisionItem.releaseDate ? ` • ${decisionItem.releaseDate.slice(0, 4)}` : ''}
                {decisionItem.voteAverage ? ` • ★ ${decisionItem.voteAverage.toFixed(1)}` : ''}
              </p>
            )}
            <div className="hub-recommendation-reason">
              <strong>Por que esta escolha</strong>
              <p>
                {decisionItem ? reasonFor(mode, decisionItem, continuing) : 'O assistente está analisando seu catálogo...'}
              </p>
            </div>
            <div className="hub-recommendation-actions">
              <Button size="lg" onClick={openDecision} disabled={!decisionItem} className="bg-[var(--hub-brand)] hover:bg-[var(--hub-brand-strong)] text-black font-bold">
                <Play size={16} fill="currentColor" className="mr-2" /> {continuing ? 'Continuar agora' : 'Começar agora'}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setShuffle((v) => v + 1)} disabled={candidates.length < 2} className="border-slate-800 text-slate-300 hover:bg-slate-900">
                <Dice5 size={16} className="mr-2" /> Outra sugestão
              </Button>
            </div>
          </div>
        </section>

        {/* Grid de Categorias Diretas (Visual C) */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--hub-muted)]">Escolha por Categoria</h3>
          <nav className="hub-home-category-grid" aria-label="Escolher categoria">
            {CATEGORIES.map((item) => (
              <button key={item.path} data-tone={item.tone} onClick={() => navigate(item.path)}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </section>

        {/* Fila "Sua jornada" (mídias em andamento) */}
        {continueItems.length > 0 && (
          <section className="hub-section space-y-4">
            <div className="hub-section-heading flex justify-between items-end">
              <div>
                <div className="hub-section-eyebrow text-xs uppercase font-bold text-[var(--hub-muted)] mb-1 flex items-center gap-1.5">
                  <Library size={13} /> Sua jornada
                </div>
                <h2 className="hub-section-title text-xl font-extrabold text-white">Continuar de onde parou</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/library?status=consuming')} className="text-xs font-bold hover:bg-white/5">
                Ver tudo <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
            <div className="grid auto-cols-[min(88vw,22rem)] grid-flow-col gap-4 overflow-x-auto pb-4 scrollbar-hide sm:auto-cols-[20rem] lg:auto-cols-[22rem]">
              {continueItems.slice(0, 8).map((entry) => <ContinueCard key={entry.id} entry={entry} />)}
            </div>
          </section>
        )}

        {/* Rail de Recomendações da Semana */}
        <ContentRail 
          title="Descobertas da semana" 
          eyebrow="Todo o seu universo" 
          description="Filmes, séries, animes, mangás, livros, quadrinhos e jogos intercalados." 
          icon={Sparkles} 
          items={feed.slice(1)} 
          loading={isLoading} 
          href="/discover" 
          emptyText="O catálogo não respondeu agora. Sua biblioteca e progresso continuam disponíveis offline." 
        />

        <section className="hub-home-tools grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => navigate('/providers')} className="flex items-center gap-4 p-5 rounded-2xl border border-white/5 bg-slate-900/30 hover:bg-slate-900/60 hover:border-white/10 text-left transition">
            <span className="p-3 bg-slate-900 rounded-xl"><Server size={22} className="text-blue-400" /></span>
            <div className="flex-1 min-w-0">
              <strong className="block text-sm text-white font-bold">Fontes e Companion</strong>
              <small className="block text-xs text-slate-400 mt-1 leading-normal">Conecte servidores, debrids, manifestos e veja a saúde do sistema.</small>
            </div>
            <ArrowRight size={18} className="text-slate-500" />
          </button>
          <button onClick={() => navigate('/sources')} className="flex items-center gap-4 p-5 rounded-2xl border border-white/5 bg-slate-900/30 hover:bg-slate-900/60 hover:border-white/10 text-left transition">
            <span className="p-3 bg-slate-900 rounded-xl"><BookOpen size={22} className="text-green-400" /></span>
            <div className="flex-1 min-w-0">
              <strong className="block text-sm text-white font-bold">Ler e assistir grátis</strong>
              <small className="block text-xs text-slate-400 mt-1 leading-normal">Acesso a obras abertas de leitura e catálogo de mídia gratuita.</small>
            </div>
            <ArrowRight size={18} className="text-slate-500" />
          </button>
        </section>
      </div>
    </div>
  );
}
