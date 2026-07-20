import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useStore } from '@/store/useStore';
import { formatProgress } from '@/utils/formatProgress';
import { Button } from '@/components/ui/Button';
import { Plus, Check, Star, Calendar, Clock, PlayCircle, BookOpen, Edit3, User, Users, Video, Sparkles, Lightbulb, AlertTriangle, Film, Tv, Compass, Gamepad2, Music } from 'lucide-react';
import { motion } from 'motion/react';
import { LibraryStatus, MediaItem } from '@/types';
import { cn } from '@/lib/utils';
import { WhereToWatch } from '@/components/details/WhereToWatch';
import { TrailerModal } from '@/components/ui/TrailerModal';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { StarRating } from '@/components/ui/StarRating';
import { DetailsInsight } from '@/components/details/DetailsInsight';
import { MediaPassport } from '@/components/details/MediaPassport';
import { toast } from 'sonner';
import { SEO } from '@/components/ui/SEO';
import { useTranslation } from '@/hooks/useTranslation';
import { Skeleton } from '@/components/ui/Skeleton';
import { LibraryStatusModal } from '@/components/library/LibraryStatusModal';
import { findLibraryEntry } from '@/services/identity';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

export function Details() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { addToLibrary, removeFromLibrary, updateLibraryItem, getItemStatus, library, customLists, addItemToCustomList } = useStore();
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showTriviaModal, setShowTriviaModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trivia, setTrivia] = useState<string[]>([]);
  const [isLoadingTrivia, setIsLoadingTrivia] = useState(false);
  
  const { data: item, isLoading } = useQuery<MediaItem | null>({
    queryKey: ['details', id],
    queryFn: () => api.getDetails(id!),
    enabled: !!id,
  });


  const [gameDeals, setGameDeals] = useState<any[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);

  useEffect(() => {
    if (item && item.mediaType === 'game') {
      setIsLoadingDeals(true);
      api.getGameDeals(item.title)
        .then(deals => {
          setGameDeals(deals.slice(0, 4));
        })
        .catch(err => console.warn("Erro ao buscar ofertas:", err))
        .finally(() => setIsLoadingDeals(false));
    }
  }, [item]);

  const getStoreName = (storeId: string) => {
    const stores: Record<string, string> = {
      '1': 'Steam',
      '2': 'GamersGate',
      '3': 'GreenManGaming',
      '7': 'GOG',
      '11': 'Humble Store',
      '25': 'Epic Games',
    };
    return stores[storeId] || 'Loja Virtual';
  };

  const libraryItem = item ? findLibraryEntry(library, item) || null : null;
  const status = libraryItem?.status || null;

  const handleAdd = () => {
    if (item) {
      addToLibrary(item, 'planning');
      toast.success(`${item.title} ${t('details.added')}`);
    }
  };

  const handleTrivia = () => {
    if (!item) return;
    setShowTriviaModal(true);
    if (trivia.length > 0) return;
    setIsLoadingTrivia(true);
    const facts = [
      item.originalTitle && item.originalTitle !== item.title ? `O título original é “${item.originalTitle}”.` : '',
      item.releaseDate ? `A data de lançamento informada pelo catálogo é ${item.releaseDate}.` : '',
      item.genres?.length ? `Os gêneros associados são ${item.genres.slice(0, 5).join(', ')}.` : '',
      item.runtime ? `A duração catalogada é de aproximadamente ${item.runtime} minutos.` : '',
      item.episodesCount ? `O catálogo registra ${item.episodesCount} episódios.` : '',
      item.pages ? `Esta edição registra ${item.pages} páginas.` : '',
      item.authors?.length ? `Autoria: ${item.authors.join(', ')}.` : '',
      item.developers?.length ? `Desenvolvimento: ${item.developers.join(', ')}.` : '',
      item.publishers?.length ? `Publicação: ${item.publishers.join(', ')}.` : '',
      item.cast?.length ? `Entre os nomes do elenco estão ${item.cast.slice(0, 3).map((person) => person.name).join(', ')}.` : '',
    ].filter(Boolean) as string[];
    setTrivia(facts.length ? facts : ['O provedor não disponibilizou fatos estruturados suficientes para esta obra.']);
    setIsLoadingTrivia(false);
  };

  const handleRemove = () => {
    if (item) {
      if (libraryItem) removeFromLibrary(libraryItem.id);
      toast.success(`${item.title} ${t('details.removed')}`);
    }
  };

  if (isLoading) {
    return (
      <div className="hub-page hub-details-page relative min-h-screen">
        <div className="relative h-[50vh] md:h-[70vh] w-full">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="container mx-auto px-4 -mt-32 relative z-20">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-48 md:w-72 flex-shrink-0 mx-auto md:mx-0">
              <Skeleton className="w-full aspect-[2/3] rounded-2xl" />
            </div>
            <div className="flex-1 pt-4 md:pt-32 space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-12 w-32 rounded-full" />
                <Skeleton className="h-12 w-32 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl text-slate-400">{t('details.not_found')}</h2>
      </div>
    );
  }

  return (
    <div className="hub-page hub-details-page relative min-h-screen">
      <SEO 
        title={item.title} 
        description={item.overview || `Saiba mais sobre ${item.title} no Hubora`} 
        image={item.posterPath || ''} 
      />

      {/* Cinematic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center scale-110 blur-[100px] opacity-20"
          style={item.backdropPath || item.posterPath ? { backgroundImage: `url("${item.backdropPath || item.posterPath}")` } : undefined}
        />
        <div className="absolute inset-0 bg-slate-950/60" />
      </div>
      
      <div className="relative z-10">
        {/* Cinematic Hero Banner */}
      <div className="relative min-h-[min(66vh,43rem)] w-full overflow-hidden rounded-[clamp(1.4rem,3vw,2.5rem)] border border-[var(--hub-border)] shadow-[var(--hub-shadow-lg)] group flex items-end pb-8 sm:pb-12">
        <div className="absolute inset-0">
          <img
            src={item.backdropPath || item.posterPath || '/icons/hubora-512.png'}
            alt={item.title}
            className="w-full h-full object-cover opacity-40 transition-transform duration-[18s] ease-linear group-hover:scale-[1.025]"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/icons/hubora-512.png';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
          <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--hub-brand)_9%,transparent)] mix-blend-overlay" />
        </div>

        <div className="mx-auto w-full max-w-7xl px-5 sm:px-7 lg:px-10 relative z-10 flex flex-col md:flex-row gap-7 lg:gap-10 items-end">
          {/* Poster */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-44 sm:w-52 md:w-60 flex-shrink-0 mx-auto md:mx-0 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 relative group/poster"
          >
            <OptimizedImage
              src={item.posterPath || '/icons/hubora-512.png'}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover/poster:scale-105"
            />
            {item.trailerUrl && (
              <div 
                className="absolute inset-0 bg-black/60 opacity-0 group-hover/poster:opacity-100 transition-all duration-500 flex items-center justify-center cursor-pointer backdrop-blur-sm"
                onClick={() => setShowTrailerModal(true)}
              >
                <div className="w-20 h-20 rounded-full bg-[color-mix(in_srgb,var(--hub-brand)_92%,black)] flex items-center justify-center text-white shadow-[0_0_30px_rgba(217,154,40,0.34)] transform scale-75 group-hover/poster:scale-100 transition-transform duration-500 ease-out">
                  <PlayCircle size={40} fill="currentColor" />
                </div>
              </div>
            )}
          </motion.div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left pb-6">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              className="text-[clamp(2.45rem,6vw,5.5rem)] font-black text-white mb-4 drop-shadow-2xl tracking-[-0.065em] leading-[0.92] text-balance"
            >
              {item.title}
            </motion.h1>
            
            {item.originalTitle && item.originalTitle !== item.title && (
              <p className="text-slate-400 text-2xl mb-8 italic font-medium drop-shadow-md">{item.originalTitle}</p>
            )}

            {(item.customBadge || item.price) && (
              <div className="flex gap-4 items-center mb-6">
                {item.customBadge && (
                  <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider backdrop-blur-md">
                    {item.customBadge}
                  </span>
                )}
                {item.price && (
                  <span className="text-2xl font-black text-green-300 drop-shadow-md">
                    US$ {item.price}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 text-base text-slate-300 mb-8 font-medium">
              <span className="bg-gradient-to-r from-purple-600/40 to-cyan-600/40 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/20 uppercase font-black text-xs tracking-widest text-white shadow-[0_0_15px_rgba(217,154,40,0.20)]">
                {t(`media.type.${item.mediaType}` as Parameters<typeof t>[0]) || item.mediaType}
              </span>
              {item.releaseDate && (
                <span className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                  <Calendar size={18} className="text-purple-400" />
                  {new Date(item.releaseDate).getFullYear()}
                </span>
              )}
              {item.voteAverage && (
                <span className="flex items-center gap-2 text-yellow-400 font-black text-lg bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                  <Star size={20} fill="currentColor" className="drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                  {item.voteAverage.toFixed(1)}
                </span>
              )}
              {item.status && (
                <span className="flex items-center gap-2 text-green-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md font-bold">
                  <Clock size={18} />
                  {item.status}
                </span>
              )}
              {item.seasonsCount !== undefined && (
                <span className="flex items-center gap-2 text-cyan-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md font-bold">
                  <Film size={18} />
                  {item.seasonsCount} Temporadas
                </span>
              )}
              {item.episodesCount !== undefined && (
                <span className="flex items-center gap-2 text-cyan-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md font-bold">
                  <Tv size={18} />
                  {item.episodesCount} Episódios
                </span>
              )}
              {item.chaptersCount !== undefined && (
                <span className="flex items-center gap-2 text-pink-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md font-bold">
                  <BookOpen size={18} />
                  {item.chaptersCount} Capítulos
                </span>
              )}
              {item.pages !== undefined && (
                <span className="flex items-center gap-2 text-amber-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md font-bold">
                  <BookOpen size={18} />
                  {item.pages} Páginas
                </span>
              )}
              {item.nextEpisodeToAir && (
                <span className="flex items-center gap-2 text-purple-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md font-bold" title={`Na Temporada ${item.nextEpisodeToAir.seasonNumber}`}>
                  <Calendar size={18} />
                  Próx: Ep {item.nextEpisodeToAir.episodeNumber} ({new Date(item.nextEpisodeToAir.airDate).toLocaleDateString('pt-BR')})
                </span>
              )}
            </div>

            {/* Quick Info Bar */}
            <div className="flex flex-wrap gap-4 mb-8">
              {item.genres?.slice(0, 3).map(genre => (
                <div key={genre} className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-sm font-bold text-slate-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                  {genre}
                </div>
              ))}
              {item.runtime && (
                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-sm font-bold text-slate-200">
                  <Clock size={16} className="text-purple-400" />
                  {item.runtime} min
                </div>
              )}
              {item.platforms && item.platforms.slice(0, 3).map(p => (
                <div key={p} className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-sm font-bold text-slate-200">
                  <PlayCircle size={16} className="text-teal-400" />
                  {p}
                </div>
              ))}
              {item.developers && item.developers.map(d => (
                <div key={d} className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-sm font-bold text-slate-200">
                  <User size={16} className="text-blue-400" />
                  {d}
                </div>
              ))}
              {item.publishers && item.publishers.map(p => (
                <div key={p} className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-sm font-bold text-slate-200">
                  <Star size={16} className="text-yellow-400" />
                  {p}
                </div>
              ))}
              {item.authors && item.authors.map(a => (
                <div key={a} className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-sm font-bold text-slate-200">
                  <User size={16} className="text-pink-400" />
                  {a}
                </div>
              ))}
            </div>

            <p className="text-slate-300 text-lg leading-relaxed max-w-3xl mb-8 drop-shadow-md">
              {item.overview || t('media.no_overview')}
            </p>

            <div className="mb-8 max-w-3xl">
              <DetailsInsight item={item} />
            </div>

            <MediaPassport item={item} />

            {/* Genres */}
            {item.genres && item.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-8">
                {item.genres.map((genre) => (
                  <span key={genre} className="px-4 py-1.5 bg-white/5 backdrop-blur-md text-slate-300 text-sm font-medium rounded-full border border-white/10">
                    {genre}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-8">
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <Button
                  size="lg"
                  variant={libraryItem ? "default" : "secondary"}
                  onClick={() => setIsModalOpen(true)}
                  className={`gap-3 h-14 px-10 rounded-2xl transition-all duration-300 font-bold shadow-lg ${libraryItem ? 'bg-[var(--hub-brand)] hover:bg-[var(--hub-brand-strong)] shadow-[0_0_30px_rgba(217,154,40,0.26)] border border-purple-500' : 'bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white shadow-[0_0_30px_rgba(217,154,40,0.26)]'}`}
                >
                  {libraryItem ? <Edit3 size={24} /> : <Plus size={26} />}
                  <span>{libraryItem ? 'Editar Status' : t('details.add')}</span>
                </Button>

                {libraryItem?.status && (
                    <div className="flex items-center px-6 h-14 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-white/10 text-sm font-bold text-slate-300">
                        Status: <span className="ml-2 text-purple-400 capitalize">{libraryItem.status.replace('_', ' ')}</span>
                    </div>
                )}
                
                <Link to={`/guide?q=${encodeURIComponent(item.title)}`}>
                  <Button variant="outline" size="lg" className="gap-3 border-white/20 hover:bg-white/10 hover:border-white/40 text-white h-14 px-8 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 font-bold">
                    <BookOpen size={22} />
                    {t('details.franchise')}
                  </Button>
                </Link>
                
                {item.trailerUrl && (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => setShowTrailerModal(true)}
                    className="gap-3 border-purple-500/50 hover:bg-purple-500/20 hover:border-purple-400 text-purple-300 h-14 px-8 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 font-bold hover:shadow-[0_0_20px_rgba(217,154,40,0.20)]"
                  >
                    <PlayCircle size={22} />
                    Trailer
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={handleTrivia}
                  className="gap-3 border-yellow-500/50 hover:bg-yellow-500/20 hover:border-yellow-400 text-yellow-300 h-14 px-8 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 font-bold hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                >
                  <Lightbulb size={22} />
                   {t('details.trivia')}
                </Button>

                {/* Custom List Selector */}
                {Object.values(customLists || {}).length > 0 && (
                  <div className="relative">
                    <select 
                      onChange={(e) => {
                        const listId = e.target.value;
                        if (!listId) return;
                        addItemToCustomList(listId, String(item.id));
                        toast.success('Mídia adicionada à sua coleção.');
                        e.target.value = ""; // reset
                      }}
                      className="h-14 px-6 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-white/10 text-sm font-bold text-slate-300 outline-none cursor-pointer focus:ring-2 focus:ring-[var(--hub-brand)] hover:border-white/20 transition-all"
                    >
                      <option value="" className="bg-slate-950 text-slate-400">Adicionar à Coleção...</option>
                      {Object.values(customLists).map((list: any) => (
                        <option 
                          key={list.id} 
                          value={list.id} 
                          disabled={list.items.includes(String(item.id))}
                          className="bg-slate-950 text-white"
                        >
                          {list.name} {list.items.includes(String(item.id)) ? ' (Adicionado)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <WhereToWatch item={item} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 mt-16 space-y-24">
        
        {/* User Progress */}

        {status && libraryItem && (
          <section className="max-w-4xl mx-auto">
            <div className="glass-card p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-white flex items-center gap-3">
                    <Edit3 size={28} className="text-purple-400" />
                    {t('details.progress.title')}
                    </h3>
                    <Button variant="outline" onClick={() => setIsModalOpen(true)} className="border-purple-500/30 hover:bg-purple-500/10 text-purple-300">
                        <Edit3 size={16} className="mr-2" /> Atualizar Progresso
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="bg-slate-950/40 p-6 rounded-2xl border border-white/5 flex flex-col justify-center">
                    <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">Status e Progresso</label>
                    <div className="text-2xl font-black text-white mb-2">
                         {formatProgress(libraryItem) || 'Nenhum progresso registrado'}
                    </div>
                    <div className="text-sm text-slate-450 flex gap-2">
                        Status: <span className="text-purple-400 uppercase font-bold">{libraryItem.status}</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-950/40 p-6 rounded-2xl border border-white/5">
                    <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">{t('details.progress.notes')}</label>
                    <div className="text-sm text-slate-300 italic min-h-[80px]">
                         {libraryItem.notes || 'Nenhuma anotação.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Game Deals Section (CheapShark) */}
        {item.mediaType === 'game' && gameDeals.length > 0 && (
          <section className="max-w-4xl mx-auto">
            <div className="glass-card p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-cyan-500/5 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-2xl font-black text-white flex items-center gap-3 mb-8">
                  <Gamepad2 size={28} className="text-green-450 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                  Melhores Ofertas de PC (CheapShark)
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {gameDeals.map((deal: any, idx: number) => (
                    <a 
                      key={idx} 
                      href={`https://www.cheapshark.com/redirect?dealID=${deal.dealID}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-between text-center hover:border-green-500/30 transition-all hover:scale-[1.03] group"
                    >
                      <span className="text-xs font-black text-slate-450 uppercase tracking-widest">{getStoreName(deal.storeID)}</span>
                      <div className="my-3">
                        <div className="text-2xl font-black text-green-400">${deal.price}</div>
                        {parseFloat(deal.savings) > 0 && (
                          <div className="text-xs text-slate-500 line-through">${deal.retailPrice}</div>
                        )}
                      </div>
                      {parseFloat(deal.savings) > 0 ? (
                        <span className="text-[10px] font-black bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
                          {Math.round(parseFloat(deal.savings))}% OFF
                        </span>
                      ) : (
                        <span className="text-[10px] font-black bg-slate-800 text-slate-400 px-3 py-1 rounded-full">
                          Preço Normal
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Soundtrack Section (Spotify Embed) */}
        <section className="max-w-4xl mx-auto">
          <div className="glass-card p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-purple-500/5 pointer-events-none" />
            <div className="relative z-10">
              <h3 className="text-2xl font-black text-white flex items-center gap-3 mb-8">
                <Music size={28} className="text-green-450 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                Trilha Sonora Oficial
              </h3>
              
              <div className="rounded-2xl overflow-hidden bg-black/40 border border-white/5">
                <iframe 
                  src={`https://open.spotify.com/embed/search/${encodeURIComponent(item.title + ' soundtrack')}`} 
                  width="100%" 
                  height="300" 
                  frameBorder="0" 
                  allow="encrypted-media"
                  className="rounded-2xl"
                  title={`Trilha sonora de ${item.title}`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Trailer Modal */}

        <TrailerModal 
          isOpen={showTrailerModal} 
          onClose={() => setShowTrailerModal(false)} 
          trailerUrl={item.trailerUrl || null} 
        />

        {/* Trivia Modal */}
        <Dialog open={showTriviaModal} onOpenChange={setShowTriviaModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-yellow-500/15 text-yellow-500">
                  <Lightbulb size={24} aria-hidden="true" />
                </span>
                <div>
                  <DialogTitle>{t('details.trivia')}</DialogTitle>
                  <DialogDescription>{t('details.trivia.title').replace('{title}', item.title)}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <DialogBody>
              {isLoadingTrivia ? (
                <div className="grid min-h-52 place-items-center text-center">
                  <div>
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-yellow-500/20 border-t-yellow-500" />
                    <p className="mt-4 text-sm font-bold text-[var(--hub-muted)]">{t('details.trivia.loading')}</p>
                  </div>
                </div>
              ) : trivia.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-500">
                  <AlertTriangle size={20} aria-hidden="true" />
                  <span>{t('details.trivia.error')}</span>
                </div>
              ) : (
                <ol className="space-y-3">
                  {trivia.map((fact, index) => (
                    <li key={`${fact}-${index}`} className="flex gap-3 rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-4">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-yellow-500/15 text-sm font-black text-yellow-500">
                        {index + 1}
                      </span>
                      <p className="pt-1 text-sm leading-7 text-[var(--hub-text)] sm:text-base">{fact}</p>
                    </li>
                  ))}
                </ol>
              )}
            </DialogBody>

            <DialogFooter>
              <Button onClick={() => setShowTriviaModal(false)}>Entendido</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cast Section */}
        {item.cast && item.cast.length > 0 && (
          <section className="relative">
            <div className="absolute -inset-x-4 -inset-y-8 bg-gradient-to-r from-purple-900/10 via-transparent to-transparent -z-10" />
            <h3 className="text-3xl md:text-4xl font-black text-white mb-10 flex items-center gap-4 drop-shadow-lg">
              <Users className="text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" size={36} />
              {t('details.cast')}
            </h3>
            <div className="flex overflow-x-auto gap-6 pb-12 scrollbar-hide snap-x -mx-4 px-4 md:mx-0 md:px-0">
              {item.cast.map((actor, idx) => (
                <div key={idx} className="flex-shrink-0 w-36 md:w-48 rounded-3xl overflow-hidden relative group snap-start glass-card hover-card-effect shadow-xl transition-all duration-500 hover:z-20">
                  <div className="aspect-[2/3] w-full bg-slate-800">
                    {actor.profilePath ? (
                      <img src={actor.profilePath} alt={actor.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <User size={48} />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 w-full p-5 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out">
                    <p className="text-base md:text-lg font-black text-white leading-tight drop-shadow-md mb-1">{actor.name}</p>
                    <p className="text-xs md:text-sm text-purple-300 leading-tight drop-shadow-md font-bold opacity-80 group-hover:opacity-100 transition-opacity">{actor.character}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}


        {/* Similar Items Section */}
        {item.similar && item.similar.length > 0 && (
          <section className="relative">
            <div className="absolute -inset-x-4 -inset-y-8 bg-gradient-to-l from-cyan-900/10 via-transparent to-transparent -z-10" />
            <h3 className="text-3xl md:text-4xl font-black text-white mb-10 flex items-center gap-4 drop-shadow-lg">
              <Sparkles className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" size={36} />
              {t('details.similar')}
            </h3>
            <div className="flex overflow-x-auto gap-6 pb-12 scrollbar-hide snap-x -mx-4 px-4 md:mx-0 md:px-0">
              {item.similar.map((similarItem) => (
                <Link key={similarItem.id} to={`/details/${similarItem.id}`} className="flex-shrink-0 w-40 md:w-52 group snap-start">
                  <div className="aspect-[2/3] rounded-3xl overflow-hidden mb-5 glass-card hover-card-effect shadow-xl transition-all duration-500 relative">
                    {similarItem.posterPath ? (
                      <img src={similarItem.posterPath} alt={similarItem.title} className="w-full h-full object-cover group-hover:scale-[1.025] transition-transform duration-700" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs text-center p-4 bg-slate-800 font-bold">
                        {t('details.no_image')}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  <p className="text-lg font-black text-white truncate group-hover:text-cyan-400 transition-colors drop-shadow-md px-1">{similarItem.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <LibraryStatusModal item={item} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  </div>
);
}
