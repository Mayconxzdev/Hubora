import { describe, expect, it } from 'vitest';
import { safePlaybackUrl } from '@/pages/Player';

describe('política de URL do player web', () => {
  it('aceita HTTPS e rejeita HTTP local, HTTP de rede e protocolos não web', () => {
    expect(safePlaybackUrl('https://media.example/video.mp4')).toBe('https://media.example/video.mp4');
    expect(safePlaybackUrl('http://127.0.0.1:49821/video.mp4')).toBeNull();
    expect(safePlaybackUrl('http://192.168.1.20/video.mp4')).toBeNull();
    expect(safePlaybackUrl('magnet:?xt=urn:btih:abc')).toBeNull();
  });
});
