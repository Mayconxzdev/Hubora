import { describe, expect, it } from 'vitest';
import { createEntryId, createWorkFingerprint, parseProviderIdentity } from '@/services/identity';
import type { MediaItem } from '@/types';

const item: MediaItem = {
  id: '1399',
  title: 'Game of Thrones',
  mediaType: 'tv',
  source: 'tmdb',
  releaseDate: '2011-04-17',
};

describe('identidade canônica', () => {
  it('mantém o provedor no identificador para impedir colisões', () => {
    expect(createEntryId(item)).toBe('tmdb:tv:1399');
  });

  it('extrai a identidade externa de forma estável', () => {
    expect(parseProviderIdentity(item)).toMatchObject({ provider: 'tmdb', providerId: '1399' });
  });

  it('gera fingerprint sem depender de acentos ou caixa', () => {
    const accented = { ...item, title: 'Pokémon' };
    const plain = { ...item, title: 'Pokemon' };
    expect(createWorkFingerprint(accented)).toBe(createWorkFingerprint(plain));
  });
});

import { findLibraryEntry } from '@/services/identity';
import type { UserMediaEntry } from '@/types';

it('não confunde IDs numéricos iguais de provedores diferentes', () => {
  const tmdbEntry = {
    id: 'tmdb:movie:42', canonicalId: 'tmdb:movie:42', mediaId: 42, sourceId: 42, source: 'tmdb',
    mediaType: 'movie', title: 'Filme', media: { id: 42, title: 'Filme', mediaType: 'movie', source: 'tmdb' },
    status: 'planning', progress: {}, priority: 'medium', tags: [], isFavorite: false, isTrackedRelease: false,
    dateAdded: 1, lastUpdated: 1, lastInteractedAt: 1,
  } satisfies UserMediaEntry;
  const anilistEntry = {
    ...tmdbEntry,
    id: 'anilist:anime:42', canonicalId: 'anilist:anime:42', source: 'anilist', mediaType: 'anime', title: 'Anime',
    media: { id: 42, title: 'Anime', mediaType: 'anime', source: 'anilist' },
  } satisfies UserMediaEntry;
  const library = { [tmdbEntry.id]: tmdbEntry, [anilistEntry.id]: anilistEntry };

  expect(findLibraryEntry(library, anilistEntry.media)?.id).toBe('anilist:anime:42');
  expect(findLibraryEntry(library, tmdbEntry.media)?.id).toBe('tmdb:movie:42');
});
