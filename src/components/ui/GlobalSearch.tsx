import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Clapperboard,
  Flame,
  Gamepad2,
  History,
  Search,
  Sparkles,
  Tv,
  X,
} from 'lucide-react';
import { api } from '@/services/api';
import type { MediaItem, MediaType } from '@/types';
import { cn } from '@/lib/utils';

const RECENT_SEARCHES_KEY = 'hubora_recent_searches';
const MAX_RECENTS = 5;
const RESULTS_PER_CATEGORY = 4;

type CategoryKey = 'movies' | 'series' | 'doramas' | 'anime' | 'manga' | 'novels' | 'books' | 'comics' | 'games';
type CategorizedResults = Record<CategoryKey, MediaItem[]>;

type NavigableResult =
  | { key: string; type: 'item'; item: MediaItem; category: CategoryKey }
  | { key: string; type: 'category'; category: CategoryKey }
  | { key: string; type: 'all' };

const CATEGORY_CONFIG: Array<{
  key: CategoryKey;
  title: string;
  icon: React.ElementType;
  matches: (mediaType: MediaType) => boolean;
}> = [
  { key: 'movies', title: 'Filmes', icon: Clapperboard, matches: (type) => type === 'movie' },
  { key: 'series', title: 'Séries', icon: Tv, matches: (type) => type === 'tv' || type === 'series' },
  { key: 'doramas', title: 'Doramas', icon: Sparkles, matches: (type) => type === 'drama' },
  { key: 'anime', title: 'Animes', icon: Flame, matches: (type) => type === 'anime' },
  { key: 'manga', title: 'Mangás', icon: BookOpen, matches: (type) => type === 'manga' },
  { key: 'novels', title: 'Novels', icon: BookOpen, matches: (type) => type === 'novel' },
  { key: 'books', title: 'Livros', icon: BookOpen, matches: (type) => type === 'book' },
  { key: 'comics', title: 'Quadrinhos', icon: Sparkles, matches: (type) => type === 'comic' },
  { key: 'games', title: 'Jogos', icon: Gamepad2, matches: (type) => type === 'game' },
];

