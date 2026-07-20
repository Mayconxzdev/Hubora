import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { MediaCard } from '@/components/ui/MediaCard';
import { CalendarDays, Clock, Search } from 'lucide-react';
import { MediaItem } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { differenceInDays, parseISO, isAfter, isSameMonth, isSameDay, isThisWeek } from 'date-fns';
import { Input } from '@/components/ui/Input';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';
import { SEO } from '@/components/ui/SEO';

type FilterType = 'all' | 'movie' | 'tv' | 'anime' | 'manga' | 'game' | 'book' | 'novel' | 'comic';
type SourceFilterType = 'all' | 'cinema' | 'streaming';
type SortType = 'date_asc' | 'date_desc' | 'popularity';
type TimeframeType = 'today' | 'week' | 'month' | 'next30' | 'next90' | 'year' | 'all';

const TIMEFRAMES: Array<{ id: TimeframeType; label: string }> = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mês' },
  { id: 'next30', label: '30 dias' },
  { id: 'next90', label: '3 meses' },
  { id: 'year', label: 'Ano' },
  { id: 'all', label: 'Todos' },
];

const MEDIA_TYPES: Array<{ id: FilterType; label: string }> = [
  { id: 'all', label: 'Todas as mídias' },
  { id: 'movie', label: 'Filmes' },
  { id: 'tv', label: 'Séries' },
  { id: 'anime', label: 'Anime' },
  { id: 'manga', label: 'Mangá' },
  { id: 'game', label: 'Jogos' },
  { id: 'book', label: 'Livros' },
  { id: 'novel', label: 'Novels' },
  { id: 'comic', label: 'Quadrinhos' },
];

