import { UserMediaEntry } from '@/types';

export function formatProgress(item: UserMediaEntry | undefined): string {
  if (!item) return '';
  const { mediaType, progress } = item;
  
  if (mediaType === 'movie') {
     if (progress?.watched || item.status === 'completed') return 'Assistido';
     return 'Não assistido';
  }
  if (!progress) return '';

  if (mediaType === 'tv') {
     if (progress.currentSeason && progress.currentEpisode) return `T${progress.currentSeason} E${progress.currentEpisode}`;
     if (progress.currentEpisode) return `Episódio ${progress.currentEpisode}`;
     return '';
  }
  if (mediaType === 'anime') {
     const total = progress.totalEpisodes || item.media?.episodesCount;
     if (progress.currentEpisode && total) return `Ep ${progress.currentEpisode} / ${total}`;
     if (progress.currentEpisode) return `Ep ${progress.currentEpisode}`;
     return '';
  }
  if (mediaType === 'manga' || mediaType === 'comic') {
     const typeStr = mediaType === 'manga' ? 'Capítulo' : 'Edição';
     const ch = mediaType === 'manga' ? progress.currentChapter : progress.currentIssue;
     if (ch && progress.currentVolume) return `Vol ${progress.currentVolume} - ${typeStr} ${ch}`;
     if (ch) return `${typeStr} ${ch}`;
     if (progress.currentVolume) return `Vol ${progress.currentVolume}`;
     return '';
  }
  if (mediaType === 'book' || mediaType === 'novel') {
     if (progress.currentPage && progress.totalPages) return `${progress.currentPage} / ${progress.totalPages} págs`;
     if (progress.currentPage) return `Pág ${progress.currentPage}`;
     return '';
  }
  if (mediaType === 'game') {
     if (progress.hoursPlayed) return `${progress.hoursPlayed} hrs`;
     return '';
  }
  return '';
}
export function getCompletionPercentage(item: UserMediaEntry): number {
  if (item.status === 'completed') return 100;
  if (!item.progress) return 0;
  switch (item.mediaType) {
    case 'movie': return item.progress.watched ? 100 : 0;
    case 'anime': 
    case 'tv': {
      const total = item.progress.totalEpisodes || item.media?.episodesCount || 12;
      const current = item.progress.currentEpisode || 0;
      return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
    }
    case 'manga':
    case 'comic': {
      const current = item.progress.currentChapter || item.progress.currentIssue || 0;
      return Math.min(100, Math.max(0, Math.round((current / 50) * 100))); // Default fallback
    }
    case 'book':
    case 'novel': {
       const total = item.progress.totalPages || 300;
       const current = item.progress.currentPage || 0;
       return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
    }
    case 'game': {
       const current = item.progress.hoursPlayed || 0;
       return Math.min(100, Math.max(0, Math.round((current / 40) * 100))); // Default fallback
    }
    default: return 0;
  }
};
