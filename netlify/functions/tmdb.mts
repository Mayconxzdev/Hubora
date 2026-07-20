import type { Config } from '@netlify/functions';
import { fetchWithTimeout, json, safeError } from './_shared/http.js';

const ALLOWED_PATHS = [
  /^\/discover\/(movie|tv)$/,
  /^\/search\/(movie|tv)$/,
  /^\/trending\/(movie|tv)\/(day|week)$/,
  /^\/movie\/upcoming$/,
  /^\/tv\/on_the_air$/,
  /^\/(movie|tv)\/\d+(?:\/(?:credits|similar|videos|watch\/providers|external_ids))?$/,
];

const ALLOWED_QUERY = new Set([
  'sort_by', 'page', 'language', 'include_adult', 'with_genres', 'query',
  'with_original_language', 'without_genres', 'region', 'year', 'first_air_date_year',
]);

function credential() {
  return {
    readToken: process.env.TMDB_API_READ_TOKEN?.trim() || '',
    apiKey: process.env.TMDB_API_KEY?.trim() || '',
  };
}

export default async function tmdb(request: Request) {
  if (request.method !== 'GET') return json({ error: 'Método não permitido.' }, { status: 405 });

  const incoming = new URL(request.url);
  const path = incoming.searchParams.get('path')?.trim() || '';
  if (!ALLOWED_PATHS.some((pattern) => pattern.test(path))) {
    return json({ error: 'Rota TMDB não permitida.' }, { status: 400 });
  }

  const { readToken, apiKey } = credential();
  if (!readToken && !apiKey) {
    return json({ error: 'Catálogo TMDB não configurado no servidor.' }, { status: 503 });
  }

  const upstream = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [key, value] of incoming.searchParams) {
    if (ALLOWED_QUERY.has(key) && value.length <= 200) upstream.searchParams.set(key, value);
  }
  if (!upstream.searchParams.has('language') && !path.endsWith('/watch/providers')) {
    upstream.searchParams.set('language', 'pt-BR');
  }
  if (apiKey && !readToken) upstream.searchParams.set('api_key', apiKey);

  try {
    const response = await fetchWithTimeout(upstream, {
      headers: readToken ? { Authorization: `Bearer ${readToken}`, Accept: 'application/json' } : { Accept: 'application/json' },
    }, 9_000);
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': response.ok
          ? 'public, max-age=120, s-maxage=900, stale-while-revalidate=3600'
          : 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    return json({ error: safeError(error) }, { status: 502 });
  }
}

export const config: Config = {
  path: '/api/tmdb',
  method: 'GET',
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: ['domain', 'ip'],
    windowSize: 60,
    windowLimit: 120,
  },
};
