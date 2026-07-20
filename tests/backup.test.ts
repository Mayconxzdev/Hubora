import { describe, expect, it } from 'vitest';
import { createHuboraBackup, parseHuboraBackup } from '@/services/backup';
import type { UserMediaEntry } from '@/types';

const entry: UserMediaEntry = {
  id: 'tmdb:movie:1', mediaId: 1, sourceId: 1, source: 'tmdb', mediaType: 'movie', title: 'Teste',
  media: { id: 1, title: 'Teste', mediaType: 'movie', source: 'tmdb' }, status: 'planning', progress: {},
  priority: 'medium', tags: [], isFavorite: false, isTrackedRelease: false,
  dateAdded: 1, lastUpdated: 1, lastInteractedAt: 1,
};

describe('backup portátil', () => {
  it('valida um backup completo da versão 3', () => {
    const backup = createHuboraBackup({ user: null, library: [entry], customLists: [], consumptionEvents: [] });
    expect(parseHuboraBackup(backup).library[0].id).toBe(entry.id);
  });

  it('aceita o formato legado com biblioteca em mapa', () => {
    const restored = parseHuboraBackup({ library: { [entry.id]: entry }, user: null, exportedAt: new Date().toISOString() });
    expect(restored.version).toBe(3);
    expect(restored.library).toHaveLength(1);
  });

  it('rejeita dados sem identidade e mídia válidas', () => {
    expect(() => parseHuboraBackup({ format: 'hubora-backup', version: 2, exportedAt: 'x', user: null, library: [{}], customLists: [], consumptionEvents: [] })).toThrow();
  });
});
