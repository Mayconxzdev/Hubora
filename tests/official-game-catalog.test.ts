import { describe, expect, it } from 'vitest';
import { findOfficialGameByTitle, getOfficialGameCatalogItem } from '@/services/officialGameCatalog';

describe('catálogo oficial de jogos com títulos homônimos', () => {
  it('resolve Hades da Supergiant pela identidade verificada, sem combinar obras só pelo título', () => {
    expect(findOfficialGameByTitle('Hades')).toMatchObject({
      id: 'official-game-hades',
      title: 'Hades',
      mediaType: 'game',
      developers: ['Supergiant Games'],
      externalIds: { steam: '1145360' },
    });
    expect(findOfficialGameByTitle('Hades', '1995')).toBeNull();
  });

  it('restaura os detalhes pelo identificador estável depois de recarregar', () => {
    expect(getOfficialGameCatalogItem('official-game-hades')).toMatchObject({
      title: 'Hades',
      providerUrl: 'https://www.supergiantgames.com/games/hades/',
    });
  });
});
