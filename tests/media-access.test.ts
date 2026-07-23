import { describe, expect, it } from 'vitest';
import { accessDestination, isUsableAccess } from '@/services/mediaAccess';
import type { MediaAccess, MediaItem } from '@/types';

const game: MediaItem = { id: 'game-1', title: 'Jogo', mediaType: 'game' };

function access(url: string, kind: MediaAccess['kind'] = 'official-link'): MediaAccess {
  return { id: url, label: 'Acesso', provider: 'Teste', kind, url, health: 'available' };
}

describe('destinos de acesso', () => {
  it('permite HTTPS e deep links explícitos de launchers, mas bloqueia arquivos locais', () => {
    expect(isUsableAccess(access('https://store.example/game'))).toBe(true);
    expect(accessDestination(access('steam://run/123'), game)).toEqual({ kind: 'external', url: 'steam://run/123' });
    expect(isUsableAccess(access('file:///home/user/video.mp4'))).toBe(false);
    expect(isUsableAccess(access('C:\\Videos\\video.mp4'))).toBe(false);
  });

  it('não transforma HTTP ou protocolo desconhecido em fonte utilizável', () => {
    expect(isUsableAccess(access('http://example.com/video.mp4', 'video'))).toBe(false);
    expect(isUsableAccess(access('javascript:alert(1)'))).toBe(false);
  });
});
