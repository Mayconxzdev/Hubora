import { describe, expect, it } from 'vitest';
import health from '../netlify/functions/health.mts';
import games from '../netlify/functions/games.mts';
import tmdb from '../netlify/functions/tmdb.mts';
import googleBooks from '../netlify/functions/google-books.mts';
import freeCatalog from '../netlify/functions/free-catalog.mts';

describe('Netlify functions', () => {
  it('returns local-first health without credentials', async () => {
    const response = await health(new Request('http://localhost/api/health'), {} as never);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, localFirst: true });
  });

  it('reports optional game integrations without exposing secrets', async () => {
    const response = await games(
      new Request('http://localhost/api/games/status'),
      { params: { action: 'status' } } as never,
    );
    expect(response.status).toBe(200);
    const payload = await response.json() as Record<string, string>;
    expect(payload).toHaveProperty('igdb');
    expect(payload).toHaveProperty('cheapshark', 'available');
    expect(JSON.stringify(payload)).not.toContain('secret');
  });

  it('rejects arbitrary TMDB proxy paths', async () => {
    const response = await tmdb(new Request('http://localhost/api/tmdb?path=https://example.com'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'Rota TMDB não permitida.' });
  });

  it('keeps the TMDB credential on the server', async () => {
    const previousFetch = globalThis.fetch;
    const previousKey = process.env.TMDB_API_KEY;
    const fakeKey = 'server-only-test-key';
    let upstreamUrl = '';
    process.env.TMDB_API_KEY = fakeKey;
    globalThis.fetch = async (input) => {
      upstreamUrl = String(input);
      return new Response(JSON.stringify({ results: [{ id: 1, title: 'Teste' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    try {
      const response = await tmdb(
        new Request('http://localhost/api/tmdb?path=/search/movie&query=teste'),
      );
      expect(response.status).toBe(200);
      expect(upstreamUrl).toContain('/search/movie');
      expect(upstreamUrl).toContain(`api_key=${fakeKey}`);
      expect(await response.text()).not.toContain(fakeKey);
    } finally {
      globalThis.fetch = previousFetch;
      if (previousKey === undefined) delete process.env.TMDB_API_KEY;
      else process.env.TMDB_API_KEY = previousKey;
    }
  });

  it('permite apenas a rota de coleção TMDB necessária ao Guia verificável', async () => {
    const previousFetch = globalThis.fetch;
    const previousKey = process.env.TMDB_API_KEY;
    let upstreamUrl = '';
    process.env.TMDB_API_KEY = 'server-only-test-key';
    globalThis.fetch = async (input) => {
      upstreamUrl = String(input);
      return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    };

    try {
      const response = await tmdb(new Request('http://localhost/api/tmdb?path=/search/collection&query=Star%20Wars'));
      expect(response.status).toBe(200);
      expect(upstreamUrl).toContain('/search/collection');
      expect(upstreamUrl).toContain('query=Star+Wars');
    } finally {
      globalThis.fetch = previousFetch;
      if (previousKey === undefined) delete process.env.TMDB_API_KEY;
      else process.env.TMDB_API_KEY = previousKey;
    }
  });

  it('mantém a chave do Google Books no servidor', async () => {
    const previousFetch = globalThis.fetch;
    const previousKey = process.env.GOOGLE_BOOKS_API_KEY;
    const fakeKey = 'google-books-server-only-test-key';
    let upstreamUrl = '';
    process.env.GOOGLE_BOOKS_API_KEY = fakeKey;
    globalThis.fetch = async (input) => {
      upstreamUrl = String(input);
      return new Response(JSON.stringify({ items: [{ id: 'volume-1' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    };

    try {
      const response = await googleBooks(new Request('http://localhost/api/google-books?q=light%20novel&maxResults=20'));
      expect(response.status).toBe(200);
      expect(upstreamUrl).toContain('books/v1/volumes');
      expect(upstreamUrl).toContain('langRestrict=pt');
      expect(upstreamUrl).toContain('printType=books');
      expect(upstreamUrl).toContain(`key=${fakeKey}`);
      expect(await response.text()).not.toContain(fakeKey);
    } finally {
      globalThis.fetch = previousFetch;
      if (previousKey === undefined) delete process.env.GOOGLE_BOOKS_API_KEY;
      else process.env.GOOGLE_BOOKS_API_KEY = previousKey;
    }
  });

  it('normaliza indisponibilidade temporária do Google Books para que o navegador acione o fallback', async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('temporarily unavailable', { status: 503 });
    try {
      const response = await googleBooks(new Request('http://localhost/api/google-books?q=Spider-Man'));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ items: [], providerStatus: 'unavailable', upstreamStatus: 503 });
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it('normaliza falha de configuração do Google Books sem encaminhar um 400 ao navegador', async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { status: 'INVALID_ARGUMENT' } }), { status: 400 });
    try {
      const response = await googleBooks(new Request('http://localhost/api/google-books?q=Spider-Man%3A%20Blue'));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ items: [], providerStatus: 'unavailable', upstreamStatus: 400 });
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it('mantém uma obra de domínio público verificável quando Google Books está indisponível', async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes('googleapis.com/books')) return new Response('temporarily unavailable', { status: 503 });
      return new Response(JSON.stringify({ docs: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    try {
      const response = await freeCatalog(new Request('http://localhost/api/free-catalog?q=A%20Metamorfose'));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        items: [expect.objectContaining({ title: 'A Metamorfose', source: 'Domínio Público / MEC' })],
        sources: { googleBooks: 'unavailable' },
      });
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
