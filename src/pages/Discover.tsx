import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookOpen,
  Clapperboard,
  Dices,
  Filter,
  Gamepad2,
  Layers3,
  PanelsTopLeft,
  Search,
  Sparkles,
  Tv,
  Zap,
} from 'lucide-react';
import { api } from '@/services/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { MediaCard } from '@/components/ui/MediaCard';
import { MediaItem } from '@/types';
import { SceneSearch } from '@/components/discover/SceneSearch';
import { VibeSearch } from '@/components/discover/VibeSearch';
import { SEO } from '@/components/ui/SEO';
import { classifySearch } from '@/services/discovery';
import { cn } from '@/lib/utils';

type Tab = 'quick' | 'scene' | 'vibe';
type FilterType = 'all' | MediaItem['mediaType'];

const TABS = [
  { id: 'quick' as const, label: 'Buscar', description: 'Sei o nome ou gênero', icon: Search },
  { id: 'scene' as const, label: 'Lembro de uma cena', description: 'Tenho apenas algumas pistas', icon: Clapperboard },
  { id: 'vibe' as const, label: 'Quero uma sugestão', description: 'Escolher pelo clima e tempo', icon: Sparkles },
];

const FILTERS: Array<{ id: FilterType; label: string; icon: React.ElementType }> = [
  { id: 'all', label: 'Tudo', icon: Filter },
  { id: 'movie', label: 'Filmes', icon: Clapperboard },
  { id: 'tv', label: 'Séries', icon: Tv },
  { id: 'anime', label: 'Animes', icon: Zap },
  { id: 'manga', label: 'Mangás', icon: Layers3 },
  { id: 'comic', label: 'Quadrinhos', icon: PanelsTopLeft },
  { id: 'book', label: 'Livros', icon: BookOpen },
  { id: 'game', label: 'Jogos', icon: Gamepad2 },
];

const SURPRISE_QUERIES = ['mistério', 'aventura espacial', 'fantasia épica', 'drama histórico', 'ficção científica', 'suspense'];

