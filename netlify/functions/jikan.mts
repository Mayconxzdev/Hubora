import type { Config } from '@netlify/functions';
import { fetchWithTimeout, json, safeError } from './_shared/http.js';

const ALLOWED_PATHS = [
  /^\/(anime|manga)$/,
  /^\/(anime|manga)\/\d+\/full$/,
  /^\/top\/(anime|manga)$/,
  /^\/seasons\/now$/,
];

const ALLOWED_QUERY = new Set(['filter', 'genres', 'limit', 'order_by', 'page', 'q', 'sfw', 'sort']);
const PROVIDER_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Hubora/1.0 (+https://hubora.netlify.app)',
};

function providerUnavailable(status: number, message: string) {
  return json(
    {
      data: [],
      meta: {
        provider: 'jikan',
        status: 'indisponível',
        upstreamStatus: status,
        message,
      },
    },
    {
      headers: {
        'cache-control': 'no-store',
        'x-hubora-provider-status': 'unavailable',
      },
    },
  );
}

export default async function jikan(request: Request) {
  if (request.method !== 'GET') return json({ error: 'Método não permitido.' }, { status: 405 });

  const incoming = new URL(request.url);
  const path = incoming.searchParams.get('path')?.trim() || '';
  if (!ALLOWED_PATHS.some((pattern) => pattern.test(path))) {
    return json({ error: 'Rota Jikan não permitida.' }, { status: 400 });
  }

  const upstream = new URL(`https://api.jikan.moe/v4${path}`);
  for (const [key, value] of incoming.searchParams) {
    if (ALLOWED_QUERY.has(key) && value.length <= 200) upstream.searchParams.set(key, value);
  }

  try {
    let response = await fetchWithTimeout(upstream, { headers: PROVIDER_HEADERS }, 8_000);
    if ((response.status === 429 || response.status >= 500) && response.status !== 599) {
      await new Promise((resolve) => setTimeout(resolve, response.status === 429 ? 1_000 : 500));
      response = await fetchWithTimeout(upstream, { headers: PROVIDER_HEADERS }, 8_000);
    }

    if (!response.ok) return providerUnavailable(response.status, 'O catálogo Jikan não respondeu agora.');

    const body = await response.text();
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    return providerUnavailable(0, safeError(error));
  }
}

export const config: Config = {
  path: '/api/jikan',
  method: 'GET',
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: ['domain', 'ip'],
    windowSize: 60,
    windowLimit: 90,
  },
};
