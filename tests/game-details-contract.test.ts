import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('contrato de detalhes de jogos', () => {
  it('preserva o prefixo do provedor entre cliente, servidor local e Netlify', () => {
    const client = readFileSync('src/services/api.ts', 'utf8');
    const server = readFileSync('server.ts', 'utf8');
    const netlify = readFileSync('netlify/functions/games.mts', 'utf8');

    expect(client).toContain('fetch(`/api/games/${encodeURIComponent(id)}`)');
    expect(server).toContain('gameDetails(action)');
    expect(netlify).toContain('gameDetails(action)');
    const shared = readFileSync('netlify/functions/_shared/games.ts', 'utf8');
    expect(shared).toContain("/^ftg-\\d+$/.test(id)");
    expect(shared).toContain("https://www.freetogame.com/api/game");
  });

  it('não inventa detalhes quando a API de jogos falha', () => {
    const client = readFileSync('src/services/api.ts', 'utf8');
    expect(client).not.toContain("title: 'Jogo Indisponível'");
    expect(client).not.toContain('voteAverage: 9');
    expect(client).not.toContain("genres: ['Ação', 'Aventura']");
    expect(client).toMatch(/if \(id\.startsWith\('igdb-'\)[\s\S]*?return null;/);
  });

});
