import type { Config } from '@netlify/functions';
import { fetchWithTimeout, json, safeError } from './_shared/http.js';

const SAFE_ID = /^[A-Za-z0-9_-]{1,100}$/;
const SAFE_LANGUAGE = /^[a-z]{2}$/i;

function unavailableCatalogResponse(id: string, status: number) {
  // A transient upstream failure must not become a broken browser screen. The
  // client deliberately treats an empty result as a signal to use Open Library
  // or another verified fallback; the status remains explicit in the payload.
  return json(id
    ? { providerStatus: 'unavailable', upstreamStatus: status }
    : { items: [], providerStatus: 'unavailable', upstreamStatus: status }, {
    headers: {
      'cache-control': 'no-store',
      'x-hubora-provider-status': 'unavailable',
      'x-content-type-options': 'nosniff',
    },
  });
}

function boundedInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export default async function googleBooks(request: Request) {
  if (request.method !== 'GET') return json({ error: 'Método não permitido.' }, { status: 405 });

  const incoming = new URL(request.url);
  const id = incoming.searchParams.get('id')?.trim() || '';
  const query = incoming.searchParams.get('q')?.trim() || '';
  if (id && !SAFE_ID.test(id)) return json({ error: 'ID de volume inválido.' }, { status: 400 });
  if (!id && (!query || query.length > 200)) return json({ error: 'Consulta inválida.' }, { status: 400 });

  const upstream = id
    ? new URL(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(id)}`)
    : new URL('https://www.googleapis.com/books/v1/volumes');

  if (!id) {
    upstream.searchParams.set('q', query);
    upstream.searchParams.set('startIndex', String(boundedInteger(incoming.searchParams.get('startIndex'), 0, 0, 1_000)));
    upstream.searchParams.set('maxResults', String(boundedInteger(incoming.searchParams.get('maxResults'), 20, 1, 40)));
    upstream.searchParams.set('orderBy', incoming.searchParams.get('orderBy') === 'newest' ? 'newest' : 'relevance');
    const language = incoming.searchParams.get('langRestrict') || 'pt';
    if (SAFE_LANGUAGE.test(language)) upstream.searchParams.set('langRestrict', language.toLowerCase());
    upstream.searchParams.set('printType', 'books');
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  if (apiKey) upstream.searchParams.set('key', apiKey);

  try {
    const response = await fetchWithTimeout(upstream, { headers: { Accept: 'application/json' } }, 9_000);
    const body = await response.text();
    // A entrada já foi validada localmente. Portanto, qualquer resposta não
    // bem-sucedida daqui em diante pertence ao provedor/configuração (inclusive
    // uma chave revogada ou restrita), não à pessoa que fez a busca. Não
    // encaminhamos um 4xx bruto ao navegador: o cliente recebe o estado
    // explícito de indisponibilidade e pode usar Open Library ou o catálogo
    // oficial sem inventar uma obra, disponibilidade ou leitura.
    if (!response.ok) return unavailableCatalogResponse(id, response.status);
    return new Response(body, {
      status: response.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': response.ok ? 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' : 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    console.warn('Hubora Google Books function:', safeError(error));
    return unavailableCatalogResponse(id, 502);
  }
}

export const config: Config = {
  path: '/api/google-books',
  method: 'GET',
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: ['domain', 'ip'],
    windowSize: 60,
    windowLimit: 90,
  },
};
