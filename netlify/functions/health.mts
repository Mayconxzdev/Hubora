import type { Config, Context } from '@netlify/functions';
import { json } from './_shared/http.js';

export default async function health(_request: Request, _context: Context) {
  const supabaseConfigured = Boolean(
    process.env.VITE_SUPABASE_URL?.trim() &&
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );

  return json({
    ok: true,
    localFirst: true,
    supabaseConfigured,
    environment: process.env.CONTEXT || process.env.NODE_ENV || 'netlify',
    timestamp: new Date().toISOString(),
  }, {
    headers: { 'cache-control': 'public, max-age=30, s-maxage=60' },
  });
}

export const config: Config = {
  path: '/api/health',
  method: 'GET',
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: ['domain', 'ip'],
    windowSize: 60,
    windowLimit: 60,
  },
};
