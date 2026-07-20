import { afterEach, describe, expect, it, vi } from 'vitest';
import { browsePersonalMedia, isSupportedIntegrationKind, testIntegration } from '@/services/personalMedia';
import { featureRepository } from '@/services/featureRepository';
import { huboraDb } from '@/lib/db';
import type { IntegrationConfig } from '@/types';

const config = (kind: IntegrationConfig['kind']): IntegrationConfig => ({
  id: `${kind}:test`, kind, name: kind, baseUrl: 'https://media.example', token: 'secret', enabled: true,
  createdAt: 1, updatedAt: 1,
});

afterEach(async () => {
  vi.restoreAllMocks();
  await huboraDb.integrations.clear();
});

describe('integrações de mídia pessoal', () => {
  it('mantém registros legados fora da fronteira ativa', async () => {
    expect(isSupportedIntegrationKind('jellyfin')).toBe(true);
    expect(isSupportedIntegrationKind('audiobookshelf')).toBe(false);
    expect(isSupportedIntegrationKind(undefined)).toBe(false);

    await huboraDb.integrations.bulkPut([
      { ...config('jellyfin'), token: undefined },
      { ...config('opds'), id: 'audiobookshelf:legacy', kind: 'audiobookshelf' } as unknown as IntegrationConfig,
    ]);

    const activeIntegrations = await featureRepository.integrations.list();
    expect(activeIntegrations.map((integration) => integration.kind)).toEqual(['jellyfin']);
  });

  it('valida Jellyfin e normaliza o catálogo do usuário', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ Id: 'user-1', Name: 'Maycon' }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ Id: 'user-1', Name: 'Maycon' }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ Items: [{
        Id: 'movie-1', Name: 'Filme Local', Type: 'Movie', Overview: 'Arquivo pessoal', ProductionYear: 2025,
        RunTimeTicks: 7_200_000_000, Genres: ['Drama'], UserData: { PlayedPercentage: 35 },
      }] }), { status: 200, headers: { 'content-type': 'application/json' } }));

    expect(await testIntegration(config('jellyfin'))).toEqual({ ok: true, detail: 'Jellyfin conectado como Maycon' });
    const items = await browsePersonalMedia(config('jellyfin'));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: 'Filme Local', mediaType: 'movie', progress: 35, source: 'jellyfin' });
    expect(items[0].media.runtime).toBe(12);
    expect(items[0].imageUrl).toContain('api_key=secret');
    expect(items[0].media.posterPath).toBeUndefined();
    expect(fetchMock.mock.calls[0][1]?.headers).toBeInstanceOf(Headers);
    expect((fetchMock.mock.calls[0][1]?.headers as Headers).get('X-Emby-Token')).toBe('secret');
  });

  it('normaliza um catálogo OPDS 2 em JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ publications: [{
      metadata: { identifier: 'book-1', title: 'Livro Livre', description: 'Domínio público', author: [{ name: 'Autora' }] },
      links: [{ rel: 'http://opds-spec.org/acquisition', type: 'application/epub+zip', href: '/books/1.epub' }],
    }] }), { status: 200, headers: { 'content-type': 'application/opds+json' } }));

    const items = await browsePersonalMedia({ ...config('opds'), token: undefined, baseUrl: 'https://catalog.example/opds' });
    expect(items[0]).toMatchObject({ title: 'Livro Livre', mediaType: 'book', subtitle: 'Autora' });
    expect(items[0].openUrl).toBe('https://catalog.example/books/1.epub');
  });
});
