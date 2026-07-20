import { useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink } from 'lucide-react';
import { api } from '@/services/api';
import { SectionPageLayout } from '@/components/section/SectionPageLayout';
import { SectionToolbar } from '@/components/section/SectionToolbar';
import type { TranslationKey } from '@/lib/translations';

const NOVEL_GENRES: { value: string; labelKey: TranslationKey }[] = [
  { value: 'fantasy', labelKey: 'genre.fantasy' },
  { value: 'romance', labelKey: 'genre.romance' },
  { value: 'sci-fi', labelKey: 'genre.sci_fi' },
  { value: 'mystery', labelKey: 'genre.mystery' },
  { value: 'thriller', labelKey: 'genre.thriller' },
];

const SORT_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: 'relevance', labelKey: 'sort.relevance' },
  { value: 'newest', labelKey: 'sort.newest' },
];

export function Novels() {
  const [sort, setSort] = useState('relevance');
  const [genre, setGenre] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['novels-discover', sort, genre, debouncedQuery],
    queryFn: ({ pageParam = 1 }) => api.discoverNovels(pageParam, sort, genre, debouncedQuery),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => lastPage.length > 0 ? pages.length + 1 : undefined,
  });
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage]);

  const novels = data?.pages.flat() || [];

  return (
    <SectionPageLayout
      title="Novels"
      subtitle="Light novels, webnovels e ficção seriada, com acesso conforme a fonte realmente disponibiliza."
      isLoading={isLoading}
      isError={isError}
      error={error as Error}
      items={novels}
      emptyMessage={
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <BookOpen size={48} className="mb-4 text-[var(--hub-subtle)]" />
          <p className="text-xl font-black text-[var(--hub-text-strong)]">Nenhuma novel encontrada</p>
          <p className="mt-2 max-w-md text-sm text-[var(--hub-muted)]">Tente buscar pelo título ou autor. Catálogo não significa que todos os capítulos possam abrir dentro do Hubora.</p>
          <Link to="/providers?category=novels" className="hub-chip mt-5"><ExternalLink size={14} /> Ver fontes de novels</Link>
        </div>
      }
      footer={hasNextPage ? <div ref={ref} className="flex min-h-16 items-center justify-center text-sm text-[var(--hub-muted)]">{isFetchingNextPage ? 'Carregando mais resultados…' : ''}</div> : null}
    >
      <SectionToolbar
        searchQuery={query}
        onSearchChange={setQuery}
        sortValue={sort}
        onSortChange={setSort}
        sortOptions={SORT_OPTIONS}
        genreValue={genre}
        onGenreChange={setGenre}
        genreOptions={NOVEL_GENRES}
      />
      <p className="mt-3 text-xs leading-relaxed text-[var(--hub-subtle)]">Metadados iniciais: Google Books, com fallback Open Library. Leitura interna aparece somente quando o volume declara prévia, EPUB ou PDF disponível; demais plataformas abrem na origem.</p>
    </SectionPageLayout>
  );
}
