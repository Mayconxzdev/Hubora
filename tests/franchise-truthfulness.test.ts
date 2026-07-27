import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMovieCollectionByQuery } = vi.hoisted(() => ({ getMovieCollectionByQuery: vi.fn() }));

vi.mock('@/services/api', () => ({
  api: { getMovieCollectionByQuery },
}));

import { buildFranchiseOrder } from '@/services/franchise';

describe('guia de franquias verificável', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não transforma resultados de busca por título em uma franquia', async () => {
    getMovieCollectionByQuery.mockResolvedValue(null);

    await expect(buildFranchiseOrder('Star Wars')).resolves.toBeNull();
    expect(getMovieCollectionByQuery).toHaveBeenCalledWith('Star Wars');
  });

  it('mantém somente filmes da coleção relacionada explicitamente pelo TMDB', async () => {
    getMovieCollectionByQuery.mockResolvedValue({
      name: 'Star Wars Collection',
      overview: 'Filmes da coleção.',
      items: [
        { id: 'tmdb-movie-11', title: 'Guerra nas Estrelas', mediaType: 'movie', releaseDate: '1977-05-25' },
        { id: 'tmdb-movie-1891', title: 'O Império Contra-Ataca', mediaType: 'movie', releaseDate: '1980-05-20' },
      ],
    });

    const guide = await buildFranchiseOrder('Star Wars');

    expect(guide).toMatchObject({
      franchiseName: 'Star Wars Collection',
      source: 'Coleção cinematográfica relacionada explicitamente pelo TMDB',
      items: [
        { title: 'Guerra nas Estrelas', type: 'movie', year: 1977 },
        { title: 'O Império Contra-Ataca', type: 'movie', year: 1980 },
      ],
    });
    expect(guide?.items.every((item) => item.type === 'movie')).toBe(true);
  });
});
