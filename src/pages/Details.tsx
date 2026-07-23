import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  Check,
  Clipboard,
  ExternalLink,
  Library,
  MoreHorizontal,
  Play,
  Server,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import type { MediaAccess, MediaItem, MediaType, UserMediaEntry } from '@/types';
import { useStore } from '@/store/useStore';
import { TrailerModal } from '@/components/ui/TrailerModal';
import { findLibraryEntry } from '@/services/identity';
import { getMediaI18n } from '@/lib/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { MediaPassport } from '@/components/details/MediaPassport';
import { WhereToWatch } from '@/components/details/WhereToWatch';
import { EpisodeList } from '@/components/details/EpisodeList';
import { GameManagementModal } from '@/components/games/GameManagementModal';
import { getMediaPresentationContract } from '@/services/mediaPresentation';
import {
  fetchMangaChapters,
  resolveMangaDexId,
  type MangaChapter,
} from '@/services/mangaService';
import { MediaCard } from '@/components/ui/MediaCard';
import { cn } from '@/lib/utils';
import { accessDestination, verifiedAccessFor } from '@/services/mediaAccess';

type DetailTab = 'overview' | 'videos' | 'episodes' | 'sources' | 'activity' | 'details';

type ProgressSummary = {
  percentage: number;
  label: string;
};

function progressSummary(entry: UserMediaEntry | undefined, item: MediaItem): ProgressSummary | null {
  if (!entry) return null;
  const progress = entry.progress || {};
  let percentage = 0;
  let label = '';

  if (item.mediaType === 'movie') {
    if (!progress.watched) return null;
    percentage = 100;
    label = 'Assistido';
  } else if (['tv', 'series', 'drama', 'anime'].includes(item.mediaType)) {
    const current = progress.currentEpisode || 0;
    const total = progress.totalEpisodes || item.episodesCount || 0;
    if (!current) return null;
    percentage = total ? (current / total) * 100 : 0;
    label = total ? `Episódio ${current} de ${total}` : `Episódio ${current}`;
  } else if (item.mediaType === 'manga' || item.mediaType === 'novel') {
    const current = progress.currentChapter || 0;
    const total = progress.totalChapters || item.chaptersCount || 0;
    if (!current) return null;
    percentage = total ? (current / total) * 100 : 0;
    label = total ? `Capítulo ${current} de ${total}` : `Capítulo ${current}`;
  } else if (item.mediaType === 'book') {
    const directPercentage = progress.percentageRead || 0;
    const current = progress.currentPage || 0;
    const total = progress.totalPages || item.pages || 0;
    percentage = directPercentage || (current && total ? (current / total) * 100 : 0);
    if (!percentage && !current) return null;
    label = current && total ? `Página ${current} de ${total}` : `${Math.round(percentage)}% lido`;
  } else if (item.mediaType === 'comic') {
    const current = progress.currentIssue || 0;
    if (!current) return null;
    label = `Edição ${current}`;
  } else if (item.mediaType === 'game') {
    percentage = progress.completionPercentage || 0;
    if (!percentage && !progress.hoursPlayed) return null;
    label = percentage
      ? `${Math.round(percentage)}% concluído`
      : `${progress.hoursPlayed} h registradas`;
  }

  return {
    percentage: Math.max(0, Math.min(100, percentage)),
    label,
  };
}

function completionCopy(mediaType: MediaType) {
  if (mediaType === 'movie' || ['tv', 'series', 'drama', 'anime'].includes(mediaType)) {
    return { action: 'Marcar como visto', completed: 'Visto' };
  }
  if (['book', 'novel', 'manga', 'comic'].includes(mediaType)) {
    return { action: 'Marcar como lido', completed: 'Lido' };
  }
  return { action: 'Marcar como concluído', completed: 'Concluído' };
}

