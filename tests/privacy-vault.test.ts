import { beforeEach, describe, expect, it } from 'vitest';
import { entriesSafeForSharing, eventsSafeForSharing } from '@/services/privacy';
import { calculateWrapped } from '@/services/wrapped';
import { getVaultLockoutRemaining, hasVaultPin, removeVaultPin, setVaultPin, verifyVaultPin } from '@/services/vault';
import type { ConsumptionEvent, MediaItem, UserMediaEntry } from '@/types';

const makeMedia = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: '1', source: 'tmdb', sourceId: '1', title: 'Obra segura', mediaType: 'movie', genres: ['Drama'], ...overrides,
});

const makeEntry = (overrides: Partial<UserMediaEntry> = {}): UserMediaEntry => ({
  id: 'tmdb:movie:1', canonicalId: 'tmdb:movie:1', mediaId: '1', sourceId: '1', source: 'tmdb', mediaType: 'movie',
  title: 'Obra segura', media: makeMedia(), status: 'completed', progress: {}, priority: 'medium', tags: [],
  isFavorite: false, isTrackedRelease: false, dateAdded: Date.now(), lastUpdated: new Date('2026-03-02').getTime(),
  lastInteractedAt: Date.now(), visibility: 'private', adultPrivate: false, ...overrides,
});

describe('privacidade em compartilhamentos', () => {
  it('remove itens adultos e seus eventos de códigos Duo e Wrapped compartilhável', () => {
    const safe = makeEntry();
    const adult = makeEntry({
      id: 'anilist:anime:2', canonicalId: 'anilist:anime:2', title: 'Segredo', mediaType: 'anime', adultPrivate: true,
      media: makeMedia({ id: '2', source: 'anilist', sourceId: '2', title: 'Segredo', mediaType: 'anime', isAdult: true, genres: ['Adulto'] }),
    });
    const events: ConsumptionEvent[] = [
      { id: 'safe-event', entryId: safe.id, kind: 'session', value: 60, occurredAt: new Date('2026-03-02T12:00:00Z').getTime() },
      { id: 'adult-event', entryId: adult.id, kind: 'session', value: 600, occurredAt: new Date('2026-03-02T14:00:00Z').getTime() },
    ];

    expect(entriesSafeForSharing([safe, adult]).map((item) => item.id)).toEqual([safe.id]);
    expect(eventsSafeForSharing(events, [safe, adult]).map((item) => item.id)).toEqual(['safe-event']);
    expect(calculateWrapped([safe, adult], events, 2026).totalMinutes).toBe(60);
    expect(calculateWrapped([safe, adult], events, 2026).topTitles).not.toContain('Segredo');
    expect(calculateWrapped([safe, adult], events, 2026, { includeAdultPrivate: true }).totalMinutes).toBe(660);
  });
});

describe('PIN do Cofre', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    removeVaultPin();
  });

  it('usa derivação forte, valida o PIN e bloqueia após tentativas repetidas', async () => {
    await setVaultPin('2580');
    expect(hasVaultPin()).toBe(true);
    expect(localStorage.getItem('hubora_adult_vault_pin_record')).toContain('"version":2');
    expect(localStorage.getItem('hubora_adult_vault_pin_record')).not.toContain('2580');
    expect(await verifyVaultPin('2580')).toBe(true);

    for (let attempt = 0; attempt < 5; attempt += 1) await verifyVaultPin('0000');
    expect(getVaultLockoutRemaining()).toBeGreaterThan(0);
    expect(await verifyVaultPin('2580')).toBe(false);
  }, 20_000);
});