function emptyCategories(): CategorizedResults {
  return {
    movies: [],
    series: [],
    doramas: [],
    anime: [],
    manga: [],
    novels: [],
    books: [],
    comics: [],
    games: [],
  };
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestSequence = useRef(0);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {
      // Local storage can be unavailable in private/restricted contexts.
    }
  }, []);

  const saveRecentSearch = (searchTerm: string) => {
    const clean = searchTerm.trim();
    if (!clean) return;
    const updated = [
      clean,
      ...recentSearches.filter((entry) => entry.toLocaleLowerCase('pt-BR') !== clean.toLocaleLowerCase('pt-BR')),
    ].slice(0, MAX_RECENTS);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Search still works without persistence.
    }
  };

  const removeRecentSearch = (searchTerm: string) => {
    const updated = recentSearches.filter((entry) => entry !== searchTerm);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore persistence failures.
    }
  };

  useEffect(() => {
    const trimmed = query.trim();
    requestSequence.current += 1;
    const sequence = requestSequence.current;

    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const instant = api.instantLocalSearch(trimmed);
    setResults(instant);
    setIsLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const networkData = await api.searchMulti(trimmed, 1, {
          signal: controller.signal,
          perCategoryLimit: 6,
        });
        if (controller.signal.aborted || sequence !== requestSequence.current) return;
        setResults(networkData.length > 0 ? networkData : instant);
      } catch (error) {
        if (!controller.signal.aborted) console.warn('Busca federada falhou:', error);
      } finally {
        if (!controller.signal.aborted && sequence === requestSequence.current) setIsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const categorized: CategorizedResults = useMemo(() => {
    const grouped = emptyCategories();
    for (const item of results) {
      const config = CATEGORY_CONFIG.find((entry) => entry.matches(item.mediaType));
      if (config && grouped[config.key].length < RESULTS_PER_CATEGORY) grouped[config.key].push(item);
    }
    return grouped;
  }, [results]);

  const navigableItems = useMemo<NavigableResult[]>(() => {
    const entries: NavigableResult[] = [];
    for (const config of CATEGORY_CONFIG) {
      for (const item of categorized[config.key]) {
        entries.push({ key: `item-${config.key}-${item.id}`, type: 'item', item, category: config.key });
      }
      if (categorized[config.key].length > 0) {
        entries.push({ key: `category-${config.key}`, type: 'category', category: config.key });
      }
    }
    if (query.trim().length >= 2 && results.length > 0) entries.push({ key: 'all-results', type: 'all' });
    return entries;
  }, [categorized, query, results.length]);

  useEffect(() => {
    if (selectedIndex >= navigableItems.length) setSelectedIndex(navigableItems.length - 1);
  }, [navigableItems.length, selectedIndex]);

  useEffect(() => {
    const handlePointer = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const submitSearch = (searchTerm: string, category?: CategoryKey) => {
    const clean = searchTerm.trim();
    if (clean.length < 2) return;
    saveRecentSearch(clean);
    setIsOpen(false);
    const params = new URLSearchParams({ q: clean });
    if (category) params.set('category', category);
    navigate(`/discover?${params.toString()}`);
  };

  const selectItem = (item: MediaItem) => {
    saveRecentSearch(item.title);
    setIsOpen(false);
    navigate(`/details/${encodeURIComponent(String(item.id))}`);
  };

  const activateResult = (entry: NavigableResult) => {
    if (entry.type === 'item') selectItem(entry.item);
    else if (entry.type === 'category') submitSearch(query, entry.category);
    else submitSearch(query);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      setIsOpen(true);
      return;
    }
    if (!isOpen || navigableItems.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % navigableItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((current) => (current <= 0 ? navigableItems.length - 1 : current - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setSelectedIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setSelectedIndex(navigableItems.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = navigableItems[selectedIndex];
      if (selected) activateResult(selected);
      else submitSearch(query);
    }
  };

  const activeDescendant = selectedIndex >= 0 ? navigableItems[selectedIndex]?.key : undefined;
  const totalFound = CATEGORY_CONFIG.reduce((sum, config) => sum + categorized[config.key].length, 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch(query);
        }}
        className="hub-global-search"
        role="search"
      >
        <Search size={18} className="text-[var(--hub-muted)]" aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar filmes, séries, doramas, animes, mangás, livros..."
          aria-label="Buscar em todo o Hubora"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={isOpen ? activeDescendant : undefined}
          role="combobox"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setSelectedIndex(-1);
              inputRef.current?.focus();
            }}
            aria-label="Limpar texto da busca"
            className="p-1 text-[var(--hub-muted)] hover:text-white"
          >
            <X size={16} />
          </button>
        ) : (
          <kbd className="hidden lg:inline-flex text-xs px-2 py-0.5 rounded border border-[var(--hub-border)] text-[var(--hub-muted)] bg-[var(--hub-surface-2)]">
            /
          </kbd>
        )}
      </form>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Resultados da busca global"
          className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-2xl border border-[var(--hub-border-strong)] bg-[var(--hub-surface-1)] shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {query.trim().length < 2 && (
            <div className="p-4">
              {recentSearches.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--hub-muted)] mb-2 px-1">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider">
                      <History size={13} /> Pesquisas recentes
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRecentSearches([]);
                        localStorage.removeItem(RECENT_SEARCHES_KEY);
                      }}
                      className="hover:text-white transition-colors"
                    >
                      Limpar histórico
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((recent) => (
                      <span
                        key={recent}
                        className="inline-flex items-center overflow-hidden rounded-full border border-[var(--hub-border)] bg-[var(--hub-surface-2)] text-xs text-[var(--hub-text)]"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setQuery(recent);
                            submitSearch(recent);
                          }}
                          className="px-3 py-1.5 hover:text-white"
                        >
                          {recent}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRecentSearch(recent)}
                          className="px-2 py-1.5 text-[var(--hub-muted)] hover:text-red-400"
                          aria-label={`Remover ${recent} do histórico`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-[var(--hub-muted)]">
                  Digite ao menos 2 caracteres para buscar nas nove categorias.
                </div>
              )}
            </div>
          )}

          {query.trim().length >= 2 && (
            <div className="max-h-[75vh] overflow-y-auto divide-y divide-[var(--hub-border)]">
              <div className="sr-only" aria-live="polite">
                {isLoading ? 'Buscando resultados.' : `${totalFound} resultados visíveis em ${CATEGORY_CONFIG.filter((entry) => categorized[entry.key].length > 0).length} categorias.`}
              </div>

              {isLoading && totalFound === 0 && (
                <div className="flex items-center justify-center gap-3 p-6 text-xs text-[var(--hub-muted)]">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--hub-brand)] border-t-transparent" />
                  <span>Buscando nos catálogos e provedores configurados...</span>
                </div>
              )}

              {!isLoading && totalFound === 0 && (
                <div className="p-6 text-center text-sm text-[var(--hub-muted)]">
                  Nenhum resultado encontrado para &quot;<span className="text-white font-semibold">{query}</span>&quot;.
                  <div className="mt-2 text-xs">Tente o título original, uma grafia alternativa ou outro termo.</div>
                </div>
              )}

              {totalFound > 0 && (
                <>
                  {CATEGORY_CONFIG.map((config) => {
                    const items = categorized[config.key];
                    if (items.length === 0) return null;
                    return (
                      <CategoryGroup
                        key={config.key}
                        category={config.key}
                        title={config.title}
                        icon={config.icon}
                        items={items}
                        selectedKey={activeDescendant}
                        onSelect={selectItem}
                        onSeeAll={() => submitSearch(query, config.key)}
                      />
                    );
                  })}

                  <button
                    id="all-results"
                    role="option"
                    aria-selected={activeDescendant === 'all-results'}
                    type="button"
                    onClick={() => submitSearch(query)}
                    className={cn(
                      'flex w-full items-center justify-between p-3.5 bg-[var(--hub-surface-2)] hover:bg-[var(--hub-brand)] text-xs font-bold text-white transition-colors',
                      activeDescendant === 'all-results' && 'bg-[var(--hub-brand)]',
                    )}
                  >
                    <span>Ver todos os resultados para &quot;{query}&quot;</span>
                    <ArrowRight size={16} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryGroup({
  category,
  title,
  icon: Icon,
  items,
  selectedKey,
  onSelect,
  onSeeAll,
}: {
  category: CategoryKey;
  title: string;
  icon: React.ElementType;
  items: MediaItem[];
  selectedKey?: string;
  onSelect: (item: MediaItem) => void;
  onSeeAll: () => void;
}) {
  const headingId = `search-category-${category}`;
  const categoryOptionId = `category-${category}`;

  return (
    <section role="group" aria-labelledby={headingId} className="p-2.5">
      <div id={headingId} className="flex items-center gap-1.5 px-2 py-1 text-[0.68rem] font-extrabold uppercase tracking-wider text-[var(--hub-brand)]">
        <Icon size={13} aria-hidden="true" />
        <span>{title}</span>
      </div>
      <div className="mt-1 space-y-1">
        {items.map((item) => {
          const optionId = `item-${category}-${item.id}`;
          const selected = selectedKey === optionId;
          return (
            <button
              id={optionId}
              role="option"
              aria-selected={selected}
              type="button"
              key={String(item.id)}
              onClick={() => onSelect(item)}
              className={cn(
                'flex w-full items-center gap-3 p-2 rounded-xl hover:bg-[var(--hub-surface-2)] transition-colors text-left group',
                selected && 'bg-[var(--hub-surface-2)] ring-1 ring-[var(--hub-brand)]',
              )}
            >
              <span className="h-12 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--hub-surface-3)]">
                {item.posterPath ? (
                  <img
                    src={item.posterPath}
                    alt=""
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                ) : (
                  <span className="h-full w-full flex items-center justify-center text-[0.55rem] font-bold text-[var(--hub-muted)]">
                    Sem capa
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-xs font-bold text-white group-hover:text-[var(--hub-brand)] transition-colors">
                  {item.title}
                </strong>
                <span className="flex items-center gap-2 mt-0.5 text-[0.7rem] text-[var(--hub-muted)]">
                  {item.releaseDate?.slice(0, 4) && <span>{item.releaseDate.slice(0, 4)}</span>}
                  {item.genres?.[0] && <span className="truncate">{item.genres[0]}</span>}
                </span>
              </span>
              {item.voteAverage ? (
                <span className="text-[0.7rem] font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-400/10">
                  ★ {item.voteAverage.toFixed(1)}
                </span>
              ) : null}
            </button>
          );
        })}

        <button
          id={categoryOptionId}
          role="option"
          aria-selected={selectedKey === categoryOptionId}
          type="button"
          onClick={onSeeAll}
          className={cn(
            'flex w-full items-center justify-between rounded-xl px-2 py-2 text-[0.7rem] font-bold text-[var(--hub-muted)] hover:bg-[var(--hub-surface-2)] hover:text-white',
            selectedKey === categoryOptionId && 'bg-[var(--hub-surface-2)] text-white ring-1 ring-[var(--hub-brand)]',
          )}
        >
          <span>Ver todos em {title}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}
