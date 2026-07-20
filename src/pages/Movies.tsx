import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { api } from '@/services/api';
import { SectionPageLayout } from '@/components/section/SectionPageLayout';
import { SectionToolbar } from '@/components/section/SectionToolbar';
import { useTranslation } from '@/hooks/useTranslation';
import { TranslationKey } from '@/lib/translations';

const MOVIE_GENRES: { value: string; labelKey: TranslationKey }[] = [
  { value: '28', labelKey: 'genre.action' },
  { value: '12', labelKey: 'genre.adventure' },
  { value: '16', labelKey: 'genre.animation' },
  { value: '35', labelKey: 'genre.comedy' },
  { value: '80', labelKey: 'genre.crime' },
  { value: '99', labelKey: 'genre.documentary' },
  { value: '18', labelKey: 'genre.drama' },
  { value: '10751', labelKey: 'genre.family' },
  { value: '14', labelKey: 'genre.fantasy' },
  { value: '36', labelKey: 'genre.history' },
  { value: '27', labelKey: 'genre.horror' },
  { value: '10402', labelKey: 'genre.music' },
  { value: '9648', labelKey: 'genre.mystery' },
  { value: '10749', labelKey: 'genre.romance' },
  { value: '878', labelKey: 'genre.science_fiction' },
  { value: '10770', labelKey: 'genre.tv_movie' },
  { value: '53', labelKey: 'genre.thriller' },
  { value: '10752', labelKey: 'genre.war' },
  { value: '37', labelKey: 'genre.western' }
];

const SORT_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: 'popularity.desc', labelKey: 'sort.popularity.desc' },
  { value: 'vote_average.desc', labelKey: 'sort.vote_average.desc' },
  { value: 'primary_release_date.desc', labelKey: 'sort.primary_release_date.desc' }
];

export function Movies() {
  const { t } = useTranslation();
  const [sort, setSort] = useState('popularity.desc');
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
    queryKey: ['movies-discover', sort, genre, debouncedQuery], 
    queryFn: ({ pageParam = 1 }) => api.discoverMovies(pageParam, sort, genre, debouncedQuery),
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

  const movies = data ? data.pages.flat() : [];

  return (
    <SectionPageLayout 
      title={t('section.movies.title')}
      subtitle={t('section.movies.subtitle')}
      isLoading={isLoading}
      isError={isError}
      error={error as Error}
      items={movies}
      emptyMessage="Nenhum filme encontrado. Verifique sua conexão ou tente outros filtros."
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
        genreOptions={MOVIE_GENRES}
      />
    </SectionPageLayout>
  );
}
