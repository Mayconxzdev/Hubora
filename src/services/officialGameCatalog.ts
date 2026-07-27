import type { MediaItem } from '@/types';

/**
 * Registros de jogo cuja identidade foi confirmada na página oficial do
 * estúdio e no identificador público da loja. Eles não representam uma
 * integração de catálogo ou de reprodução: servem apenas para impedir que
 * resultados homônimos de provedores distintos sejam tratados como a mesma
 * obra durante busca, importação e restauração de detalhes.
 */
export const OFFICIAL_GAME_CATALOG: readonly MediaItem[] = [
  {
    id: 'official-game-hades',
    source: 'official-publisher',
    sourceId: 'supergiant-hades',
    title: 'Hades',
    mediaType: 'game',
    releaseDate: '2020',
    developers: ['Supergiant Games'],
    publishers: ['Supergiant Games'],
    providerUrl: 'https://www.supergiantgames.com/games/hades/',
    externalIds: { steam: '1145360' },
    access: [
      {
        id: 'official-game-hades-page',
        label: 'Abrir página oficial do jogo',
        kind: 'official-link',
        url: 'https://www.supergiantgames.com/games/hades/',
        provider: 'Supergiant Games',
        free: false,
      },
    ],
  },
];

function normalizeTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function cloneItem(item: MediaItem): MediaItem {
  return {
    ...item,
    developers: item.developers ? [...item.developers] : undefined,
    publishers: item.publishers ? [...item.publishers] : undefined,
    externalIds: item.externalIds ? { ...item.externalIds } : undefined,
    access: item.access?.map((option) => ({ ...option })),
  };
}

export function findOfficialGameByTitle(title: string, year?: string): MediaItem | null {
  const normalized = normalizeTitle(title);
  const match = OFFICIAL_GAME_CATALOG.find((item) => (
    normalizeTitle(item.title) === normalized
    && (!year || item.releaseDate?.startsWith(year))
  ));

  return match ? cloneItem(match) : null;
}

export function getOfficialGameCatalogItem(id: string): MediaItem | null {
  const match = OFFICIAL_GAME_CATALOG.find((item) => String(item.id) === id);
  return match ? cloneItem(match) : null;
}
