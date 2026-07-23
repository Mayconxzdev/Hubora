import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { api } from '@/services/api';
import { SectionPageLayout } from '@/components/section/SectionPageLayout';
import { SectionToolbar } from '@/components/section/SectionToolbar';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { TranslationKey } from '@/lib/translations';

const GAME_GENRES: { value: string; labelKey: TranslationKey }[] = [
  { value: 'action', labelKey: 'genre.action' },
  { value: 'adventure', labelKey: 'genre.adventure' },
  { value: 'role-playing-games-rpg', labelKey: 'genre.rpg' },
  { value: 'strategy', labelKey: 'genre.strategy' },
  { value: 'shooter', labelKey: 'genre.shooter' },
  { value: 'sports', labelKey: 'genre.sports' },
  { value: 'racing', labelKey: 'genre.racing' },
  { value: 'fighting', labelKey: 'genre.fighting' },
];

const SORT_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: '-rating', labelKey: 'sort.rating' },
  { value: '-released', labelKey: 'sort.newest' },
  { value: '-added', labelKey: 'sort.popularity' },
];

export function Games() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sort, setSort] = useState('-rating');
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
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['games-discover', sort, genre, debouncedQuery],
    queryFn: ({ pageParam = 1 }) => api.discoverGames(pageParam, sort, genre, debouncedQuery),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length > 0 ? allPages.length + 1 : undefined;
    },
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
      emptyMessage="Nenhum jogo encontrado. Tente mudar os filtros ou busque pelo nome da obra."
      extraHeaderActions={
        <Button
          variant="outline"
          className="gap-2 border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 rounded-xl"
          onClick={() => navigate('/sources?q=jogo')}
        >
          <Gamepad2 size={16} />
          <span>Gestão Manual & Lojas</span>
        </Button>
      }
      footer={
        hasNextPage && (
          <div ref={ref} className="flex justify-center mt-10 py-4">
            {isFetchingNextPage ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 px-4 w-full">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
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