export function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const initialQuery = searchParams.get('q') || '';
  const initialScene = searchParams.get('scene');
  const initialVibe = searchParams.get('vibe');
  const [activeTab, setActiveTab] = useState<Tab>(initialScene ? 'scene' : initialVibe ? 'vibe' : 'quick');
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    if (searchParams.get('focus') === 'search') window.setTimeout(() => searchInputRef.current?.focus(), 80);
  }, [searchParams]);

  useEffect(() => {
    if (initialQuery && initialQuery !== submittedQuery) {
      setQuery(initialQuery);
      setSubmittedQuery(initialQuery);
      setActiveTab('quick');
      setFilterType('all');
    }
  }, [initialQuery, submittedQuery]);

  const handleUnifiedSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsRouting(true);
    const category = classifySearch(trimmed);
    if (category === 'clue') {
      setActiveTab('scene');
      setSearchParams({ scene: trimmed });
    } else if (category === 'vibe') {
      setActiveTab('vibe');
      setSearchParams({ vibe: trimmed });
    } else {
      setActiveTab('quick');
      setSubmittedQuery(trimmed);
      setSearchParams({ q: trimmed });
    }
    setIsRouting(false);
  };

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['search', submittedQuery],
    queryFn: ({ pageParam = 1 }) => api.searchMulti(submittedQuery, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => lastPage.length > 0 ? allPages.length + 1 : undefined,
    enabled: Boolean(submittedQuery),
  });

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const results = useMemo(() => {
    const items = data?.pages.flat() || [];
    return Array.from(new Map(items.map((item) => [`${item.mediaType}-${item.id}`, item])).values());
  }, [data]);

  const filteredResults = filterType === 'all' ? results : results.filter((item) => item.mediaType === filterType);

  const surprise = () => {
    const randomQuery = SURPRISE_QUERIES[Math.floor(Math.random() * SURPRISE_QUERIES.length)];
    setQuery(randomQuery);
    setSubmittedQuery(randomQuery);
    setActiveTab('quick');
    setFilterType('all');
    setSearchParams({ q: randomQuery });
  };

  return (
    <div className="hub-page mx-auto w-full max-w-[92rem]">
      <SEO title="Descobrir" description="Encontre novas obras por título, pistas ou preferências explicáveis." />

      <header className="hub-page-header items-start">
        <div>
          <div className="hub-section-eyebrow"><CompassMark /> Tudo em uma busca</div>
          <h1 className="hub-page-title">Descobrir</h1>
          <p className="hub-page-subtitle">Busque um título ou diga apenas o que lembra. Resultados de filmes e séries priorizam português e disponibilidade no Brasil.</p>
        </div>
        <Button variant="outline" onClick={surprise} className="shrink-0"><Dices size={18} /> Surpreenda-me</Button>
      </header>

      <section className="hub-discover-shell">
        <form onSubmit={handleUnifiedSearch} className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[var(--hub-subtle)]" size={21} />
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busque um título ou descreva o que procura..."
            className="h-14 rounded-2xl pl-12 pr-28 text-base sm:h-16 sm:pr-36 sm:text-lg"
            disabled={isRouting}
          />
          <Button type="submit" className="absolute bottom-2 right-2 top-2 rounded-xl px-4 sm:px-6" disabled={isRouting || !query.trim()}>
            {isRouting ? 'Organizando...' : 'Buscar'}
          </Button>
        </form>

        <div className="hub-discover-tabs" role="tablist" aria-label="Modos de descoberta">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                className={cn('hub-discover-tab', active && 'is-active')}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="hub-discover-tab-icon"><tab.icon size={18} /></span>
                <span className="min-w-0 text-left">
                  <strong className="block truncate">{tab.label}</strong>
                  <small className="hidden truncate text-[0.68rem] font-medium text-[var(--hub-muted)] sm:block">{tab.description}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <AnimatePresence mode="wait">
        {activeTab === 'quick' && (
          <motion.section key="quick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
            {submittedQuery && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="hub-section-title">Resultados para “{submittedQuery}”</h2>
                  <p className="hub-section-description">Use um filtro apenas quando precisar reduzir a lista.</p>
                </div>
                <div className="flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="Filtrar tipo de mídia">
                  {FILTERS.map(({ id, label, icon: Icon }) => (
                    <button key={id} className="hub-chip shrink-0" data-active={filterType === id} onClick={() => setFilterType(id)}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 12 }).map((_, index) => <MediaCard key={index} isLoading />)}
              </div>
            ) : filteredResults.length ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                  {filteredResults.map((item) => <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />)}
                </div>
                <div ref={ref} className="flex min-h-16 items-center justify-center text-sm text-[var(--hub-muted)]">
                  {isFetchingNextPage ? 'Carregando mais resultados...' : hasNextPage ? 'Role para carregar mais' : 'Fim dos resultados'}
                </div>
              </>
            ) : submittedQuery ? (
              <div className="hub-empty-state">
                <div>
                  <Search className="mx-auto mb-3 text-[var(--hub-brand)]" size={28} />
                  <p className="font-bold text-[var(--hub-text-strong)]">Nenhum resultado encontrado</p>
                  <p className="mt-1 text-sm">Tente um nome mais curto, outro idioma ou o modo “Por pistas”.</p>
                </div>
              </div>
            ) : (
              <div className="hub-empty-state min-h-[20rem]">
                <div className="max-w-lg">
                  <Sparkles className="mx-auto mb-4 text-[var(--hub-brand)]" size={34} />
                  <p className="text-lg font-extrabold text-[var(--hub-text-strong)]">Comece com o que você sabe</p>
                  <p className="mt-2 text-sm leading-relaxed">Um título exato funciona aqui. Para uma lembrança incompleta, use “Por pistas”. Para clima, duração ou restrições, use “Por experiência”.</p>
                </div>
              </div>
            )}
          </motion.section>
        )}

        {activeTab === 'scene' && (
          <motion.div key="scene" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <SceneSearch />
          </motion.div>
        )}

        {activeTab === 'vibe' && (
          <motion.div key="vibe" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <VibeSearch />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CompassMark() {
  return <Sparkles size={14} aria-hidden="true" />;
}
