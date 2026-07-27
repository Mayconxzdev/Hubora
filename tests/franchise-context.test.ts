import { describe, expect, it } from 'vitest';
import { getCrossMediaSearchContext } from '@/services/franchiseContext';

describe('contexto verificável de descoberta entre formatos', () => {
  it('usa a coleção declarada pelo TMDB e remove apenas o sufixo de coleção', () => {
    expect(getCrossMediaSearchContext({
      id: 'tmdb-movie-969681',
      title: 'Homem-Aranha: Um Novo Dia',
      mediaType: 'movie',
      collection: { provider: 'tmdb', providerId: '556', name: 'Coleção Homem-Aranha' },
    })).toEqual({
      query: 'Homem-Aranha',
      label: 'Coleção Homem-Aranha',
      provider: 'tmdb',
      providerId: '556',
    });
  });

  it('não cria uma franquia a partir de nome, gênero ou popularidade parecidos', () => {
    expect(getCrossMediaSearchContext({
      id: 'tmdb-movie-969681',
      title: 'Homem-Aranha: Um Novo Dia',
      originalTitle: 'Spider-Man: Brand New Day',
      mediaType: 'movie',
      genres: ['Aventura'],
      popularity: 999,
    })).toBeNull();
  });
});
