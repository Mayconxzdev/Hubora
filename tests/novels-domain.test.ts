import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { getOpenLibraryArchiveAccess } from '@/services/apiBookService';
import { createHuboraBackup, parseHuboraBackup } from '@/services/backup';
import { safeReaderSource } from '@/pages/Reader';
import { CATEGORY_NAVIGATION } from '@/config/navigation';
import type { UserMediaEntry } from '@/types';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Novels como domínio próprio', () => {
  it('possui página, rota e navegação próprias', () => {
    expect(existsSync(resolve(process.cwd(), 'src/pages/Novels.tsx'))).toBe(true);
    expect(readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')).toMatch(/path="\/novels"/);
    expect(CATEGORY_NAVIGATION).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'novels', label: 'Novels', path: '/novels' }),
    ]));
  });

  it('descobre novels sem reclassificá-las como livros', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      items: [{
        id: 'volume-1',
        volumeInfo: { title: 'Novel de teste', authors: ['Autora'], language: 'pt-BR' },
        accessInfo: { embeddable: true, viewability: 'PARTIAL', webReaderLink: 'https://books.google.com/books?id=volume-1' },
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const items = await api.discoverNovels(1, 'relevance', '', 'teste-novel-unico');
    expect(items[0]).toMatchObject({ id: 'gbooks-novel-volume-1', title: 'Novel de teste', mediaType: 'novel' });
    expect(items[0].access?.[0]).toMatchObject({ kind: 'book-preview', provider: 'Google Books' });
  });

  it('pagina o fallback Open Library sem repetir a primeira página', async () => {
    const requestedUrls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes('/api/google-books')) return new Response(JSON.stringify({ items: [] }), { status: 200 });
      return new Response(JSON.stringify({ docs: [] }), { status: 200 });
    });

    await api.discoverNovels(2, 'relevance', '', 'novel-paginada-unica');
    expect(requestedUrls.find((url) => url.includes('openlibrary.org/search.json'))).toContain('offset=20');
  });

  it('preserva o tipo novel ao abrir detalhes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id: 'volume-1',
      volumeInfo: { title: 'Novel detalhada', authors: ['Autora'], categories: ['Light novels'] },
      accessInfo: { embeddable: true, viewability: 'PARTIAL', webReaderLink: 'https://books.google.com/books?id=volume-1' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const item = await api.getDetails('gbooks-novel-volume-1');
    expect(item).toMatchObject({ id: 'gbooks-novel-volume-1', title: 'Novel detalhada', mediaType: 'novel' });
  });

  it('oferece leitura interna somente quando uma edição Open Library possui arquivo no Internet Archive', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/editions.json')) return new Response(JSON.stringify({ entries: [{ key: '/books/OL1M', ocaid: 'novel_archive_id' }] }), { status: 200 });
      if (url.includes('/api/books')) return new Response(JSON.stringify({
        'OLID:OL1M': { ebooks: [{ availability: 'restricted', preview_url: 'https://archive.org/details/novel_archive_id' }] },
      }), { status: 200 });
      return new Response(JSON.stringify({ title: 'Novel aberta', description: 'Descrição real.' }), { status: 200 });
    });

    const item = await api.getDetails('ol-novel-OL1W');
    expect(item?.access).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'embed', provider: 'Internet Archive', url: 'https://archive.org/embed/novel_archive_id', label: 'Ver prévia no Internet Archive', free: false }),
      expect.objectContaining({ kind: 'official-link', provider: 'Open Library' }),
    ]));
  });

  it('aceita somente fontes HTTPS no leitor web', () => {
    expect(safeReaderSource('https://archive.org/embed/novel_archive_id')).toBe('https://archive.org/embed/novel_archive_id');
    expect(safeReaderSource('http://localhost:8080/book.epub')).toBeNull();
    expect(safeReaderSource('http://192.168.0.10/book.pdf')).toBeNull();
    expect(safeReaderSource('magnet:?xt=urn:btih:unsafe')).toBeNull();
  });

  it('marca como gratuito apenas o acesso integral declarado pela Open Library', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      'OLID:OL2M': { ebooks: [{ availability: 'full' }] },
    }), { status: 200 }));

    await expect(getOpenLibraryArchiveAccess({ key: '/books/OL2M', ocaid: 'public_novel' })).resolves.toMatchObject({
      label: 'Ler no Internet Archive', free: true,
    });
  });

  it('inclui novels em backup e restauração', () => {
    const novelEntry = {
      id: 'googlebooks:novel:volume-1', mediaId: 'gbooks-novel-volume-1', sourceId: 'volume-1', source: 'googlebooks', mediaType: 'novel', title: 'Novel',
      media: { id: 'gbooks-novel-volume-1', title: 'Novel', mediaType: 'novel', source: 'googlebooks' }, status: 'planning', progress: {},
      priority: 'medium', tags: [], isFavorite: false, isTrackedRelease: false,
      dateAdded: 1, lastUpdated: 1, lastInteractedAt: 1,
    } satisfies UserMediaEntry;
    const backup = createHuboraBackup({ user: null, library: [novelEntry], customLists: [], consumptionEvents: [] });
    expect(parseHuboraBackup(backup).library[0].mediaType).toBe('novel');
  });
});
