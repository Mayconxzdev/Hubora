import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectStremioProvider, resolveSafeStremioStreams, searchStremioCatalog } from '@/services/providerProtocol';
import type { ProviderConfig } from '@/types';

const config: ProviderConfig = {
  id: 'stremio:test',
  manifestUrl: 'https://provider.example/manifest.json',
  name: 'Provider de teste',
  enabled: true,
  officialOnly: true,
  capabilities: ['catalog', 'search', 'details', 'stream'],
  mediaTypes: ['movie', 'tv'],
  createdAt: 1,
  updatedAt: 1,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Hubora Provider Protocol', () => {
  it('rejeita manifesto remoto sem HTTPS antes de fazer a chamada', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(inspectStremioProvider('http://example.com/manifest.json')).rejects.toThrow(/HTTPS/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('normaliza recursos declarados por um manifesto compatível', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id: 'org.example.catalog',
      name: 'Catálogo autorizado',
      version: '1.0.0',
      resources: ['catalog', 'meta', 'stream'],
      types: ['movie', 'series'],
      catalogs: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const result = await inspectStremioProvider('https://provider.example/manifest.json');
    expect(result.config.capabilities).toEqual(expect.arrayContaining(['catalog', 'search', 'details', 'stream']));
    expect(result.config.mediaTypes).toEqual(expect.arrayContaining(['movie', 'tv']));
  });

  it('aceita HTTPS e YouTube mas falha fechado para HTTP, magnet, infoHash e torrent', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      streams: [
        { title: 'HLS autorizado', url: 'https://media.example/video/master.m3u8' },
        { title: 'Vídeo autorizado', url: 'https://media.example/video/file.mp4' },
        { title: 'YouTube oficial', ytId: 'abc123' },
        { title: 'Torrent', url: 'https://media.example/file.torrent' },
        { title: 'HTTP remoto', url: 'http://media.example/file.mp4' },
        { title: 'HTTP localhost', url: 'http://127.0.0.1:49821/file.mp4' },
        { title: 'HTTP LAN', url: 'http://192.168.1.20/file.mp4' },
        { title: 'Magnet', url: 'magnet:?xt=urn:btih:abc' },
        { title: 'InfoHash', infoHash: '0123456789abcdef0123456789abcdef01234567' },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const streams = await resolveSafeStremioStreams(config, 'movie', 'tt123');
    expect(streams.some((item) => item.url?.includes('.m3u8'))).toBe(true);
    expect(streams.some((item) => item.url?.includes('.mp4'))).toBe(true);
    expect(streams.some((item) => item.embedId === 'abc123')).toBe(true);
    expect(streams.some((item) => item.url?.includes('.torrent'))).toBe(false);
    expect(streams.some((item) => item.url?.startsWith('magnet:'))).toBe(false);
    expect(streams.some((item) => item.url?.startsWith('http:'))).toBe(false);
  });

  it('aceita o protocolo universal Hubora para todas as categorias', async () => {
    const manifest = {
      protocol: 'hubora-provider/v1', id: 'minha-fonte', name: 'Minha fonte', version: '1.0.0',
      capabilities: ['search', 'stream', 'reader', 'chapters'],
      mediaTypes: ['movies', 'doramas', 'novels', 'games'],
      endpoints: { search: '/v1/search?q={query}', access: '/v1/access/{type}/{id}' },
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/v1/search')) return new Response(JSON.stringify({ items: [{ id: 'obra-1', title: 'Uma obra', mediaType: 'novels', externalIds: { isbn: '9780000000000' } }] }), { status: 200 });
      return new Response(JSON.stringify(manifest), { status: 200 });
    });
    const inspected = await inspectStremioProvider('https://provider.example/manifest.json');
    expect(inspected.config.protocol).toBe('hubora');
    expect(inspected.config.mediaTypes).toEqual(expect.arrayContaining(['movie', 'tv', 'book', 'game']));
    const items = await searchStremioCatalog(inspected.config, 'obra');
    expect(items[0]).toMatchObject({ title: 'Uma obra', mediaType: 'book', externalIds: { isbn: '9780000000000' } });
  });

  it('ignora categorias que não pertencem ao escopo do produto', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      protocol: 'hubora-provider/v1', id: 'fora-do-escopo', name: 'Fora do escopo', version: '1.0.0',
      capabilities: ['search'], mediaTypes: ['audiobooks'], endpoints: { search: '/search?q={query}' },
    }), { status: 200 }));

    const inspected = await inspectStremioProvider('https://provider.example/manifest.json');
    expect(inspected.config.mediaTypes).toEqual([]);
  });
});
