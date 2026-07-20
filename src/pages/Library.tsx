import { formatProgress, getCompletionPercentage } from '@/utils/formatProgress';
import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { MediaCard } from '@/components/ui/MediaCard';
import { LibraryStatus } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, CheckCircle, PlayCircle, PauseCircle, XCircle, Clock, Film, Tv, Zap, Search, ArrowUpDown, LayoutGrid, List as ListIcon, Star, Filter } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/hooks/useTranslation';
import { SEO } from '@/components/ui/SEO';
import { Link } from 'react-router-dom';

const TABS = [
  { id: 'all', labelKey: 'library.status.all', icon: BookOpen },
  { id: 'planning', labelKey: 'library.status.planning', icon: Clock },
  { id: 'consuming', labelKey: 'library.status.watching', icon: PlayCircle },
  { id: 'completed', labelKey: 'library.status.completed', icon: CheckCircle },
  { id: 'paused', labelKey: 'library.status.paused', icon: PauseCircle },
  { id: 'dropped', labelKey: 'library.status.dropped', icon: XCircle },
];

const MEDIA_FILTERS = [
  { id: 'all', labelKey: 'releases.filter.all' },
  { id: 'movie', labelKey: 'releases.filter.movies', icon: Film },
  { id: 'tv', labelKey: 'releases.filter.tv', icon: Tv },
  { id: 'anime', labelKey: 'releases.filter.anime', icon: Zap },
  { id: 'manga', labelKey: 'releases.filter.manga', icon: BookOpen },
  { id: 'game', labelKey: 'Jogos', icon: PlayCircle },
  { id: 'book', labelKey: 'Livros', icon: BookOpen },
  { id: 'comic', labelKey: 'HQs', icon: BookOpen },
  { id: 'doramas', labelKey: 'Doramas', icon: Tv },
];

