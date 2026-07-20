import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { api } from '@/services/api';
import { SectionPageLayout } from '@/components/section/SectionPageLayout';
import { SectionToolbar } from '@/components/section/SectionToolbar';
import { useTranslation } from '@/hooks/useTranslation';
import { TranslationKey } from '@/lib/translations';
import { Button } from '@/components/ui/Button';
import { RefreshCw } from 'lucide-react';
import { getGamesFromCompanion } from '@/services/companion';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';

const GAME_GENRES: { value: string; labelKey: TranslationKey }[] = [
  { value: 'action', labelKey: 'genre.action' },
  { value: 'adventure', labelKey: 'genre.adventure' },
  { value: 'role-playing-games-rpg', labelKey: 'genre.rpg' },
  { value: 'strategy', labelKey: 'genre.strategy' },
  { value: 'shooter', labelKey: 'genre.shooter' },
  { value: 'sports', labelKey: 'genre.sports' },
  { value: 'racing', labelKey: 'genre.racing' },
  { value: 'fighting', labelKey: 'genre.fighting' }
];

const SORT_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: '-rating', labelKey: 'sort.rating' },
  { value: '-released', labelKey: 'sort.newest' },
  { value: '-added', labelKey: 'sort.popularity' }
];

export function Games() {
  const { t } = useTranslation();
  const { addToLibrary: addStoreMedia } = useStore();
  const [sort, setSort] = useState('-rating');
  const [syncing, setSyncing] = useState(false);

  const handleSyncGames = async () => {
    setSyncing(true);
    try {
      const res = await getGamesFromCompanion();
      if (res.ok && res.games && res.games.length > 0) {
        res.games.forEach((game) => {
          addStoreMedia({
            ...game,
            access: [{
              id: `companion:launch:${game.id}`,
              label: 'Jogar Agora (PC)',
              kind: 'official-link',
              url: game.launchUrl,
              provider: game.platform,
              free: true
            }]
          }, 'completed');
        });
        toast.success(`${res.games.length} jogos locais sincronizados!`);
      } else {
        toast.info("Nenhum jogo local novo encontrado.");
      }
    } catch (err) {
      toast.error("Companion offline ou erro ao sincronizar.");
    } finally {
      setSyncing(false);
    }
  };
  const [genre, setGenre] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { 
    data, 
    isLoading,
    isError,
    error,
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({ 
    queryKey: ['games-discover', sort, genre, debouncedQuery], 
    queryFn: ({ pageParam = 1 }) => api.discoverGames(pageParam, sort, genre, debouncedQuery),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length > 0 ? allPages.length + 1 : undefined;
    }
  });

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const games = data ? data.pages.flat() : [];

  return (
    <SectionPageLayout 
      title={t('section.games.title')}
      subtitle={t('section.games.subtitle')}
      isLoading={isLoading}
      isError={isError}
      error={error as Error}
      items={games}
      emptyMessage="Nenhum jogo encontrado. Tente mudar os filtros ou verifique a conexão com IGDB."
      extraHeaderActions={
        <Button onClick={handleSyncGames} disabled={syncing} className="gap-2 bg-[var(--hub-brand)] hover:bg-[var(--hub-brand-strong)] text-xs font-bold px-3 py-2 rounded-xl">
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Sincronizando..." : "Sincronizar Jogos do PC"}
        </Button>
      }
      footer={
        hasNextPage && (
          <div ref={ref} className="flex justify-center mt-10 py-4">
            {isFetchingNextPage ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 px-4 w-full">
                {Array(5).fill(0).map((_, i) => (
                  <div key={`skeleton-footer-${i}`} className="w-full aspect-[2/3] bg-slate-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : null}
          </div>
        )
      }
    >
      <SectionToolbar
        searchQuery={query}
        onSearchChange={setQuery}
        sortValue={sort}
        onSortChange={setSort}
        sortOptions={SORT_OPTIONS}
        genreValue={genre}
        onGenreChange={setGenre}
        genreOptions={GAME_GENRES}
      />
    </SectionPageLayout>
  );
}
