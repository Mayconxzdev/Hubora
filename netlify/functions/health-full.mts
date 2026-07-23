import type { Config, Context } from '@netlify/functions';
import { fetchWithTimeout, json } from './_shared/http.js';

let cache: { expiresAt: number; payload: Record<string, string> } | null = null;

function responseStatus(response: Response): string {
  if (response.ok) return 'conectado';
  if (response.status === 401 || response.status === 403) return 'credencial inválida';
  if (response.status === 429) return 'limite temporário';
  return `erro ${response.status}`;
}

async function probe(url: string, options?: RequestInit): Promise<string> {
  try {
    return responseStatus(await fetchWithTimeout(url, options, 5_000));
  } catch (error) {
    return error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'indisponível';
  }
}

async function probeSupabaseSchema(): Promise<string> {
  const baseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.trim().replace(/\/$/, '');
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY)?.trim();
  if (!baseUrl || !key) return 'não configurado';
  const status = await probe(`${baseUrl}/rest/v1/profiles?select=id&limit=1`, {
    headers: { apikey: key, accept: 'application/json' },
  });
  return status === 'conectado' ? 'schema disponível' : status === 'erro 404' ? 'schema ausente' : status;
}

async function probeIgdb(): Promise<string> {
  const clientId = process.env.IGDB_CLIENT_ID?.trim();
  const clientSecret = process.env.IGDB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return 'não configurado';
  try {
    const tokenUrl = new URL('https://id.twitch.tv/oauth2/token');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('grant_type', 'client_credentials');
    const tokenResponse = await fetchWithTimeout(tokenUrl, { method: 'POST' }, 6_000);
    const tokenStatus = responseStatus(tokenResponse);
    if (!tokenResponse.ok) return tokenStatus;
    const tokenPayload = await tokenResponse.json() as { access_token?: string };
    if (!tokenPayload.access_token) return 'resposta inválida';
    return probe('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${tokenPayload.access_token}`,
        Accept: 'application/json',
        'Content-Type': 'text/plain',
      },
      body: 'fields id; limit 1;',
    });
  } catch (error) {
    return error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'indisponível';
  }
}

async function probeGoogleBooks(): Promise<string> {
  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  if (!key) return 'não configurado';
  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', 'test');
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('key', key);
  return probe(url.toString());
}

async function probeRawg(): Promise<string> {
  const key = process.env.RAWG_API_KEY?.trim();
  if (!key) return 'não configurado (opcional)';
  const url = new URL('https://api.rawg.io/api/games');
  url.searchParams.set('key', key);
  url.searchParams.set('page_size', '1');
  return probe(url.toString());
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
    probeGoogleBooks(),
    probe('https://openlibrary.org/search.json?q=test&limit=1'),
    probe('https://www.cheapshark.com/api/1.0/games?title=test&limit=1'),
    probe('https://store.steampowered.com/api/storesearch/?term=test&l=english&cc=US'),
    probe('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query { Page(page: 1, perPage: 1) { media { id } } }' }),
    }),
    probeSupabaseSchema(),
    probeIgdb(),
    probeRawg(),
  ]);

  const payload = {
    tmdb: checks[0],
    jikan: checks[1],
    googleBooks: checks[2],
    openLibrary: checks[3],
    cheapshark: checks[4],
    steam: checks[5],
    anilist: checks[6],
    supabase: checks[7],
    igdb: checks[8],
    rawg: checks[9],
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
