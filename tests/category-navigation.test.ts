import { describe, expect, it } from 'vitest';
import { CATEGORY_NAVIGATION } from '@/config/navigation';

const EXPECTED = [
  ['movies', 'Filmes', '/movies', 'clapperboard'],
  ['series', 'Séries', '/series', 'tv'],
  ['doramas', 'Doramas', '/doramas', 'drama'],
  ['anime', 'Animes', '/anime', 'zap'],
  ['manga', 'Mangás', '/manga', 'layers'],
  ['comics', 'Quadrinhos', '/comics', 'panels'],
  ['books', 'Livros', '/books', 'book-open'],
  ['novels', 'Novels', '/novels', 'scroll-text'],
  ['games', 'Jogos', '/games', 'gamepad'],
] as const;

describe('registro canônico das categorias', () => {
  it('contém exatamente as nove categorias oficiais', () => {
    expect(CATEGORY_NAVIGATION.map(({ id, label, path, iconKey }) => [id, label, path, iconKey])).toEqual(EXPECTED);
  });

  it('não duplica rota, identificador, rótulo ou semântica de ícone', () => {
    for (const key of ['id', 'label', 'path', 'iconKey'] as const) {
      const values = CATEGORY_NAVIGATION.map((category) => category[key]);
      expect(new Set(values).size, `${key} deve ser único`).toBe(9);
    }
  });
});
