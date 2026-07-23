import type { Config } from '@netlify/functions';
import { fetchAllowedReaderSource } from '../../src/config/readerSources.js';
import { json, safeError } from './_shared/http.js';

export default async function readerSource(request: Request) {
  if (request.method !== 'GET') return json({ error: 'Método não permitido.' }, { status: 405 });
  try {
    const source = new URL(request.url).searchParams.get('url');
    const result = await fetchAllowedReaderSource(source);
    return new Response(result.body, {
      headers: {
        'content-type': result.contentType,
        'content-length': String(result.body.byteLength),
        'cache-control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
        'content-disposition': 'inline',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    return json({ error: safeError(error) }, { status: 400 });
  }
}

export const config: Config = {
  path: '/api/reader-source',
  method: 'GET',
  rateLimit: { action: 'rate_limit', aggregateBy: ['domain', 'ip'], windowSize: 60, windowLimit: 30 },
};