function formatRuntime(minutes?: number) {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h${rest ? ` ${rest}min` : ''}` : `${rest}min`;
}

function typeSpecificFacts(item: MediaItem): Array<{ label: string; value: string }> {
  const facts: Array<{ label: string; value: string }> = [];
  const add = (label: string, value: string | number | undefined) => {
    if (value !== undefined && value !== null && String(value).trim()) facts.push({ label, value: String(value) });
  };

  if (['tv', 'series', 'drama', 'anime'].includes(item.mediaType)) {
    add('Temporadas', item.seasonsCount);
    add('Episódios', item.episodesCount);
    if (item.nextEpisodeToAir) {
      add('Próximo episódio', `T${item.nextEpisodeToAir.seasonNumber}E${item.nextEpisodeToAir.episodeNumber} · ${item.nextEpisodeToAir.airDate}`);
    }
  }
  if (['manga', 'novel', 'comic'].includes(item.mediaType)) {
    add('Volumes', item.volumesCount);
    add(item.mediaType === 'comic' ? 'Edições' : 'Capítulos', item.chaptersCount);
  }
  if (item.mediaType === 'book') add('Páginas', item.pages);
  if (item.mediaType === 'game') {
    add('Plataformas', item.platforms?.join(', '));
    add('Desenvolvedora', item.developers?.join(', '));
    add('Publicadora', item.publishers?.join(', '));
  }
  add('Autores', item.authors?.join(', '));
  add('Editora', item.publisher);
  return facts;
}

function detailFields(item: MediaItem): Array<{ label: string; value: string }> {
  const fields: Array<{ label: string; value: string }> = [];
  const add = (label: string, value: string | number | undefined) => {
    if (value !== undefined && value !== null && String(value).trim()) fields.push({ label, value: String(value) });
  };
  add('Tipo', getMediaPresentationContract(item.mediaType).displayName);
  add('Título original', item.originalTitle && item.originalTitle !== item.title ? item.originalTitle : undefined);
  add('Status', item.status);
  add('Lançamento', item.releaseDate);
  add('Duração', formatRuntime(item.runtime) || undefined);
  add('Classificação', item.ageRating ? `${item.ageRating}${item.ageRatingSystem ? ` · ${item.ageRatingSystem}` : ''}` : undefined);
  add('Gêneros', item.genres?.join(', '));
  add('Países', item.countries?.join(', '));
  add('Autores', item.authors?.join(', '));
  add('Editora', item.publisher);
  add('Plataformas', item.platforms?.join(', '));
  add('Desenvolvedoras', item.developers?.join(', '));
  add('Publicadoras', item.publishers?.join(', '));
  add('Fonte de metadados', item.source);
  add('ID da fonte', item.sourceId);
  return fields;
}

export function Details() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const i18n = getMediaI18n(t);

  const [item, setItem] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [mangaChapters, setMangaChapters] = useState<MangaChapter[]>([]);
  const [mangaDexId, setMangaDexId] = useState<string | null>(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const library = useStore((state) => state.library);
  const addToLibrary = useStore((state) => state.addToLibrary);
  const removeFromLibrary = useStore((state) => state.removeFromLibrary);
  const updateLibraryItem = useStore((state) => state.updateLibraryItem);
  const toggleFavorite = useStore((state) => state.toggleFavorite);

  useEffect(() => {
    let active = true;
    async function loadDetails() {
      if (!id) return;
      setIsLoading(true);
      setItem(null);
      setRecommendations([]);
      setMangaChapters([]);
      setMangaDexId(null);
      setActiveTab('overview');

      try {
        const details = await api.getDetails(id);
        if (!active) return;
        setItem(details);
        if (!details) return;

        if (details.mediaType === 'manga') {
          const [resolvedId, chapters] = await Promise.all([
            resolveMangaDexId(details),
            fetchMangaChapters(details),
          ]);
          if (active) {
            setMangaDexId(resolvedId);
            setMangaChapters(chapters);
          }
        }

        try {
          let recs: MediaItem[] = [];
          const numericId = String(details.tmdbId || details.sourceId || details.id).replace(/\D+/g, '');
          if (details.mediaType === 'movie' && numericId) recs = await api.getSimilarMovies(numericId);
          else if (['tv', 'series', 'drama'].includes(details.mediaType) && numericId) recs = await api.getSimilarTV(numericId);
          else if (details.mediaType === 'anime') recs = await api.getTrendingAnime();
          else if (details.mediaType === 'game') recs = await api.discoverGames(1);
          else if (details.mediaType === 'manga') recs = await api.getTrendingManga();
          else if (details.mediaType === 'book' || details.mediaType === 'novel') {
            recs = await api.discoverBooks(1, 'relevance', '', details.title.split(' ')[0]);
          } else if (details.mediaType === 'comic') {
            recs = await api.discoverComics(1, 'relevance', '', details.title.split(' ')[0]);
          }
          if (active) setRecommendations(recs.filter((entry) => String(entry.id) !== String(details.id)).slice(0, 6));
        } catch (error) {
          console.warn('Não foi possível carregar recomendações relacionadas:', error);
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadDetails();
    return () => {
      active = false;
    };
  }, [id]);

  const libraryEntry = useMemo(
    () => (item ? findLibraryEntry(library, item) : undefined),
    [item, library],
  );
  const access = useMemo(() => (item ? verifiedAccessFor(item) : []), [item]);
  const summary = useMemo(() => (item ? progressSummary(libraryEntry, item) : null), [item, libraryEntry]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[var(--hub-brand)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[var(--hub-muted)] font-bold uppercase tracking-wider">
          Carregando dados reais e fontes disponíveis...
        </p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="hub-page text-center py-20">
        <h2 className="text-2xl font-black text-white mb-3">Obra indisponível</h2>
        <p className="text-[var(--hub-muted)] text-sm mb-6">
          A fonte não retornou detalhes para este identificador. Nenhum dado substituto foi inventado.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 rounded-xl font-bold bg-[var(--hub-brand)] text-white hover:bg-[var(--hub-brand-strong)] transition-all"
        >
          Voltar para o catálogo
        </button>
      </div>
    );
  }

  const contract = getMediaPresentationContract(item.mediaType);
  const title = i18n.displayTitle(item);
  const overview = i18n.displayOverview(item);
  const completedCopy = completionCopy(item.mediaType);
  const isCompleted = libraryEntry?.status === 'completed';
  const primaryAccess = access[0];
  const firstChapter = mangaChapters[0];
  const facts = typeSpecificFacts(item);
  const fields = detailFields(item);
  const hasEpisodes = ['tv', 'series', 'drama', 'anime'].includes(item.mediaType);
  const hasChapterList = item.mediaType === 'manga';
  const hasVideos = Boolean(item.videos?.length);

  const metadata = [
    item.releaseDate?.slice(0, 4),
    formatRuntime(item.runtime),
    item.ageRating ? `${item.ageRating}${item.ageRatingSystem ? ` · ${item.ageRatingSystem}` : ''}` : null,
    item.genres?.slice(0, 3).join(', '),
    item.pages ? `${item.pages} páginas` : null,
    item.episodesCount ? `${item.episodesCount} episódios` : null,
    item.chaptersCount ? `${item.chaptersCount} capítulos` : null,
    item.platforms?.slice(0, 2).join(', '),
  ].filter(Boolean) as string[];

  const visibleTabs: Array<{ id: DetailTab; label: string }> = [
    { id: 'overview', label: 'Visão geral' },
    ...(hasVideos ? [{ id: 'videos' as const, label: 'Vídeos' }] : []),
    ...((hasEpisodes || hasChapterList)
      ? [{ id: 'episodes' as const, label: hasChapterList ? 'Capítulos' : 'Episódios' }]
      : []),
    { id: 'sources', label: 'Fontes' },
    { id: 'activity', label: 'Sua atividade' },
    { id: 'details', label: 'Detalhes' },
  ];

  const openAccess = (source: MediaAccess) => {
    const destination = accessDestination(source, item);
    if (destination.kind === 'internal') navigate(destination.path);
    else if (destination.kind === 'external') window.open(destination.url, '_blank', 'noopener,noreferrer');
    else toast.error(destination.reason);
  };

  const handlePrimaryAction = () => {
    if (item.mediaType === 'game' && !primaryAccess) {
      setIsGameModalOpen(true);
      return;
    }
    if (item.mediaType === 'manga' && firstChapter && mangaDexId) {
      navigate(`/reader?kind=manga&mangaId=${encodeURIComponent(mangaDexId)}&chapterId=${encodeURIComponent(firstChapter.id)}&title=${encodeURIComponent(title)}`);
      return;
    }
    if (primaryAccess) {
      openAccess(primaryAccess);
      return;
    }
    setActiveTab('sources');
    toast.info('Nenhuma fonte verificada está vinculada. Consulte ou configure uma fonte.');
  };

  const primaryLabel = summary && (summary.percentage > 0 || libraryEntry?.status === 'consuming')
    ? contract.terminology.continueActionLabel
    : primaryAccess || (item.mediaType === 'manga' && firstChapter)
      ? contract.terminology.primaryActionLabel
      : item.mediaType === 'game'
        ? 'Gerenciar jogo'
        : 'Ver fontes';

  const handleCompletion = async () => {
    if (!libraryEntry) {
      await addToLibrary(item, 'completed');
      toast.success(`${title} marcado como ${completedCopy.completed.toLowerCase()}.`);
      return;
    }
    await updateLibraryItem(libraryEntry.id, {
      status: isCompleted ? 'planning' : 'completed',
      ...(item.mediaType === 'movie' ? { progress: { ...libraryEntry.progress, watched: !isCompleted, watchedAt: !isCompleted ? Date.now() : undefined } } : {}),
    });
    toast.success(isCompleted ? 'Status voltou para Planejado.' : `${completedCopy.completed} registrado.`);
  };

  const handleFavorite = async () => {
    if (!libraryEntry) await addToLibrary(item, 'planning');
    toggleFavorite(item.id);
    toast.success(libraryEntry?.isFavorite ? 'Removido dos favoritos.' : 'Adicionado aos favoritos.');
  };

  const handleLibrary = async () => {
    if (libraryEntry) {
      await removeFromLibrary(libraryEntry.id);
      toast.success('Removido da biblioteca.');
    } else {
      await addToLibrary(item, 'planning');
      toast.success('Adicionado à biblioteca.');
    }
    setShowMoreMenu(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado.');
    } catch {
      toast.error('O navegador não permitiu copiar o link.');
    }
    setShowMoreMenu(false);
  };

  return (
    <div className="hub-page pb-24 max-w-[108rem] mx-auto w-full px-4 sm:px-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--hub-muted)] hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Voltar
      </button>

      <section className="relative rounded-3xl overflow-hidden bg-[var(--hub-surface-1)] border border-[var(--hub-border)] p-6 sm:p-10 mb-8 shadow-2xl">
        {item.backdropPath && (
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
            <img src={item.backdropPath} alt="" className="w-full h-full object-cover blur-3xl scale-125" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--hub-surface-1)] via-transparent to-transparent" />
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          <div className="w-44 sm:w-60 shrink-0 mx-auto md:mx-0 rounded-2xl overflow-hidden shadow-2xl border border-[var(--hub-border-strong)] bg-[var(--hub-surface-2)]">
            {item.posterPath || item.backdropPath ? (
              <img src={item.posterPath || item.backdropPath} alt={title} className="w-full aspect-[2/3] object-cover" />
            ) : (
              <div className="grid aspect-[2/3] place-items-center p-6 text-center text-xs font-bold uppercase tracking-wider text-[var(--hub-muted)]">
                Capa não disponível
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-5">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--hub-brand)]">{contract.displayName}</p>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none mb-3">{title}</h1>
              {metadata.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--hub-muted)]">
                  {metadata.map((value) => (
                    <span key={value} className="rounded-full border border-[var(--hub-border)] bg-[var(--hub-surface-2)] px-2.5 py-1">
                      {value}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p className="text-sm text-[var(--hub-muted)] leading-relaxed max-w-3xl">
              {overview || 'A fonte consultada não forneceu uma descrição para esta obra.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handlePrimaryAction}
                className="px-6 py-3 rounded-xl font-extrabold text-sm bg-[var(--hub-brand)] hover:bg-[var(--hub-brand-strong)] text-white flex items-center gap-2.5 shadow-lg shadow-[var(--hub-brand-soft)] transition-all hover:scale-[1.02]"
              >
                <Play size={18} className="fill-current" />
                <span>{primaryLabel}</span>
              </button>

              <button
                onClick={() => void handleCompletion()}
                className={cn(
                  'px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all',
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-[var(--hub-surface-2)] text-white border-[var(--hub-border)] hover:border-[var(--hub-border-strong)]',
                )}
              >
                <Check size={16} />
                <span>{isCompleted ? completedCopy.completed : completedCopy.action}</span>
              </button>

              <button
                onClick={() => void handleFavorite()}
                className={cn(
                  'p-3 rounded-xl border transition-all',
                  libraryEntry?.isFavorite
                    ? 'bg-[var(--hub-brand-soft)] text-[var(--hub-brand)] border-[var(--hub-brand)]'
                    : 'bg-[var(--hub-surface-2)] text-white border-[var(--hub-border)] hover:border-[var(--hub-border-strong)]',
                )}
                aria-pressed={Boolean(libraryEntry?.isFavorite)}
                title={libraryEntry?.isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
              >
                <Bookmark size={16} fill={libraryEntry?.isFavorite ? 'currentColor' : 'none'} />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu((current) => !current)}
                  className="p-3 rounded-xl bg-[var(--hub-surface-2)] text-white border border-[var(--hub-border)] hover:border-[var(--hub-border-strong)] transition-all"
                  title="Mais opções"
                  aria-expanded={showMoreMenu}
                >
                  <MoreHorizontal size={16} />
                </button>
                {showMoreMenu && (
                  <div className="absolute left-0 top-full z-30 mt-2 min-w-56 overflow-hidden rounded-xl border border-[var(--hub-border-strong)] bg-[var(--hub-surface-1)] p-1 shadow-2xl">
                    <button onClick={() => void handleLibrary()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-white hover:bg-[var(--hub-surface-2)]">
                      {libraryEntry ? <Trash2 size={14} /> : <Library size={14} />}
                      {libraryEntry ? 'Remover da biblioteca' : 'Adicionar à biblioteca'}
                    </button>
                    <button onClick={() => { setActiveTab('sources'); setShowMoreMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-white hover:bg-[var(--hub-surface-2)]">
                      <Server size={14} /> Abrir fontes
                    </button>
                    <button onClick={() => void copyLink()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-white hover:bg-[var(--hub-surface-2)]">
                      <Clipboard size={14} /> Copiar link
                    </button>
                  </div>
                )}
              </div>
            </div>

            {summary && summary.percentage > 0 && (
              <div className="pt-2 max-w-xl">
                <div className="h-1.5 w-full rounded-full bg-[var(--hub-surface-3)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--hub-brand)] rounded-full"
                    style={{ width: `${summary.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[0.7rem] font-bold text-[var(--hub-muted)] mt-1.5">
                  <span>{summary.label}</span>
                  <span>{Math.round(summary.percentage)}%</span>
                </div>
              </div>
            )}

            <div role="tablist" aria-label="Seções da obra" className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 border-t border-[var(--hub-border)] text-xs font-bold text-[var(--hub-muted)]">
              {visibleTabs.map((tab) => (
                <button
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'pb-2 border-b-2 transition-colors',
                    activeTab === tab.id ? 'border-[var(--hub-brand)] text-white' : 'border-transparent hover:text-white',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <main className="lg:col-span-8 space-y-6">
          {activeTab === 'overview' && (
            <section role="tabpanel" className="space-y-5">
              <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-1)] p-6">
                <h2 className="text-lg font-black text-white">Sobre esta {contract.displayName.toLowerCase()}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--hub-muted)]">
                  {overview || 'A descrição não está disponível na fonte consultada.'}
                </p>
              </div>
              {facts.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {facts.map((fact) => (
                    <div key={fact.label} className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-1)] p-4">
                      <span className="text-[0.68rem] font-black uppercase tracking-wider text-[var(--hub-muted)]">{fact.label}</span>
                      <strong className="mt-1 block text-sm text-white">{fact.value}</strong>
                    </div>
                  ))}
                </div>
              )}
              {item.cast?.length ? (
                <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-1)] p-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Elenco</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {item.cast.slice(0, 8).map((person) => (
                      <div key={`${person.name}-${person.character}`} className="flex items-center justify-between gap-3 border-b border-[var(--hub-border)] pb-2 text-xs">
                        <strong className="text-white">{person.name}</strong>
                        <span className="text-right text-[var(--hub-muted)]">{person.character}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {activeTab === 'videos' && hasVideos && (
            <section role="tabpanel" className="space-y-4">
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-[var(--hub-border)] bg-black group shadow-xl">
                {item.backdropPath || item.posterPath ? (
                  <img src={item.backdropPath || item.posterPath} alt="" className="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500" />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <button
                    onClick={() => setIsTrailerOpen(true)}
                    className="h-16 w-16 rounded-full bg-[var(--hub-brand)] text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                    aria-label="Abrir vídeos disponíveis"
                  >
                    <Play size={28} className="fill-current ml-1" />
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-xs text-white">
                  <strong>{item.videos?.[0]?.name}</strong>
                  <span className="ml-2 text-white/70">{item.videos?.[0]?.provider}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {item.videos?.map((video) => (
                  <button
                    type="button"
                    key={video.id}
                    onClick={() => setIsTrailerOpen(true)}
                    className="p-3 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface-1)] text-left text-xs text-[var(--hub-muted)] hover:text-white hover:border-[var(--hub-brand)]"
                  >
                    <strong className="block truncate text-white">{video.name}</strong>
                    <span>{video.provider}{video.language ? ` · ${video.language}` : ''}{video.official ? ' · oficial' : ''}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'episodes' && hasEpisodes && (
            <section role="tabpanel">
              <EpisodeList item={item} onRequestSources={() => setActiveTab('sources')} />
            </section>
          )}

          {activeTab === 'episodes' && hasChapterList && (
            <section role="tabpanel" className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-1)] p-5">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Capítulos encontrados no MangaDex</h2>
              {mangaChapters.length > 0 && mangaDexId ? (
                <div className="mt-4 grid max-h-[34rem] gap-2 overflow-y-auto sm:grid-cols-2">
                  {mangaChapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      onClick={() => navigate(`/reader?kind=manga&mangaId=${encodeURIComponent(mangaDexId)}&chapterId=${encodeURIComponent(chapter.id)}&title=${encodeURIComponent(`${title} · ${chapter.title}`)}`)}
                      className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] px-4 py-3 text-left hover:border-[var(--hub-brand)]"
                    >
                      <strong className="block text-xs text-white">Capítulo {chapter.chapter}</strong>
                      <span className="mt-1 block truncate text-[0.7rem] text-[var(--hub-muted)]">{chapter.title} · {chapter.language}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--hub-muted)]">Não foi localizada uma identidade correspondente no MangaDex.</p>
              )}
            </section>
          )}

          {activeTab === 'sources' && <section role="tabpanel"><WhereToWatch item={item} /></section>}
          {activeTab === 'activity' && <section role="tabpanel"><MediaPassport item={item} /></section>}

          {activeTab === 'details' && (
            <section role="tabpanel" className="p-6 rounded-2xl bg-[var(--hub-surface-1)] border border-[var(--hub-border)] space-y-4 text-xs">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Ficha disponível</h2>
              {fields.length > 0 ? (
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {fields.map((field) => (
                    <div key={field.label}>
                      <dt className="font-semibold text-white">{field.label}</dt>
                      <dd className="mt-1 break-words text-[var(--hub-muted)]">{field.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-[var(--hub-muted)]">A fonte não forneceu campos técnicos adicionais.</p>
              )}
            </section>
          )}
        </main>

        <aside className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-[var(--hub-surface-1)] border border-[var(--hub-border)] space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Server size={14} className="text-[var(--hub-brand)]" />
                Fontes verificáveis
              </h2>
              <span className="text-[0.7rem] font-bold text-[var(--hub-brand)]">{access.length}</span>
            </div>

            {access.length > 0 ? (
              <div className="space-y-2.5">
                {access.slice(0, 4).map((source) => (
                  <button
                    type="button"
                    key={source.id}
                    onClick={() => openAccess(source)}
                    className="flex w-full items-center justify-between p-3 rounded-xl bg-[var(--hub-surface-2)] border border-[var(--hub-border)] hover:border-[var(--hub-brand)] transition-colors text-left group"
                  >
                    <span className="min-w-0">
                      <strong className="block truncate text-xs text-white group-hover:text-[var(--hub-brand)]">{source.label}</strong>
                      <span className="mt-0.5 block truncate text-[0.68rem] text-[var(--hub-muted)]">
                        {source.provider}{source.quality ? ` · ${source.quality}` : ''}{source.language ? ` · ${source.language}` : ''}
                      </span>
                    </span>
                    <ExternalLink size={14} className="shrink-0 text-[var(--hub-muted)] group-hover:text-white" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--hub-border)] p-4 text-xs leading-relaxed text-[var(--hub-muted)]">
                Nenhum arquivo pessoal, servidor configurado, acesso oficial ou provedor autorizado foi confirmado para esta obra.
              </div>
            )}

            <button
              onClick={() => setActiveTab('sources')}
              className="w-full text-center py-2 text-xs font-bold text-[var(--hub-muted)] hover:text-white transition-colors"
            >
              {access.length > 4 ? `Ver todas as ${access.length} fontes` : 'Consultar e configurar fontes'} →
            </button>
          </div>
        </aside>
      </div>

      {recommendations.length > 0 && (
        <section className="mt-16 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-white tracking-tight">Você também pode gostar</h2>
            <Link to="/discover" className="text-xs font-bold text-[var(--hub-brand)] hover:underline">Ver mais sugestões</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {recommendations.map((recommendation) => <MediaCard key={String(recommendation.id)} item={recommendation} />)}
          </div>
        </section>
      )}

      <TrailerModal
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        videos={item.videos || []}
      />
      <GameManagementModal item={item} isOpen={isGameModalOpen} onClose={() => setIsGameModalOpen(false)} />
    </div>
  );
}
