import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { buildFranchiseOrder, type FranchiseOrder } from '@/services/franchise';
import { api } from '@/services/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, Map, ArrowRight, Film, Tv, BookOpen, CheckCircle, Circle } from 'lucide-react';
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
        } catch (e) {
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
    <div className="relative min-h-screen pb-20">
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
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/80 to-slate-950" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-4xl mx-auto space-y-10 pt-12 px-4">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black text-white flex items-center justify-center gap-4 drop-shadow-2xl tracking-tight">
            <Map className="text-cyan-400" size={40} />
            {t('guide.title')}
          </h1>
          <p className="text-slate-300 text-xl drop-shadow-md max-w-2xl mx-auto">
            {t('guide.subtitle')}
          </p>
        </div>

      <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={24} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('guide.search.placeholder')}
            className="pl-14 h-16 text-xl bg-slate-900/60 backdrop-blur-xl border-white/10 rounded-3xl focus:ring-cyan-500/50 focus:border-cyan-500/50 shadow-2xl transition-all"
          />
          <Button 
            type="submit" 
            className="absolute right-2 top-2 bottom-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-8 text-lg font-bold shadow-lg shadow-cyan-900/50 transition-all hover:scale-105"
          >
            {t('guide.search.btn')}
          </Button>
        </div>
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
            className="px-5 py-2.5 bg-slate-900/50 backdrop-blur-md hover:bg-cyan-900/50 text-slate-300 hover:text-white rounded-full text-sm font-bold transition-all border border-white/10 hover:border-cyan-500/50 shadow-lg hover:shadow-cyan-900/50 hover:-translate-y-0.5"
          >
            {franchise}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-8">
          <div className="bg-slate-900/80 border border-cyan-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/20 to-transparent" />
            <div className="relative z-10">
              <div className="h-10 bg-slate-800 rounded-lg w-1/2 mx-auto mb-4 animate-pulse" />
              <div className="h-4 bg-slate-800 rounded-lg w-3/4 mx-auto mb-6 animate-pulse" />
              <div className="h-4 bg-slate-800 rounded-lg w-2/3 mx-auto mb-10 animate-pulse" />
            </div>
            <div className="relative z-10 space-y-8">
              {Array(5).fill(0).map((_, index) => (
                <div key={`skeleton-${index}`} className={`flex flex-col md:flex-row gap-8 items-center ${index % 2 === 0 ? '' : 'md:flex-row-reverse'}`}>
                  <div className="w-48 shrink-0 relative">
                    <div className="w-full aspect-[2/3] bg-slate-800 rounded-2xl animate-pulse" />
                  </div>
                  <div className="flex-1 w-full">
                    <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700">
                      <div className="h-6 bg-slate-700 rounded-lg w-3/4 mb-4 animate-pulse" />
                      <div className="h-4 bg-slate-700 rounded-lg w-1/4 mb-4 animate-pulse" />
                      <div className="h-4 bg-slate-700 rounded-lg w-full mb-2 animate-pulse" />
                      <div className="h-4 bg-slate-700 rounded-lg w-5/6 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isError && (
        <div className="text-center py-20 text-red-400 bg-red-900/10 rounded-2xl border border-red-900/20">
          <p>{t('guide.error')}</p>
        </div>
      )}

      {franchise && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="bg-slate-900/80 border border-cyan-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/20 to-transparent" />
            <div className="relative z-10">
              <h2 className="text-4xl font-black text-white mb-4 text-center">
                {franchise.franchiseName}
              </h2>
              <p className="text-slate-300 text-center max-w-2xl mx-auto mb-6 leading-relaxed">
                {franchise.description}
              </p>
              
              {/* Progress Bar */}
              <div className="max-w-md mx-auto mb-10">
                <div className="flex justify-between text-sm text-cyan-400 font-medium mb-2">
                  <span>Progresso</span>
                  <span>{checkedItems.size} de {franchise.items.length} ({Math.round((checkedItems.size / franchise.items.length) * 100)}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(checkedItems.size / franchise.items.length) * 100}%` }}
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
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
                  <div className={`w-48 shrink-0 relative ${isNext ? 'ring-4 ring-cyan-500/50 rounded-2xl ring-offset-4 ring-offset-slate-900 animate-pulse' : ''}`}>
                    {isNext && <div className="absolute -top-3 -right-3 bg-cyan-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-full z-10 shadow-lg">PRÓXIMO</div>}
                    <FranchiseItemCard title={item.title} type={item.type as 'movie' | 'tv' | 'anime' | 'manga' | 'special' | 'ova'} searchQuery={item.searchQuery} year={item.year} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 w-full">
                    <div className={`bg-slate-800/80 p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 ${checkedItems.has(item.title) ? 'border-green-500/50 opacity-70' : isNext ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'border-slate-700 hover:border-cyan-500/50'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className={`text-xl font-bold text-white flex items-center gap-2 ${checkedItems.has(item.title) ? 'line-through text-slate-400' : ''}`}>
                            {item.title}
                            <span className="text-xs font-normal text-slate-400 border border-slate-600 px-2 py-1 rounded-full uppercase flex items-center gap-1 no-underline bg-slate-900">
                              {getIcon(item.type)} {item.type}
                            </span>
                          </h3>
                          {item.year && <p className="text-sm text-cyan-400 font-medium mt-1">{item.year}</p>}
                          <p className="text-sm text-slate-300 mt-3 italic leading-relaxed">
                            "{item.reason}"
                          </p>
                        </div>
                        <button 
                          onClick={() => toggleCheck(item.title)}
                          className={`mt-1 shrink-0 transition-colors ${checkedItems.has(item.title) ? 'text-green-500' : 'text-slate-500 hover:text-cyan-400'}`}
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
