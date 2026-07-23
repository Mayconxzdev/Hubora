import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { buildFranchiseOrder, type FranchiseOrder } from '@/services/franchise';
import { api } from '@/services/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, Map, Film, Tv, BookOpen, CheckCircle, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '@/hooks/useTranslation';
import { FranchiseItemCard } from '@/components/guide/FranchiseItemCard';

export function Guide() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const { data: franchise, isLoading, isError } = useQuery<FranchiseOrder | null>({
    queryKey: ['franchise', submittedQuery],
    queryFn: async () => {
      if (!submittedQuery) return null;
      return buildFranchiseOrder(submittedQuery);
    },
    enabled: !!submittedQuery,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Fetch background image based on the first item or franchise name
  const { data: bgImage } = useQuery({
    queryKey: ['franchise-bg', franchise?.franchiseName],
    queryFn: async () => {
      if (!franchise) return null;
      
      // Try to find a backdrop from the first item
      if (franchise.items.length > 0) {
        const firstItem = franchise.items[0];
        const searchResults = await api.searchMulti(firstItem.searchQuery || firstItem.title);
        if (searchResults && searchResults.length > 0) {
          const itemWithBackdrop = searchResults.find(r => r.backdropPath);
          if (itemWithBackdrop) return itemWithBackdrop.backdropPath;
        }
      }
      
      // Fallback: search by franchise name
      const searchResults = await api.searchMulti(franchise.franchiseName);
      if (searchResults && searchResults.length > 0) {
        const itemWithBackdrop = searchResults.find(r => r.backdropPath);
        if (itemWithBackdrop) return itemWithBackdrop.backdropPath;
      }
      
      return null;
    },
    enabled: !!franchise,
    staleTime: 1000 * 60 * 60,
  });

  // Load checked items from local storage when franchise changes
  useEffect(() => {
    if (franchise) {
      const saved = localStorage.getItem(`guide_checked_${franchise.franchiseName}`);
      if (saved) {
        try {
          setCheckedItems(new Set(JSON.parse(saved)));
        } catch {
          setCheckedItems(new Set());
        }
      } else {
        setCheckedItems(new Set());
      }
    }
  }, [franchise]);

  const toggleCheck = (title: string) => {
    if (navigator.vibrate) navigator.vibrate(50);
    const newChecked = new Set(checkedItems);
    if (newChecked.has(title)) {
      newChecked.delete(title);
    } else {
      newChecked.add(title);
    }
    setCheckedItems(newChecked);
    if (franchise) {
      localStorage.setItem(`guide_checked_${franchise.franchiseName}`, JSON.stringify(Array.from(newChecked)));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSubmittedQuery(query);
      setSearchParams({ q: query });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'movie': return <Film size={16} />;
      case 'tv': 
      case 'anime': return <Tv size={16} />;
      case 'manga': return <BookOpen size={16} />;
      default: return <Film size={16} />;
    }
  };

  return (
    <div className="hub-page relative mx-auto w-full max-w-5xl">
      {/* Dynamic Background */}
      <AnimatePresence>
        {bgImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-0 pointer-events-none"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
              style={{ backgroundImage: `url(${bgImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 space-y-10">
        <header className="hub-page-header items-start">
          <div>
            <div className="hub-section-eyebrow"><Map size={14} /> Ordem sugerida</div>
            <h1 className="hub-page-title">{t('guide.title')}</h1>
            <p className="hub-page-subtitle">{t('guide.subtitle')}</p>
          </div>
        </header>

      <form onSubmit={handleSearch} className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[var(--hub-subtle)]" size={21} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('guide.search.placeholder')}
            className="hub-field-with-leading-icon min-h-14 rounded-xl text-base sm:text-lg"
          />
        </div>
        <Button type="submit" size="lg">{t('guide.search.btn')}</Button>
      </form>

      <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
        {['Star Wars', 'Marvel', 'Harry Potter', 'Fate', 'Naruto', 'Monogatari', 'Dragon Ball'].map((franchise) => (
          <button
            key={franchise}
            onClick={() => {
              setQuery(franchise);
              setSubmittedQuery(franchise);
              setSearchParams({ q: franchise });
            }}
            className="min-h-11 rounded-full border border-[var(--hub-border)] bg-[var(--hub-surface-1)] px-5 py-2.5 text-sm font-bold text-[var(--hub-muted)] transition-colors hover:border-[var(--hub-border-strong)] hover:bg-[var(--hub-surface-2)] hover:text-[var(--hub-text-strong)]"
          >
            {franchise}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-8">
          <div className="hub-panel relative overflow-hidden p-6 sm:p-8">
            <div className="relative z-10">
              <div className="mx-auto mb-4 h-10 w-1/2 animate-pulse rounded-lg bg-[var(--hub-surface-3)]" />
              <div className="mx-auto mb-6 h-4 w-3/4 animate-pulse rounded-lg bg-[var(--hub-surface-3)]" />
              <div className="mx-auto mb-10 h-4 w-2/3 animate-pulse rounded-lg bg-[var(--hub-surface-3)]" />
            </div>
            <div className="relative z-10 space-y-8">
              {Array(5).fill(0).map((_, index) => (
                <div key={`skeleton-${index}`} className={`flex flex-col md:flex-row gap-8 items-center ${index % 2 === 0 ? '' : 'md:flex-row-reverse'}`}>
                  <div className="w-48 shrink-0 relative">
                    <div className="aspect-[2/3] w-full animate-pulse rounded-xl bg-[var(--hub-surface-3)]" />
                  </div>
                  <div className="flex-1 w-full">
                    <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-6">
                      <div className="mb-4 h-6 w-3/4 animate-pulse rounded-lg bg-[var(--hub-surface-3)]" />
                      <div className="mb-4 h-4 w-1/4 animate-pulse rounded-lg bg-[var(--hub-surface-3)]" />
                      <div className="mb-2 h-4 w-full animate-pulse rounded-lg bg-[var(--hub-surface-3)]" />
                      <div className="h-4 w-5/6 animate-pulse rounded-lg bg-[var(--hub-surface-3)]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isError && (
        <div role="alert" className="hub-panel border-red-500/25 bg-red-500/8 py-20 text-center text-red-400">
          <p>{t('guide.error')}</p>
        </div>
      )}

      {franchise && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="hub-panel relative overflow-hidden p-6 sm:p-8">
            <div className="relative z-10">
              <h2 className="mb-4 text-center text-3xl font-black tracking-[-0.03em] text-[var(--hub-text-strong)] sm:text-4xl">
                {franchise.franchiseName}
              </h2>
              <p className="mx-auto mb-6 max-w-2xl text-center leading-relaxed text-[var(--hub-muted)]">
                {franchise.description}
              </p>
              
              {/* Progress Bar */}
              <div className="max-w-md mx-auto mb-10">
                <div className="mb-2 flex justify-between text-sm font-medium text-[var(--hub-brand)]">
                  <span>Progresso</span>
                  <span>{checkedItems.size} de {franchise.items.length} ({Math.round((checkedItems.size / franchise.items.length) * 100)}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full border border-[var(--hub-border)] bg-[var(--hub-surface-3)]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(checkedItems.size / franchise.items.length) * 100}%` }}
                    className="h-full rounded-full bg-[var(--hub-brand)]"
                  />
                </div>
              </div>
            </div>

            <div className="relative z-10 space-y-8">
              {franchise.items.map((item, index) => {
                const isNext = !checkedItems.has(item.title) && (index === 0 || checkedItems.has(franchise.items[index - 1].title));
                
                return (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex flex-col md:flex-row gap-8 items-center ${index % 2 === 0 ? '' : 'md:flex-row-reverse'}`}
                >
                  {/* Poster */}
                  <div className={`relative w-48 shrink-0 ${isNext ? 'rounded-xl ring-2 ring-[var(--hub-brand)] ring-offset-4 ring-offset-[var(--hub-bg)]' : ''}`}>
                    {isNext && <div className="absolute -right-3 -top-3 z-10 rounded-full bg-[var(--hub-brand)] px-2 py-1 text-xs font-bold text-[var(--hub-brand-contrast)]">PRÓXIMO</div>}
                    <FranchiseItemCard title={item.title} type={item.type as 'movie' | 'tv' | 'anime' | 'manga' | 'special' | 'ova'} searchQuery={item.searchQuery} year={item.year} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 w-full">
                    <div className={`rounded-xl border bg-[var(--hub-surface-2)] p-6 transition-colors ${checkedItems.has(item.title) ? 'border-[color-mix(in_srgb,var(--hub-success)_48%,var(--hub-border))] opacity-70' : isNext ? 'border-[var(--hub-brand)]' : 'border-[var(--hub-border)] hover:border-[var(--hub-border-strong)]'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className={`flex flex-wrap items-center gap-2 text-xl font-bold text-[var(--hub-text-strong)] ${checkedItems.has(item.title) ? 'line-through text-[var(--hub-muted)]' : ''}`}>
                            {item.title}
                            <span className="flex items-center gap-1 rounded-full border border-[var(--hub-border)] bg-[var(--hub-surface-1)] px-2 py-1 text-xs font-normal uppercase text-[var(--hub-muted)] no-underline">
                              {getIcon(item.type)} {item.type}
                            </span>
                          </h3>
                          {item.year && <p className="mt-1 text-sm font-medium text-[var(--hub-brand)]">{item.year}</p>}
                          <p className="mt-3 text-sm italic leading-relaxed text-[var(--hub-muted)]">
                            "{item.reason}"
                          </p>
                        </div>
                        <button 
                          onClick={() => toggleCheck(item.title)}
                          className={`mt-1 shrink-0 rounded-full transition-colors focus-visible:outline-none ${checkedItems.has(item.title) ? 'text-[var(--hub-success)]' : 'text-[var(--hub-subtle)] hover:text-[var(--hub-brand)]'}`}
                          title={checkedItems.has(item.title) ? t('guide.mark.unseen') : t('guide.mark.seen')}
                        >
                          {checkedItems.has(item.title) ? <CheckCircle size={28} /> : <Circle size={28} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )})}
            </div>
          </div>
        </motion.div>
      )}
      </div>
    </div>
  );
}
