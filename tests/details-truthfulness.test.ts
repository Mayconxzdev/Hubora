import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const details = readFileSync('src/pages/Details.tsx', 'utf8');
const playerService = readFileSync('src/services/playerService.ts', 'utf8');

const fabricatedMarkers = [
  'Duração padrão',
  '1h 02min restantes',
  'Dolby Vision',
  'progresso fixo',
  'images.unsplash.com',
  'vidsrc.cc',
  'multiembed',
  'smashystream',
  'autoembed',
];

describe('detalhes exibem apenas dados comprovados', () => {
  it('não contém os marcadores fictícios conhecidos', () => {
    for (const marker of fabricatedMarkers) {
      expect(details.toLowerCase(), marker).not.toContain(marker.toLowerCase());
    }
  });

  it('separa favorito da biblioteca e não fabrica streams', () => {
    expect(details).toContain('toggleFavorite');
    expect(playerService).toContain('return [];');
    expect(playerService.toLowerCase()).not.toContain('vidsrc.cc');
    expect(playerService.toLowerCase()).not.toContain('autoembed');
  });
});
