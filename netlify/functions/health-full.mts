import type { Config, Context } from '@netlify/functions';
import { fetchWithTimeout, json } from './_shared/http.js';

let cache: { expiresAt: number; payload: Record<string, string> } | null = null;

async function probe(url: string, options?: RequestInit): Promise<string> {
  try {
    const response = await fetchWithTimeout(url, options, 5_000);
    if (response.ok) return 'conectado';
    if (response.status === 401 || response.status === 403) return 'credencial inválida';
    if (response.status === 429) return 'limite temporário';
    return `erro ${response.status}`;
  } catch (error) {
    return error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'indisponível';
  }
}

export default async function healthFull(_request: Request, _context: Context) {
  if (cache && cache.expiresAt > Date.now()) {
    return json({ ...cache.payload, cached: 'sim' }, {
      headers: { 'cache-control': 'public, max-age=30, s-maxage=300' },
    });
  }

  const tmdbKey = process.env.TMDB_API_KEY?.trim();
  const tmdbReadToken = process.env.TMDB_API_READ_TOKEN?.trim();
  const checks = await Promise.all([
    tmdbKey || tmdbReadToken
      ? probe(
          tmdbKey ? `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(tmdbKey)}` : 'https://api.themoviedb.org/3/configuration',
          tmdbReadToken ? { headers: { Authorization: `Bearer ${tmdbReadToken}` } } : undefined,
        )
      : Promise.resolve('não configurado'),
    probe('https://api.jikan.moe/v4/anime?limit=1'),
    probe('https://www.googleapis.com/books/v1/volumes?q=test&maxResults=1'),
    probe('https://openlibrary.org/search.json?q=test&limit=1'),
    probe('https://www.cheapshark.com/api/1.0/games?title=test&limit=1'),
    probe('https://store.steampowered.com/api/storesearch/?term=test&l=english&cc=US'),
    probe('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query { Page(page: 1, perPage: 1) { media { id } } }' }),
    }),
  ]);

  const payload = {
    tmdb: checks[0],
    jikan: checks[1],
    googleBooks: checks[2],
    openLibrary: checks[3],
    cheapshark: checks[4],
    steam: checks[5],
    anilist: checks[6],
    supabase: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL ? 'configurado' : 'não configurado',
    checkedAt: new Date().toISOString(),
  };

  cache = { expiresAt: Date.now() + 5 * 60_000, payload };
  return json({ ...payload, cached: 'não' }, {
    headers: { 'cache-control': 'public, max-age=30, s-maxage=300' },
  });
}

export const config: Config = {
  path: '/api/health/full',
  method: 'GET',
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: ['domain', 'ip'],
    windowSize: 300,
    windowLimit: 10,
  },
};
