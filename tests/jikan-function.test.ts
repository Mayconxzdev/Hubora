import { afterEach, describe, expect, it, vi } from 'vitest';
import jikan from '../netlify/functions/jikan.mts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Função pública Jikan', () => {
  it('rejeita rotas fora da lista permitida', async () => {
    const response = await jikan(new Request('https://hubora.test/api/jikan?path=/users/me'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'Rota Jikan não permitida.' });
  });

  it('encaminha somente o endpoint e os parâmetros permitidos', async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const upstream = new URL(String(input));
      expect(upstream.href).toBe('https://api.jikan.moe/v4/top/anime?filter=airing&limit=10');
      return new Response(JSON.stringify({ data: [{ mal_id: 1 }] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchSpy);

    const response = await jikan(
      new Request('https://hubora.test/api/jikan?path=/top/anime&filter=airing&limit=10&unsafe=ignore-me'),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ data: [{ mal_id: 1 }] });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('converte indisponibilidade externa em estado honesto sem erro de navegador', async () => {
    const fetchSpy = vi.fn(async () => new Response('gateway timeout', { status: 504 }));
    vi.stubGlobal('fetch', fetchSpy);

    const response = await jikan(new Request('https://hubora.test/api/jikan?path=/top/manga&limit=10'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-hubora-provider-status')).toBe('unavailable');
    await expect(response.json()).resolves.toMatchObject({
      data: [],
      meta: { provider: 'jikan', status: 'indisponível', upstreamStatus: 504 },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

void originalFetch;
