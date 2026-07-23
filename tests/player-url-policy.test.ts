import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { safeEmbed, safePlaybackUrl } from '@/pages/Player';
import { STREAM_EMBED_HOSTS } from '@/config/streamHosts';

describe('política de URL do player web', () => {
  it('aceita HTTPS e rejeita HTTP local, HTTP de rede e protocolos não web', () => {
    expect(safePlaybackUrl('https://media.example/video.mp4')).toBe('https://media.example/video.mp4');
    expect(safePlaybackUrl('http://127.0.0.1:49821/video.mp4')).toBeNull();
    expect(safePlaybackUrl('http://192.168.1.20/video.mp4')).toBeNull();
    expect(safePlaybackUrl('magnet:?xt=urn:btih:abc')).toBeNull();
    expect(safePlaybackUrl('/__e2e__/player-test.webm')).toBe('http://localhost:3000/__e2e__/player-test.webm');
  });

  it('aceita a allowlist exata de embeds e rejeita hosts imitadores', () => {
    expect(safeEmbed('https://archive.org/embed/night_of_the_living_dead')).toBe(
      'https://archive.org/embed/night_of_the_living_dead',
    );
    expect(safeEmbed('https://www.youtube-nocookie.com/embed/abc123')).toBe(
      'https://www.youtube-nocookie.com/embed/abc123',
    );
    expect(safeEmbed('https://vidsrc.cc/v2/embed/movie/157336')).toBeNull();
    expect(safeEmbed('https://player.autoembed.cc/embed/movie/157336')).toBeNull();
    expect(safeEmbed('https://vidsrc.cc.evil.example/v2/embed/movie/157336')).toBeNull();
    expect(safeEmbed('http://vidsrc.cc/v2/embed/movie/157336')).toBeNull();
  });

  it('mantém todos os hosts configurados utilizáveis pelo player', () => {
    for (const host of STREAM_EMBED_HOSTS) {
      expect(safeEmbed(`https://${host}/embed/test`), host).toBe(`https://${host}/embed/test`);
    }
  });

  it('mantém a CSP publicada alinhada à allowlist do player', () => {
    const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
    const netlify = readFileSync(resolve(process.cwd(), 'netlify.toml'), 'utf8');
    for (const host of STREAM_EMBED_HOSTS) {
      expect(netlify, host).toContain(`https://${host}`);
    }
    expect(server).toContain("mediaSrc: [\"'self'\", 'blob:', 'https:']");
    expect(netlify).toContain("media-src 'self' blob: https:");
  });
});