export function Library() {
  const { getLibraryItems } = useStore();
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [activeMediaFilter, setActiveMediaFilter] = useState<string>('all');
  const [activeGenreFilter, setActiveGenreFilter] = useState<string>('all');
  const [activeYearFilter, setActiveYearFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'dateAdded' | 'title' | 'rating' | 'releaseDate'>('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const items = getLibraryItems();

  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    items.forEach(item => {
      if (item.media.genres) {
        item.media.genres.forEach(g => genres.add(g));
      }
    });
    return Array.from(genres).sort();
  }, [items]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    items.forEach(item => {
      if (item.media.releaseDate) {
        const year = item.media.releaseDate.split('-')[0];
        if (year) years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [items]);
  
  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter((item) => {
      const statusMatch = activeTab === 'all' || item.status === activeTab;
      const mediaMatch = activeMediaFilter === 'all' || item.media.mediaType === activeMediaFilter;
      
      const genreMatch = activeGenreFilter === 'all' || (item.media.genres && item.media.genres.includes(activeGenreFilter));
      
      const itemYear = item.media.releaseDate ? item.media.releaseDate.split('-')[0] : null;
      const yearMatch = activeYearFilter === 'all' || itemYear === activeYearFilter;

      const searchMatch = item.media.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.media.originalTitle && item.media.originalTitle.toLowerCase().includes(searchQuery.toLowerCase()));
      return statusMatch && mediaMatch && genreMatch && yearMatch && searchMatch;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.media.title.localeCompare(b.media.title);
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'releaseDate':
          const dateA = a.media.releaseDate ? new Date(a.media.releaseDate).getTime() : 0;
          const dateB = b.media.releaseDate ? new Date(b.media.releaseDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'dateAdded':
        default:
          comparison = new Date(a.dateAdded || a.lastUpdated || 0).getTime() - new Date(b.dateAdded || b.lastUpdated || 0).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [items, activeTab, activeMediaFilter, activeGenreFilter, activeYearFilter, searchQuery, sortBy, sortOrder]);

  return (
    <div className="hub-page">
      <SEO 
        title={t('library.title')} 
        description="Gerencie sua biblioteca pessoal de filmes, séries, animes, jogos e livros no Hubora." 
      />
      
      <div className="hub-page-header">
        <div>
          <div className="hub-section-eyebrow"><BookOpen size={14} /> Sua coleção</div>
          <h1 className="hub-page-title">{t('library.title')}</h1>
          <p className="hub-page-subtitle">Organize status, progresso e avaliações sem perder o foco no que você quer continuar.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hub-chip hidden sm:inline-flex">{t('library.items_saved').replace('{count}', items.length.toString())}</span>
          <div className="flex rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface-1)] p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-lg transition",
                viewMode === 'grid' ? "bg-[var(--hub-brand)] text-[#160e04]" : "text-[var(--hub-muted)] hover:bg-[var(--hub-surface-2)] hover:text-[var(--hub-text-strong)]"
              )}
              title={t('library.view.grid')}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-lg transition",
                viewMode === 'list' ? "bg-[var(--hub-brand)] text-[#160e04]" : "text-[var(--hub-muted)] hover:bg-[var(--hub-surface-2)] hover:text-[var(--hub-text-strong)]"
              )}
              title={t('library.view.list')}
            >
              <ListIcon size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="hub-panel space-y-4 p-3 sm:p-4">
        {/* Search and Sort */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[var(--hub-subtle)]" size={19} />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('library.search')}
              className="h-12 rounded-xl pl-11 text-sm"
            />
          </div>
          <div className="flex gap-3">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'dateAdded' | 'title' | 'rating' | 'releaseDate')}
              className="hub-select h-12 min-w-[10rem] rounded-xl text-sm font-bold"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
            >
              <option value="dateAdded" className="bg-slate-900">{t('library.sort.date_added')}</option>
              <option value="title" className="bg-slate-900">{t('library.sort.title')}</option>
              <option value="rating" className="bg-slate-900">{t('library.sort.rating')}</option>
              <option value="releaseDate" className="bg-slate-900">{t('library.sort.release_date')}</option>
            </select>
            <button 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="hub-icon-button h-12 w-12 rounded-xl"
              title={sortOrder === 'asc' ? t('library.sort.asc') : t('library.sort.desc')}
            >
              <ArrowUpDown size={20} className={`transition-transform duration-300 group-hover:text-purple-400 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "hub-icon-button h-12 w-12 rounded-xl",
                showAdvancedFilters && "border-[color-mix(in_srgb,var(--hub-brand)_45%,var(--hub-border))] bg-[var(--hub-brand-soft)] text-[var(--hub-brand)]"
              )}
              title={t('library.filters.advanced')}
            >
              <Filter size={20} className="transition-transform duration-300 group-hover:text-purple-400" />
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "hub-chip min-h-10 shrink-0 px-4",
                activeTab === tab.id && "border-[color-mix(in_srgb,var(--hub-brand)_45%,var(--hub-border))] bg-[var(--hub-brand-soft)] text-[var(--hub-text-strong)]"
              )}
            >
              <tab.icon size={18} className={activeTab === tab.id ? "drop-shadow-md" : ""} />
              {t(tab.labelKey as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 border-t border-[var(--hub-border)] pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--hub-subtle)]">Tipo de conteúdo</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {MEDIA_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveMediaFilter(filter.id)}
                      className={cn(
                        "hub-chip shrink-0 text-[0.7rem]",
                        activeMediaFilter === filter.id && "border-[color-mix(in_srgb,var(--hub-brand)_45%,var(--hub-border))] bg-[var(--hub-brand-soft)] text-[var(--hub-text-strong)]"
                      )}
                    >
                      {filter.icon && <filter.icon size={14} />}
                      {filter.id === 'game' ? 'Jogos' : filter.id === 'book' ? 'Livros' : filter.id === 'comic' ? 'HQs' : filter.id === 'doramas' ? 'Doramas' : t(filter.labelKey as Parameters<typeof t>[0])}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">{t('library.filters.genre')}</label>
                  <select
                    value={activeGenreFilter}
                    onChange={(e) => setActiveGenreFilter(e.target.value)}
                    className="hub-select rounded-xl text-sm"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
                  >
                    <option value="all" className="bg-slate-900">{t('library.filters.all_genres')}</option>
                    {availableGenres.map(genre => (
                      <option key={genre} value={genre} className="bg-slate-900">{genre}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">{t('library.filters.year')}</label>
                  <select
                    value={activeYearFilter}
                    onChange={(e) => setActiveYearFilter(e.target.value)}
                    className="hub-select rounded-xl text-sm"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
                  >
                    <option value="all" className="bg-slate-900">{t('library.filters.all_years')}</option>
                    {availableYears.map(year => (
                      <option key={year} value={year} className="bg-slate-900">{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${activeMediaFilter}-${sortBy}-${sortOrder}-${searchQuery}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="min-h-[400px]"
        >
          {false ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array(12).fill(0).map((_, i) => (
                  <div key={`skeleton-${i}`} className="relative">
                    <MediaCard isLoading={true} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {Array(6).fill(0).map((_, i) => (
                  <div key={`skeleton-list-${i}`} className="flex items-center gap-5 p-4 bg-slate-900/40 border border-white/5 rounded-3xl">
                    <div className="w-20 h-28 md:w-24 md:h-36 flex-shrink-0 rounded-2xl overflow-hidden bg-slate-800 animate-pulse" />
                    <div className="flex-1 min-w-0 py-2 space-y-3">
                      <div className="h-6 bg-slate-800 rounded-md w-3/4 animate-pulse" />
                      <div className="flex gap-3">
                        <div className="h-5 bg-slate-800 rounded-full w-16 animate-pulse" />
                        <div className="h-5 bg-slate-800 rounded-full w-24 animate-pulse" />
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full w-full max-w-md animate-pulse mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : filteredAndSortedItems.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filteredAndSortedItems.map((item) => (
                  <MediaCard key={item.mediaId} item={item.media} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredAndSortedItems.map((item) => (
                  <div key={item.mediaId} className="flex items-center gap-5 p-4 bg-slate-900/40 border border-white/5 rounded-3xl hover:bg-slate-800/60 transition-all duration-300 group hover:shadow-xl hover:border-purple-500/30">
                    <div className="w-20 h-28 md:w-24 md:h-36 flex-shrink-0 rounded-2xl overflow-hidden bg-slate-800 shadow-lg relative">
                      <img 
                        src={item.media.posterPath || '/icons/hubora-512.png'} 
                        alt={item.media.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="flex-1 min-w-0 py-2">
                      <h3 className="text-xl md:text-2xl font-black text-white truncate group-hover:text-purple-400 transition-colors drop-shadow-md">{item.media.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-400">
                        <span className="uppercase text-[10px] font-black tracking-widest px-3 py-1 bg-slate-950/50 rounded-full text-slate-300 border border-white/5">
                          {item.media.mediaType}
                        </span>
                        <span className="flex items-center gap-2 font-bold bg-slate-950/50 px-3 py-1 rounded-full border border-white/5">
                          <span className={cn(
                            "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]",
                            item.status === 'completed' ? "bg-green-400 text-green-400" :
                            item.status === 'consuming' ? "bg-blue-400 text-blue-400" :
                            item.status === 'planning' ? "bg-yellow-400 text-yellow-400" :
                            item.status === 'paused' ? "bg-orange-400 text-orange-400" : "bg-red-400 text-red-400"
                          )} />
                          {t(`library.status.${item.status}` as Parameters<typeof t>[0])}
                        </span>
                      </div>
                      
                      {/* Progress Bar for List View */}
                      <div className="mt-4 flex items-center gap-4 max-w-md">
                        <div className="flex-1 h-2 bg-slate-950/50 rounded-full overflow-hidden border border-white/5 shadow-inner">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full relative shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                            style={{ width: `${getCompletionPercentage(item)}%` }} 
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                          </div>
                        </div>
                        <span className="text-sm text-slate-400 font-black w-12 text-right tracking-wider">
                          {formatProgress(item) || 0}
                        </span>
                      </div>
                    </div>
                    
                    <div className="hidden sm:flex flex-col items-end gap-3 px-6 border-l border-white/5">
                      {item.rating ? (
                        <div className="flex items-center gap-1.5 text-yellow-400 font-black bg-yellow-400/10 px-3 py-1.5 rounded-xl border border-yellow-400/20 shadow-[0_0_15px_rgba(250,204,21,0.1)]">
                          <Star size={16} fill="currentColor" /> {item.rating}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 font-bold px-3 py-1.5 bg-slate-950/50 rounded-xl border border-white/5">{t('library.no_rating')}</div>
                      )}
                      <div className="text-xs text-slate-500 font-medium bg-slate-950/30 px-3 py-1 rounded-lg">
                        {t('library.added_on').replace('{date}', new Date(item.dateAdded).toLocaleDateString(language === 'pt-BR' ? 'pt-BR' : 'en-US'))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="hub-empty-state py-12">
              <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--hub-surface-2)] text-[var(--hub-text-strong)]">
                <BookOpen size={26} />
              </div>
              <h3 className="mb-2 text-xl font-extrabold text-[var(--hub-text-strong)]">{t('library.empty')}</h3>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-[var(--hub-muted)]">
                {t('library.empty.desc')}
              </p>
              <Link to="/discover" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--hub-brand)] px-4 text-sm font-bold text-white">Descobrir algo</Link>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
