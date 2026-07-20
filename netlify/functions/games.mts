import type { Config, Context } from '@netlify/functions';
import {
  gameDetails,
  gameStatus,
  recentGames,
  searchGames,
  trendingGames,
  upcomingGames,
} from './_shared/games.js';
import { json, safeError } from './_shared/http.js';

export default async function games(request: Request, context: Context) {
  const action = String(context.params.action || '').trim();

  if (request.method === 'POST' && action === 'sync') {
    return json({ success: true, timestamp: Date.now() });
  }

  if (request.method !== 'GET') {
    return json({ error: 'Método não permitido.' }, { status: 405 });
  }

  try {
    if (action === 'status') return json(gameStatus());
    if (action === 'search') {
      const query = new URL(request.url).searchParams.get('q') || '';
      return json(await searchGames(query), {
        headers: { 'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' },
      });
    }
    if (action === 'trending') {
      return json(await trendingGames(), {
        headers: { 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600' },
      });
    }
    if (action === 'upcoming') {
      return json(await upcomingGames(), {
        headers: { 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600' },
      });
    }
    if (action === 'recent') {
      return json(await recentGames(), {
        headers: { 'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600' },
      });
    }

    const details = await gameDetails(action);
    if (!details) return json({ error: 'Jogo não encontrado.' }, { status: 404 });
    return json(details, {
      headers: { 'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    console.error('Hubora games function:', error);
    return json({ error: safeError(error) }, { status: 502 });
  }
}

export const config: Config = {
  path: '/api/games/:action',
  method: ['GET', 'POST'],
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: ['domain', 'ip'],
    windowSize: 60,
    windowLimit: 60,
  },
};
