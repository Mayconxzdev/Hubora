import { beforeEach, describe, expect, it } from 'vitest';
import { huboraDb } from '@/lib/db';
import { localRepository } from '@/services/localRepository';
import type { UserMediaEntry } from '@/types';

const entry: UserMediaEntry = {
  id: 'tmdb:movie:550',
  canonicalId: 'tmdb:movie:550',
  mediaId: '550',
  mediaType: 'movie',
  title: 'Fight Club',
  status: 'completed',
  sourceId: '550',
  source: 'tmdb',
  media: { id: '550', title: 'Fight Club', mediaType: 'movie', source: 'tmdb' },
  progress: { watched: true },
  priority: 'medium',
  tags: [],
  isFavorite: false,
  isTrackedRelease: false,
  dateAdded: 1784203200000,
  lastUpdated: 1784203200000,
  lastInteractedAt: 1784203200000,
  revision: 1,
};

describe('repositório local-first', () => {
  beforeEach(async () => {
    await huboraDb.delete();
    await huboraDb.open();
  });

  it('grava primeiro no IndexedDB e registra outbox', async () => {
    await localRepository.putLibraryEntry(entry, true);
    const stored = await localRepository.getLibrary();
    const pending = await localRepository.getOutbox();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(entry.id);
    expect(pending).toHaveLength(1);
    expect(pending[0].entity).toBe('library');
  });

  it('mantém somente a alteração pendente mais recente por item', async () => {
    await localRepository.putLibraryEntry(entry, true);
    await localRepository.putLibraryEntry({ ...entry, rating: 4.5, lastUpdated: entry.lastUpdated + 1 }, true);
    const pending = await localRepository.getOutbox();
    expect(pending).toHaveLength(1);
    expect((pending[0].payload as UserMediaEntry).rating).toBe(4.5);
  });

  it('sincroniza eventos do diário e aplica exclusão remota sem criar nova outbox', async () => {
    await localRepository.putLibraryEntry(entry, false);
    await localRepository.addConsumptionEvent({
      id: 'event-1', entryId: entry.id, kind: 'completed', occurredAt: entry.lastUpdated,
    }, true);
    expect((await localRepository.getOutbox()).map((operation) => operation.entity)).toEqual(['consumption_event']);

    await localRepository.applyRemoteLibrary([], [entry.id]);
    expect(await localRepository.getLibrary()).toHaveLength(0);
    expect(await localRepository.countOutbox()).toBe(1);
  });
});
