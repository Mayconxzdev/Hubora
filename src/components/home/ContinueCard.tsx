import { Play, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserMediaEntry } from '@/types';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { formatProgress, getCompletionPercentage } from '@/utils/formatProgress';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';

export function ContinueCard({ entry }: { entry: UserMediaEntry }) {
  const navigate = useNavigate();
  const updateLibraryItem = useStore((state) => state.updateLibraryItem);
  const percentage = getCompletionPercentage(entry);

  const advance = (event: React.MouseEvent) => {
    event.stopPropagation();
    const progress = { ...entry.progress };
    if (entry.mediaType === 'tv' || entry.mediaType === 'anime') progress.currentEpisode = (progress.currentEpisode || 0) + 1;
    else if (entry.mediaType === 'manga') progress.currentChapter = (progress.currentChapter || 0) + 1;
    else if (entry.mediaType === 'comic') progress.currentIssue = (progress.currentIssue || 0) + 1;
    else if (entry.mediaType === 'book') progress.currentPage = (progress.currentPage || 0) + 10;
    else if (entry.mediaType === 'game') progress.hoursPlayed = (progress.hoursPlayed || 0) + 1;
    else if (entry.mediaType === 'movie') progress.watched = true;
    updateLibraryItem(entry.id, { progress, ...(entry.mediaType === 'movie' ? { status: 'completed' as const } : {}) });
    toast.success('Progresso registrado');
  };

  return (
    <article
      className="group relative min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--hub-border)] bg-[var(--hub-surface-1)] shadow-[var(--hub-shadow-sm)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--hub-border-strong)] hover:shadow-[var(--hub-shadow-md)]"
      onClick={() => navigate(`/details/${entry.media.id}`)}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <OptimizedImage src={entry.media.backdropPath || entry.media.posterPath || '/icons/hubora-512.png'} alt={entry.title} className="h-full w-full transition duration-700 group-hover:scale-[1.025]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/22 to-transparent" />
        <button className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white text-black shadow-xl transition hover:scale-[1.03]" aria-label={`Continuar ${entry.title}`}><Play size={18} fill="currentColor" /></button>
        <button onClick={advance} className="absolute right-4 top-4 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/14 bg-black/58 px-3 text-xs font-black text-white backdrop-blur-xl transition hover:bg-[var(--hub-brand)]" aria-label="Avançar progresso"><Plus size={14} /> Progresso</button>
        <div className="absolute inset-x-4 bottom-4">
          <h3 className="truncate text-lg font-extrabold tracking-[-0.025em] text-white">{entry.title}</h3>
          <div className="mt-1.5 flex items-center justify-between text-xs font-semibold text-white/68"><span>{formatProgress(entry) || 'Continue de onde parou'}</span><span>{percentage}%</span></div>
          <div className="mt-2 hub-progress"><span style={{ width: `${percentage}%` }} /></div>
        </div>
      </div>
    </article>
  );
}
