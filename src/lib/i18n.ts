import { MediaItem } from '@/types';
import { TranslationKey } from '@/lib/translations';

export const getMediaI18n = (t: (key: TranslationKey) => string) => ({
  displayTitle: (item: MediaItem) => item.title || item.originalTitle || t('media.untitled'),
  displayOverview: (item: MediaItem) => item.overview || t('media.no_overview'),
  displayTypeLabel: (type: string) => {
    switch (type) {
      case 'movie': return t('media.type.movie');
      case 'tv': return t('media.type.tv');
      case 'anime': return t('media.type.anime');
      case 'manga': return t('media.type.manga');
      case 'comic': return t('media.type.comic');
      default: return type;
    }
  },
  displayMetadata: (item: MediaItem) => {
    const parts = [];
    if (item.releaseDate) parts.push(new Date(item.releaseDate).getFullYear());
    if (item.voteAverage) parts.push(`★ ${item.voteAverage.toFixed(1)}`);
    return parts.join(' • ');
  }
});
