import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STREAM_EMBED_HOSTS } from '@/config/streamHosts';

const forbidden = ['vidsrc', 'multiembed', 'smashystream', 'vidlink', 'autoembed'];

describe('política de fontes incorporáveis', () => {
  it('mantém somente hosts explicitamente autorizados pelo produto', () => {
    expect(STREAM_EMBED_HOSTS).toEqual([
      'archive.org',
      'www.youtube.com',
      'www.youtube-nocookie.com',
    ]);
    for (const host of STREAM_EMBED_HOSTS) {
      expect(host).not.toMatch(/vidsrc|multiembed|smashy|vidlink|autoembed/i);
    }
  });

  it('não reintroduz resolvedores automáticos nos serviços de reprodução', () => {
    const source = [
      readFileSync('src/services/playerService.ts', 'utf8'),
      readFileSync('src/services/providerProtocol.ts', 'utf8'),
      readFileSync('src/components/details/EpisodeList.tsx', 'utf8'),
      readFileSync('src/components/details/WhereToWatch.tsx', 'utf8'),
    ].join('\n').toLowerCase();
    for (const marker of forbidden) expect(source).not.toContain(marker);
  });
});
