import { beforeEach, describe, expect, it } from 'vitest';
import { huboraDb } from '@/lib/db';
import { createAutomaticBackup, ensureAutomaticBackup, listAutomaticBackups, readAutomaticBackup } from '@/services/automaticBackup';
import { localRepository } from '@/services/localRepository';
import type { UserMediaEntry } from '@/types';

const entry: UserMediaEntry = {
  id: 'tmdb:movie:42', canonicalId: 'tmdb:movie:42', mediaId: '42', sourceId: '42', source: 'tmdb', mediaType: 'movie',
  title: 'Backup', media: { id: '42', source: 'tmdb', sourceId: '42', title: 'Backup', mediaType: 'movie' },
  status: 'planning', progress: {}, priority: 'medium', tags: [], isFavorite: false, isTrackedRelease: false,
  dateAdded: 1, lastUpdated: 1, lastInteractedAt: 1, visibility: 'private', adultPrivate: false,
};

describe('backup automático local', () => {
  beforeEach(async () => {
    await huboraDb.delete();
    await huboraDb.open();
  });

  it('cria snapshot restaurável e respeita o intervalo de 24 horas', async () => {
    await localRepository.putLibraryEntry(entry, false);
    await createAutomaticBackup(null);
    const snapshots = await listAutomaticBackups();
    expect(snapshots).toHaveLength(1);
    const restored = await readAutomaticBackup(snapshots[0].id);
    expect(restored?.library[0].title).toBe('Backup');
    expect(await ensureAutomaticBackup(null)).toBe(false);
  });
});
