import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { api } from '@/services/api';
import { SectionPageLayout } from '@/components/section/SectionPageLayout';
import { SectionToolbar } from '@/components/section/SectionToolbar';
import { useTranslation } from '@/hooks/useTranslation';
import { TranslationKey } from '@/lib/translations';

const DORAMA_GENRES: { value: string; labelKey: TranslationKey }[] = [
  { value: '18', labelKey: 'genre.drama' },
  { value: '35', labelKey: 'genre.comedy' },
  { value: '10759', labelKey: 'genre.action_adventure' },
  { value: '9648', labelKey: 'genre.mystery' },
  { value: '10765', labelKey: 'genre.fantasy' },
  { value: '80', labelKey: 'genre.crime' },
  { value: '10751', labelKey: 'genre.family' },
  { value: '10766', labelKey: 'genre.soap' }
];

const SORT_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: 'popularity.desc', labelKey: 'sort.popularity.desc' },
  { value: 'vote_average.desc', labelKey: 'sort.vote_average.desc' },
  { value: 'first_air_date.desc', labelKey: 'sort.first_air_date.desc' }
];

export function Doramas() {
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
    queryKey: ['doramas-discover', sort, genre, debouncedQuery], 
    queryFn: ({ pageParam = 1 }) => api.discoverDoramas(pageParam, sort, genre, debouncedQuery),
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

  const doramas = data ? data.pages.flat() : [];

  return (
    <SectionPageLayout 
      title={t('section.doramas.title')}
      subtitle={t('section.doramas.subtitle')}
      isLoading={isLoading}
      isError={isError}
      error={error as Error}
      items={doramas}
      emptyMessage="Nenhum dorama encontrado. Verifique sua conexão com TMDB ou tente outros filtros."
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
        genreOptions={DORAMA_GENRES}
      />
    </SectionPageLayout>
  );
}
