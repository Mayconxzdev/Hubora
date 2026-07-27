import type { MediaItem } from '@/types';

export type CrossMediaSearchContext = {
  query: string;
  label: string;
  provider: 'tmdb';
  providerId: string;
};

/**
 * Returns a discovery term only when the current provider explicitly returned
 * a collection relationship. It deliberately does not infer a franchise from
 * similar titles, creators, genres or a local text match.
 */
export function getCrossMediaSearchContext(item: MediaItem): CrossMediaSearchContext | null {
  const collection = item.collection;
  if (!collection || collection.provider !== 'tmdb' || !collection.providerId || !collection.name) return null;

  const query = collection.name
    .replace(/\b(cole[çc][aã]o|collection)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (query.length < 2) return null;

  return {
    query,
    label: collection.name,
    provider: 'tmdb',
    providerId: collection.providerId,
  };
}
