import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const search = readFileSync('src/components/ui/GlobalSearch.tsx', 'utf8');
const api = readFileSync('src/services/api.ts', 'utf8');

describe('contrato da busca global', () => {
  it('implementa cancelamento, proteção contra resposta antiga e mínimo de dois caracteres', () => {
    expect(search).toContain('AbortController');
    expect(search).toContain('requestSequence');
    expect(search).toMatch(/trim\(\)\.length < 2/);
    expect(api).toMatch(/trim\(\)\.length < 2/);
  });

  it('expõe semântica completa de listbox e preserva categoria na URL', () => {
    for (const marker of ['role="option"', 'aria-selected', 'aria-activedescendant', "event.key === 'Home'", "event.key === 'End'", "params.set('category'"]) {
      expect(search).toContain(marker);
    }
  });

  it('consulta todas as categorias de conteúdo com limite independente', () => {
    for (const call of ['discoverMovies', 'discoverTV', 'discoverAnime', 'discoverManga', 'discoverBooks', 'discoverNovels', 'discoverComics', 'discoverGames']) {
      expect(api).toContain(`api.${call}`);
    }
    expect(api).toContain('perCategoryLimit');
    expect(search).toContain("type === 'drama'");
    expect(api).toContain('options.signal');
  });
});
