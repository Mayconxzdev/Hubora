import type { MediaItem, ProviderIdentity, UserMediaEntry } from '@/types';

const PROVIDER_PREFIXES: Record<string, string> = {
  tmdb: 'tmdb',
  anilist: 'anilist',
  mal: 'mal',
  jikan: 'mal',
  igdb: 'igdb',
  rawg: 'rawg',
  steam: 'steam',
  openlibrary: 'openlibrary',
  ol: 'openlibrary',
  googlebooks: 'googlebooks',
  gbooks: 'googlebooks',
  comicvine: 'comicvine',
  hubora: 'hubora',
};

export function normalizeProvider(value?: string): string {
  const normalized = (value || 'hubora').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return PROVIDER_PREFIXES[normalized] || normalized || 'hubora';
}

export function parseProviderIdentity(media: MediaItem): ProviderIdentity {
  const rawId = String(media.id);
  const prefixed = rawId.match(/^([a-zA-Z]+)[-:]([\s\S]+)$/);
  const provider = normalizeProvider(media.source || prefixed?.[1] || inferProvider(media));
  const providerId = String(media.sourceId ?? prefixed?.[2] ?? media.tmdbId ?? media.malId ?? rawId);

  return {
    provider,
    providerId,
    mediaType: media.mediaType,
    verifiedAt: Date.now(),
  };
}

function inferProvider(media: MediaItem): string {
  if (media.tmdbId) return 'tmdb';
  if (media.malId) return 'mal';
  return 'hubora';
}

export function createEntryId(media: MediaItem): string {
  const identity = parseProviderIdentity(media);
  return `${identity.provider}:${identity.mediaType}:${identity.providerId}`;
}

export function createWorkFingerprint(media: Pick<MediaItem, 'title' | 'originalTitle' | 'releaseDate' | 'mediaType'>): string {
  const title = normalizeText(media.originalTitle || media.title);
  const year = media.releaseDate?.match(/\d{4}/)?.[0] || 'unknown';
  return `${media.mediaType}:${title}:${year}`;
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}


export function findLibraryEntry(
  library: Record<string, UserMediaEntry>,
  media: MediaItem,
): UserMediaEntry | undefined {
  const canonicalId = createEntryId(media);
  if (library[canonicalId]) return library[canonicalId];

  const identity = parseProviderIdentity(media);
  return Object.values(library).find((entry) => {
    if (entry.mediaType !== media.mediaType) return false;
    const identities = entry.providerIdentities || [];
    if (identities.some((candidate) =>
      normalizeProvider(candidate.provider) === identity.provider &&
      String(candidate.providerId) === identity.providerId &&
      candidate.mediaType === identity.mediaType
    )) return true;

    return normalizeProvider(entry.source) === identity.provider &&
      String(entry.sourceId) === identity.providerId;
  });
}
