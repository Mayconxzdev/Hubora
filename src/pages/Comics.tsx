import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { api } from '@/services/api';
import { SectionPageLayout } from '@/components/section/SectionPageLayout';
import { SectionToolbar } from '@/components/section/SectionToolbar';
import { useTranslation } from '@/hooks/useTranslation';
import { TranslationKey } from '@/lib/translations';
import { BookOpen } from 'lucide-react';

const COMIC_GENRES: { value: string; labelKey: TranslationKey }[] = [
  { value: 'marvel', labelKey: 'genre.marvel' },
  { value: 'dc', labelKey: 'genre.dc_comics' },
  { value: 'manga', labelKey: 'genre.manga' },
  { value: 'graphic novel', labelKey: 'genre.graphic_novel' },
  { value: 'action', labelKey: 'genre.action' },
  { value: 'fantasy', labelKey: 'genre.fantasy' },
  { value: 'sci-fi', labelKey: 'genre.sci_fi' },
  { value: 'horror', labelKey: 'genre.horror' }
];

const SORT_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: 'relevance', labelKey: 'sort.relevance' },
  { value: 'newest', labelKey: 'sort.newest' }
];

export function Comics() {
  const { t } = useTranslation();
  const [sort, setSort] = useState('relevance');
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
    queryKey: ['comics-discover', sort, genre, debouncedQuery], 
    queryFn: ({ pageParam = 1 }) => api.discoverComics(pageParam, sort, genre, debouncedQuery),
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

  const comics = data ? data.pages.flat() : [];

  return (
    <SectionPageLayout 
      title={t('section.comics.title')}
      subtitle={t('section.comics.subtitle')}
      isLoading={isLoading}
      isError={isError}
      error={error as Error}
      items={comics}
      emptyMessage={
        <div className="flex flex-col items-center justify-center py-10">
          <BookOpen size={48} className="text-slate-600 mb-4" />
          <p className="text-xl font-bold text-slate-300 mb-2">Não encontramos quadrinhos/HQs</p>
          <p className="text-sm text-slate-500 max-w-md text-center">
            A fonte de dados pode estar indisponível ou limitada com seus filtros atuais. Tente buscar pelo título específico.
          </p>
        </div>
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
        genreOptions={COMIC_GENRES}
      />
    </SectionPageLayout>
  );
}

