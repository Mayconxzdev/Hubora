import { describe, expect, it, vi } from 'vitest';
import { canDisplayMedia, classifyAdult, getAdultMode } from '@/services/adultPolicy';
import { pickFromBacklog } from '@/services/roulette';
import { calculateWrapped } from '@/services/wrapped';
import type { ConsumptionEvent, MediaItem, UserMediaEntry, UserProfile } from '@/types';

const media = (overrides: Partial<MediaItem> = {}): MediaItem => ({ id: '1', title: 'Obra', mediaType: 'movie', genres: ['Drama'], ...overrides });
const entry = (overrides: Partial<UserMediaEntry> = {}): UserMediaEntry => ({
  id: 'tmdb:movie:1', mediaId: '1', sourceId: '1', source: 'tmdb', mediaType: 'movie', title: 'Obra',
  media: media(), status: 'planning', progress: {}, priority: 'medium', tags: [], isFavorite: false,
  isTrackedRelease: false, dateAdded: Date.now() - 200 * 86_400_000, lastUpdated: Date.now(), lastInteractedAt: Date.now(),
  visibility: 'private', adultPrivate: false, ...overrides,
});
const profile = (adultMode: 'off' | 'mature' | 'vault'): UserProfile => ({
  uid: 'u1', name: 'Pessoa', preferences: { theme: 'dark', adultContent: adultMode !== 'off', adultMode, adultVaultEnabled: adultMode === 'vault', birthYear: new Date().getFullYear() - 25, adultConfirmed: true, language: 'pt-BR' },
  stats: { totalWatched: 0, totalRead: 0, timeSpent: 0 },
});

describe('política adulta', () => {
  it('separa conteúdo maduro de explicitamente adulto', () => {
    expect(classifyAdult(media({ ageRating: 18 }))).toBe('mature');
    expect(classifyAdult(media({ isAdult: true }))).toBe('explicit');
  });

  it('exige confirmação de maioridade e desbloqueio do Cofre', () => {
    const explicit = media({ explicitContent: true });
    expect(canDisplayMedia(explicit, profile('mature'), true)).toBe(false);
    expect(canDisplayMedia(explicit, profile('vault'), false)).toBe(false);
    expect(canDisplayMedia(explicit, profile('vault'), true)).toBe(true);
    const unconfirmed = profile('vault');
    unconfirmed.preferences.adultConfirmed = false;
    expect(getAdultMode(unconfirmed)).toBe('off');
  });
});

describe('Backlog Roulette', () => {
  it('prioriza obra marcada como obrigatória e compatível com o humor', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const normal = entry({ id: 'normal', title: 'Normal' });
    const must = entry({ id: 'must', title: 'Prioridade', priority: 'must', media: media({ genres: ['Comedy'] }) });
    const result = pickFromBacklog([normal, must], { mood: 'light', minutes: 100 });
    expect(result?.entry.id).toBe('must');
    expect(result?.reasons.join(' ')).toContain('prioridade máxima');
    vi.restoreAllMocks();
  });
});

describe('Hubora Wrapped', () => {
  it('calcula horas, conclusão e streak localmente', () => {
    const year = 2026;
    const items = [entry({ status: 'completed', lastUpdated: new Date(`${year}-02-10`).getTime(), rating: 5 })];
    const events: ConsumptionEvent[] = [
      { id: 'e1', entryId: items[0].id, kind: 'session', value: 120, occurredAt: new Date(`${year}-02-10T12:00:00Z`).getTime() },
      { id: 'e2', entryId: items[0].id, kind: 'session', value: 60, occurredAt: new Date(`${year}-02-11T12:00:00Z`).getTime() },
    ];
    const wrapped = calculateWrapped(items, events, year);
    expect(wrapped.completed).toBe(1);
    expect(wrapped.totalMinutes).toBe(180);
    expect(wrapped.longestStreak).toBe(2);
  });
});
