import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { api } from '@/services/api';
import { SectionPageLayout } from '@/components/section/SectionPageLayout';
import { SectionToolbar } from '@/components/section/SectionToolbar';
import { useTranslation } from '@/hooks/useTranslation';
import { TranslationKey } from '@/lib/translations';

const TV_GENRES: { value: string; labelKey: TranslationKey }[] = [
  { value: '10759', labelKey: 'genre.action_adventure' },
  { value: '16', labelKey: 'genre.animation' },
  { value: '35', labelKey: 'genre.comedy' },
  { value: '80', labelKey: 'genre.crime' },
  { value: '99', labelKey: 'genre.documentary' },
  { value: '18', labelKey: 'genre.drama' },
  { value: '10751', labelKey: 'genre.family' },
  { value: '10762', labelKey: 'genre.kids' },
  { value: '9648', labelKey: 'genre.mystery' },
  { value: '10763', labelKey: 'genre.news' },
  { value: '10764', labelKey: 'genre.reality' },
  { value: '10765', labelKey: 'genre.sci_fi_fantasy' },
  { value: '10766', labelKey: 'genre.soap' },
  { value: '10767', labelKey: 'genre.talk' },
  { value: '10768', labelKey: 'genre.war_politics' },
  { value: '37', labelKey: 'genre.western' }
];

const SORT_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: 'popularity.desc', labelKey: 'sort.popularity.desc' },
  { value: 'vote_average.desc', labelKey: 'sort.vote_average.desc' },
  { value: 'first_air_date.desc', labelKey: 'sort.first_air_date.desc' }
];

export function Series() {
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
    queryKey: ['series-discover', sort, genre, debouncedQuery], 
    queryFn: ({ pageParam = 1 }) => api.discoverTV(pageParam, sort, genre, debouncedQuery),
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

  const tv = data ? data.pages.flat() : [];

  return (
    <SectionPageLayout 
      title={t('section.series.title')}
      subtitle={t('section.series.subtitle')}
      isLoading={isLoading}
      isError={isError}
      error={error as Error}
      items={tv}
      emptyMessage="Nenhuma série encontrada. Verifique sua conexão ou tente outros filtros."
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
        genreOptions={TV_GENRES}
      />
    </SectionPageLayout>
  );
}
