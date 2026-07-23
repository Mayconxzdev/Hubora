import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBooksWithFallback, getOfficialReadableCatalogItem } from '@/services/apiBookService';

describe('fallback oficial de metadados para quadrinhos', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('usa o registro da editora sem oferecer reprodução do quadrinho comercial', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const results = await fetchBooksWithFallback(
      '/api/google-books?q=Batman%3A+O+Cavaleiro+das+Trevas',
      'comic',
      'Batman: O Cavaleiro das Trevas',
    );

    expect(results[0]).toMatchObject({
      title: 'Batman: O Cavaleiro das Trevas',
      mediaType: 'comic',
      source: 'official-publisher',
      authors: ['Frank Miller', 'Klaus Janson'],
      providerUrl: 'https://panini.com.br/batman-o-cavaleiro-das-trevas-dc-de-bolso',
      access: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mantém novels no domínio próprio usando a edição oficial', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const results = await fetchBooksWithFallback(
      '/api/google-books?q=Solo+Leveling',
      'novel',
      'Solo Leveling',
    );

    expect(results[0]).toMatchObject({
      title: 'Solo Leveling',
      mediaType: 'novel',
      source: 'official-publisher',
      authors: ['Chugong'],
      providerUrl: 'https://yenpress.com/series/solo-leveling-novel',
      access: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reconstrói os detalhes oficiais pelo identificador do card', () => {
    expect(getOfficialReadableCatalogItem('official-comic-spider-man-blue')).toMatchObject({
      title: 'Spider-Man: Blue',
      mediaType: 'comic',
      source: 'official-publisher',
    });
    expect(getOfficialReadableCatalogItem('official-novel-overlord')).toMatchObject({
      title: 'Overlord',
      mediaType: 'novel',
      source: 'official-publisher',
    });
  });
});
