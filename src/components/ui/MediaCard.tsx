import * as React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, Edit3, Plus, Star } from 'lucide-react';
import { MediaItem, UserMediaEntry } from '@/types';
import { getMediaI18n } from '@/lib/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Skeleton } from '@/components/ui/Skeleton';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useStore } from '@/store/useStore';
import { LibraryStatusModal } from '@/components/library/LibraryStatusModal';
import { findLibraryEntry } from '@/services/identity';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getCompletionPercentage } from '@/utils/formatProgress';

interface MediaCardProps {
  item?: MediaItem;
  aspect?: 'poster' | 'video';
  isLoading?: boolean;
  priority?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  planning: 'Na lista',
  consuming: 'Em andamento',
  completed: 'Concluído',
  paused: 'Pausado',
  dropped: 'Abandonado',
};

const TYPE_LABELS: Record<MediaItem['mediaType'], string> = {
  movie: 'Filme',
  tv: 'Série',
  anime: 'Anime',
  manga: 'Mangá',
  comic: 'Quadrinho',
  book: 'Livro',
  novel: 'Novel',
  game: 'Jogo',
};

function quickAdvance(entry: UserMediaEntry, item: MediaItem) {
  const store = useStore.getState();
  const progress = { ...entry.progress };
  let message = 'Progresso atualizado';

  if (item.mediaType === 'tv' || item.mediaType === 'anime') {
    progress.currentEpisode = (progress.currentEpisode || 0) + 1;
    message = `Episódio ${progress.currentEpisode} registrado`;
  } else if (item.mediaType === 'manga') {
    progress.currentChapter = (progress.currentChapter || 0) + 1;
    message = `Capítulo ${progress.currentChapter} registrado`;
  } else if (item.mediaType === 'comic') {
    progress.currentIssue = (progress.currentIssue || 0) + 1;
    message = `Edição ${progress.currentIssue} registrada`;
  } else if (item.mediaType === 'book' || item.mediaType === 'novel') {
    progress.currentPage = (progress.currentPage || 0) + 10;
    message = `Página ${progress.currentPage} registrada`;
  } else if (item.mediaType === 'game') {
    progress.hoursPlayed = (progress.hoursPlayed || 0) + 1;
    message = `${progress.hoursPlayed}h registradas`;
  } else if (item.mediaType === 'movie') {
    progress.watched = true;
    store.updateLibraryItem(entry.id, { progress, status: 'completed' });
    toast.success('Filme marcado como assistido');
    return;
  }

  store.updateLibraryItem(entry.id, { progress });
  toast.success(message);
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, aspect = 'poster', isLoading = false, priority = false }) => {
  const { t } = useTranslation();
  const i18n = getMediaI18n(t);
  const library = useStore((state) => state.library);
  const [libraryModalOpen, setLibraryModalOpen] = React.useState(false);

  if (isLoading || !item) {
    return (
      <div className="hub-media-card" aria-hidden="true">
        <Skeleton className={cn('hub-skeleton w-full rounded-[1.15rem]', aspect === 'poster' ? 'aspect-[2/3]' : 'aspect-video')} />
        <div className="space-y-2 px-1 pt-3">
          <Skeleton className="hub-skeleton h-4 w-4/5 rounded-full" />
          <Skeleton className="hub-skeleton h-3 w-2/5 rounded-full" />
        </div>
      </div>
    );
  }

  const entry = findLibraryEntry(library, item);
  const year = item.releaseDate?.slice(0, 4);
  const rating = item.voteAverage && item.voteAverage > 0 ? item.voteAverage.toFixed(1) : null;
  const title = i18n.displayTitle(item);
  const completion = entry ? getCompletionPercentage(entry) : 0;
  const artwork = item.posterPath || item.backdropPath;

  return (
    <>
      <article className="hub-media-card group">
        <div className="hub-media-poster">
          <Link to={`/details/${item.id}`} className="block" aria-label={`Abrir detalhes de ${title}`}>
            <div className={cn('relative', aspect === 'poster' ? 'aspect-[2/3]' : 'aspect-video')}>
              {artwork ? (
                <OptimizedImage src={artwork} alt={title} className="hub-media-image h-full w-full" />
              ) : (
                <div className="hub-media-image grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_28%,color-mix(in_srgb,var(--hub-brand)_18%,transparent),transparent_52%),var(--hub-surface-2)] px-5 text-center">
                  <div className="flex flex-col items-center gap-3 text-[var(--hub-subtle)]">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-3)] text-[var(--hub-muted)]">
                      <BookOpen size={24} aria-hidden="true" />
                    </span>
                    <span className="text-[0.65rem] font-black uppercase tracking-[0.16em]">Capa indisponível</span>
                  </div>
                </div>
              )}
              <div className="hub-media-gradient" />

              <div className="absolute left-2.5 top-2.5 z-[2] flex max-w-[calc(100%-4.5rem)] flex-wrap gap-1.5">
                {entry && (
                  <span className="hub-chip border-white/14 bg-black/58 py-1 text-[0.64rem] text-white backdrop-blur-xl">
                    <Check size={12} /> {STATUS_LABELS[entry.status]}
                  </span>
                )}
                {item.customBadge && (
                  <span className="hub-chip border-white/14 bg-black/58 py-1 text-[0.64rem] text-white backdrop-blur-xl">{item.customBadge}</span>
                )}
              </div>

              {rating && (
                <span className="absolute right-2.5 top-2.5 z-[2] inline-flex min-h-8 items-center gap-1 rounded-full border border-white/14 bg-black/58 px-2.5 text-[0.7rem] font-black text-white backdrop-blur-xl">
                  <Star size={12} className="fill-amber-400 text-amber-400" /> {rating}
                </span>
              )}

              {entry && completion > 0 && (
                <div className="absolute inset-x-2.5 bottom-2.5 z-[2]">
                  <div className="mb-1.5 flex justify-between text-[0.64rem] font-bold text-white/82">
                    <span>Seu progresso</span><span>{Math.round(completion)}%</span>
                  </div>
                  <div className="hub-progress"><span style={{ width: `${Math.min(100, completion)}%` }} /></div>
                </div>
              )}
            </div>
          </Link>

          <div className="hub-media-actions">
            <button
              className="grid h-10 w-10 place-items-center rounded-full border border-white/14 bg-black/72 text-white backdrop-blur-xl transition hover:bg-white hover:text-black"
              onClick={() => setLibraryModalOpen(true)}
              aria-label={entry ? `Editar ${title} na biblioteca` : `Adicionar ${title} à biblioteca`}
              title={entry ? 'Editar biblioteca' : 'Adicionar à biblioteca'}
            >
              {entry ? <Edit3 size={17} /> : <Plus size={18} />}
            </button>
            {entry && (
              <button
                className="grid h-10 flex-1 place-items-center rounded-full border border-white/14 bg-white text-xs font-black text-black transition hover:bg-white/88"
                onClick={() => quickAdvance(entry, item)}
                aria-label={`Avançar progresso de ${title}`}
              >
                + progresso
              </button>
            )}
          </div>
        </div>

        <Link to={`/details/${item.id}`} className="block hub-media-meta">
          <h3 className="hub-media-title" title={title}>{title}</h3>
          <div className="hub-media-subtitle">
            <span>{TYPE_LABELS[item.mediaType]}</span>
            {year && <><span aria-hidden="true">•</span><span>{year}</span></>}
            {priority && item.genres?.[0] && <><span aria-hidden="true">•</span><span className="truncate">{item.genres[0]}</span></>}
          </div>
        </Link>
      </article>

      <LibraryStatusModal item={item} isOpen={libraryModalOpen} onClose={() => setLibraryModalOpen(false)} />

    </>
  );
};
