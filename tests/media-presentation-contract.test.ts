import { describe, expect, it } from 'vitest';
import { getMediaPresentationContract } from '@/services/mediaPresentation';

describe('Media Presentation Contracts (Registro Central por Categoria)', () => {
  it('retorna o contrato correto de Filmes sem episódios, temporadas ou capítulos', () => {
    const contract = getMediaPresentationContract('movie');
    expect(contract.displayName).toBe('Filme');
    expect(contract.hasEpisodes).toBe(false);
    expect(contract.hasSeasons).toBe(false);
    expect(contract.hasChapters).toBe(false);
    expect(contract.hasPlaytimeHours).toBe(false);
  });

  it('retorna o contrato correto de Séries com episódios e temporadas', () => {
    const contract = getMediaPresentationContract('series');
    expect(contract.displayName).toBe('Série');
    expect(contract.hasEpisodes).toBe(true);
    expect(contract.hasSeasons).toBe(true);
    expect(contract.hasChapters).toBe(false);
  });

  it('retorna o contrato correto de Livros sem players ou trailers', () => {
    const contract = getMediaPresentationContract('book');
    expect(contract.displayName).toBe('Livro');
    expect(contract.allowTrailers).toBe(false);
    expect(contract.hasPages).toBe(true);
    expect(contract.hasEpisodes).toBe(false);
  });

  it('retorna o contrato correto de Novels com suporte a capítulos e volumes', () => {
    const contract = getMediaPresentationContract('novel');
    expect(contract.displayName).toBe('Novel');
    expect(contract.hasChapters).toBe(true);
    expect(contract.allowTrailers).toBe(false);
  });

  it('retorna o contrato correto de Jogos com horas manuais e plataformas', () => {
    const contract = getMediaPresentationContract('game');
    expect(contract.displayName).toBe('Jogo');
    expect(contract.hasPlaytimeHours).toBe(true);
    expect(contract.hasPlatforms).toBe(true);
    expect(contract.hasEpisodes).toBe(false);
  });

  it('oculta abas de vídeo em mídias de leitura quando não houver vídeos reais', () => {
    const bookContract = getMediaPresentationContract('book');
    const itemWithoutVideo = { title: 'Dom Casmurro', pages: 200 };
    const visibleTabs = bookContract.allowedTabs.filter((t) => t.isVisible(itemWithoutVideo));
    expect(visibleTabs.some((t) => t.id === 'videos')).toBe(false);
  });
});
