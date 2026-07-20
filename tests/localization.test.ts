import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';

describe('localização brasileira dos catálogos', () => {
  afterEach(() => vi.restoreAllMocks());

  it('prioriza livros em português na busca do Google Books', async () => {
    const requestedUrls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      requestedUrls.push(String(input));
      return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    });

    await api.discoverBooks(1, 'relevance', '', 'teste-localizacao-unico');
    const googleRequest = requestedUrls.find((url) => url.includes('googleapis.com')) || '';
    expect(googleRequest).toContain('langRestrict=pt');
    expect(googleRequest).toContain('printType=books');
  });

  it('envia idioma pt-BR e região BR para próximos filmes', async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes('api.jikan.moe')) return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
      if (url.includes('/api/games/')) return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
      if (url.includes('googleapis.com')) return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
      return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    });

    await api.getUpcoming();
    const movieRequest = urls.find((url) => url.includes('path=%2Fmovie%2Fupcoming')) || '';
    expect(movieRequest).toContain('region=BR');
    expect(movieRequest).toContain('language=pt-BR');
  });
});