export function Releases() {
  const { t, language } = useTranslation();
  const { getLibraryItems } = useStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilterType>('all');
  const [timeframe, setTimeframe] = useState<TimeframeType>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState<SortType>('date_asc');
  const [searchQuery, setSearchQuery] = useState('');
  const years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 1 + index);

  const { data: releases = [], isLoading } = useQuery<MediaItem[]>({
    queryKey: ['upcoming'],
    queryFn: api.getUpcoming,
    staleTime: 1000 * 60 * 30,
  });

  const filteredReleases = useMemo(() => {
    return releases.filter((item) => {
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filter !== 'all' && item.mediaType !== filter) return false;
      if (sourceFilter === 'cinema' && item.mediaType !== 'movie') return false;
      if (sourceFilter === 'streaming' && item.mediaType === 'movie') return false;
      if (!item.releaseDate) return timeframe === 'all';

      const releaseDate = parseISO(item.releaseDate);
      const today = new Date();
      if (timeframe === 'today') return isSameDay(releaseDate, today);
      if (timeframe === 'week') return isThisWeek(releaseDate);
      if (timeframe === 'month') return isSameMonth(releaseDate, today);
      if (timeframe === 'next30') return isAfter(releaseDate, today) && differenceInDays(releaseDate, today) <= 30;
      if (timeframe === 'next90') return isAfter(releaseDate, today) && differenceInDays(releaseDate, today) <= 90;
      if (timeframe === 'year') return releaseDate.getFullYear() === selectedYear;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_asc') return new Date(a.releaseDate || '9999-12-31').getTime() - new Date(b.releaseDate || '9999-12-31').getTime();
      if (sortBy === 'date_desc') return new Date(b.releaseDate || '1000-01-01').getTime() - new Date(a.releaseDate || '1000-01-01').getTime();
      return (b.popularity || 0) - (a.popularity || 0);
    });
  }, [releases, filter, sourceFilter, timeframe, selectedYear, sortBy, searchQuery]);

  const upcomingWatchlist = useMemo(() => getLibraryItems().filter((entry) => {
    if (!['planning', 'consuming'].includes(entry.status) || !entry.media.releaseDate) return false;
    const releaseDate = parseISO(entry.media.releaseDate);
    const today = new Date();
    return isAfter(releaseDate, today) || isSameDay(releaseDate, today);
  }).sort((a, b) => new Date(a.media.releaseDate || '').getTime() - new Date(b.media.releaseDate || '').getTime()), [getLibraryItems]);

  const getCountdownText = (dateString: string) => {
    const releaseDate = parseISO(dateString);
    const days = differenceInDays(releaseDate, new Date());
    if (days === 0) return t('releases.today');
    if (days === 1) return t('releases.tomorrow');
    if (days > 1 && days <= 30) return t('releases.daysLeft', { days });
    return releaseDate.toLocaleDateString(language === 'pt-BR' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="hub-page">
      <SEO title={t('releases.title')} description={t('releases.subtitle')} />

      <header className="hub-page-header items-start">
        <div>
          <div className="hub-section-eyebrow"><CalendarDays size={14} /> Datas reunidas</div>
          <h1 className="hub-page-title">{t('releases.title')}</h1>
          <p className="hub-page-subtitle">{t('releases.subtitle')}</p>
        </div>
      </header>

      {upcomingWatchlist.length > 0 && (
        <section className="hub-section">
          <div className="hub-section-heading">
            <div>
              <div className="hub-section-eyebrow"><Clock size={14} /> Sua biblioteca</div>
              <h2 className="hub-section-title">Estreias que você acompanha</h2>
            </div>
          </div>
          <div className="hub-scroll-rail scrollbar-hide">
            {upcomingWatchlist.map((entry) => (
              <div key={entry.mediaId} className="hub-scroll-item relative">
                <span className="absolute left-2.5 top-2.5 z-10 rounded-full border border-white/14 bg-black/68 px-2.5 py-1 text-[0.65rem] font-black text-white backdrop-blur-xl">{getCountdownText(entry.media.releaseDate || '')}</span>
                <MediaCard item={entry.media} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="hub-panel space-y-3 p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <label className="relative block min-w-0">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hub-subtle)]" size={18} />
            <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t('releases.search')} className="h-12 rounded-xl pl-11" />
          </label>
          <select value={filter} onChange={(event) => setFilter(event.target.value as FilterType)} className="hub-select h-12 rounded-xl" aria-label="Tipo de mídia">
            {MEDIA_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as SourceFilterType)} className="hub-select h-12 rounded-xl" aria-label="Origem do lançamento">
            <option value="all">Todas as origens</option>
            <option value="cinema">Cinema</option>
            <option value="streaming">Streaming e seriados</option>
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortType)} className="hub-select h-12 rounded-xl" aria-label="Ordenação">
            <option value="date_asc">Data mais próxima</option>
            <option value="date_desc">Data mais distante</option>
            <option value="popularity">Popularidade</option>
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="Período">
          {TIMEFRAMES.map((item) => (
            <button key={item.id} className={cn('hub-chip shrink-0', timeframe === item.id && 'border-[color-mix(in_srgb,var(--hub-brand)_45%,var(--hub-border))] bg-[var(--hub-brand-soft)] text-[var(--hub-text-strong)]')} onClick={() => setTimeframe(item.id)}>{item.label}</button>
          ))}
          {timeframe === 'year' && years.map((year) => (
            <button key={year} className={cn('hub-chip shrink-0', selectedYear === year && 'border-[color-mix(in_srgb,var(--hub-brand)_45%,var(--hub-border))] bg-[var(--hub-brand-soft)] text-[var(--hub-text-strong)]')} onClick={() => setSelectedYear(year)}>{year}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => <MediaCard key={index} isLoading />)}
        </div>
      ) : filteredReleases.length ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {filteredReleases.map((item) => {
            const days = item.releaseDate ? differenceInDays(parseISO(item.releaseDate), new Date()) : null;
            const soon = days !== null && days >= 0 && days <= 30;
            return (
              <div key={`${item.mediaType}-${item.id}`} className="relative">
                <span className={cn('absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] font-black backdrop-blur-xl', soon ? 'border-[color-mix(in_srgb,var(--hub-brand)_45%,transparent)] bg-[var(--hub-brand)] text-[var(--hub-brand-contrast)]' : 'border-white/14 bg-black/68 text-white')}>
                  {soon && <Clock size={12} />}{item.releaseDate ? getCountdownText(item.releaseDate) : t('releases.soon')}
                </span>
                <MediaCard item={item} />
              </div>
            );
          })}
        </motion.div>
      ) : (
        <div className="hub-empty-state"><div><CalendarDays className="mx-auto text-[var(--hub-brand)]" size={36} /><p className="mt-4 font-extrabold text-[var(--hub-text-strong)]">{t('releases.empty')}</p></div></div>
      )}
    </div>
  );
}
