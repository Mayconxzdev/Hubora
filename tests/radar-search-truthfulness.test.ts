import { beforeEach, describe, expect, it, vi } from 'vitest';

const { searchMulti } = vi.hoisted(() => ({ searchMulti: vi.fn() }));

vi.mock('@/services/api', () => ({
  api: { searchMulti },
}));

import { searchCatalogFromText, searchSceneDescription } from '@/services/radarSearch';

describe('evidências do Radar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('descarta candidatos sem qualquer correspondência textual com a descrição', async () => {
    searchMulti.mockResolvedValue([
      { id: 'book-1', title: 'Orbital', overview: 'Uma história de amizade em uma cidade.', mediaType: 'book' },
    ]);

    await expect(searchSceneDescription('astronautas atravessam um buraco de minhoca para salvar a humanidade')).resolves.toEqual([]);
  });

  it('não converte a posição do resultado em um percentual de certeza', async () => {
    searchMulti.mockResolvedValue([
      { id: 'movie-1', title: 'Interestelar', overview: 'Astronautas cruzam um buraco de minhoca.', mediaType: 'movie', releaseDate: '2014-11-05' },
    ]);

    const candidates = await searchSceneDescription('astronautas atravessam um buraco de minhoca para salvar a humanidade');

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      title: 'Interestelar',
      reason: expect.stringContaining('Pista textual encontrada nos metadados'),
    });
    expect(candidates[0].confidence).toBeLessThan(0.68);
  });

  it('atribui alta confiança de OCR apenas para uma coincidência exata de título', async () => {
    searchMulti.mockResolvedValue([
      { id: 'movie-1', title: 'Interestelar', overview: 'Ficção científica.', mediaType: 'movie', releaseDate: '2014-11-05' },
    ]);

    const candidates = await searchCatalogFromText('INTERESTELAR');

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ confidence: 0.99, reason: expect.stringContaining('coincide exatamente') });
  });
});
