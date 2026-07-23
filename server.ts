import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { STREAM_EMBED_HOSTS } from './src/config/streamHosts';
import { TtlResponseCache } from './src/server/ttlResponseCache';
import { fetchAllowedReaderSource } from './src/config/readerSources';
import { gameDetails } from './netlify/functions/_shared/games.js';
import { API_RATE_LIMIT_WINDOW_MS, resolveApiRateLimit } from './src/server/rateLimits';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const supabaseOrigin = (() => {
  try { return process.env.VITE_SUPABASE_URL ? new URL(process.env.VITE_SUPABASE_URL).origin : undefined; }
  catch { return undefined; }
})();

let fullHealthCache: { expiresAt: number; payload: Record<string, string> } | null = null;
const tmdbResponseCache = new TtlResponseCache<{ body: string; status: number }>(10 * 60_000, 500);

const TMDB_ALLOWED_PATHS = [
  /^\/discover\/(movie|tv)$/,
  /^\/search\/(movie|tv)$/,
  /^\/trending\/(movie|tv)\/(day|week)$/,
  /^\/movie\/upcoming$/,
  /^\/tv\/on_the_air$/,
  /^\/(movie|tv)\/\d+(?:\/(?:credits|similar|videos|watch\/providers|external_ids))?$/,
  /^\/tv\/\d+\/season\/\d+$/,
];
const TMDB_ALLOWED_QUERY = new Set([
  'sort_by', 'page', 'language', 'include_adult', 'with_genres', 'query',
  'with_original_language', 'without_genres', 'region', 'year', 'first_air_date_year',
]);

async function probe(url: string, options?: RequestInit): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (response.ok) return 'conectado';
    if (response.status === 401 || response.status === 403) return 'credencial inválida';
    if (response.status === 429) return 'limite temporário';
    return `erro ${response.status}`;
  } catch (error) {
    return error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'indisponível';
  } finally {
    clearTimeout(timeout);
  }
}

async function probeSupabaseSchema(): Promise<string> {
  const baseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.trim().replace(/\/$/, '');
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY)?.trim();
  if (!baseUrl || !key) return 'não configurado';
  const status = await probe(`${baseUrl}/rest/v1/profiles?select=id&limit=1`, {
    headers: { apikey: key, Accept: 'application/json' },
  });
  return status === 'conectado' ? 'schema disponível' : status === 'erro 404' ? 'schema ausente' : status;
}

async function probeIgdbHealth(): Promise<string> {
  const clientId = process.env.IGDB_CLIENT_ID?.trim();
  const clientSecret = process.env.IGDB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return 'não configurado';
  try {
    const tokenUrl = new URL('https://id.twitch.tv/oauth2/token');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('grant_type', 'client_credentials');
    const tokenResponse = await fetch(tokenUrl, { method: 'POST', signal: AbortSignal.timeout(6_000) });
    if (tokenResponse.status === 401 || tokenResponse.status === 403) return 'credencial inválida';
    if (tokenResponse.status === 429) return 'limite temporário';
    if (!tokenResponse.ok) return `erro ${tokenResponse.status}`;
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
    return error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'indisponível';
  }
}

async function probeGoogleBooksHealth(): Promise<string> {
  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  if (!key) return 'não configurado';
  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', 'test');
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('key', key);
  return probe(url.toString());
}

async function probeRawgHealth(): Promise<string> {
  const key = process.env.RAWG_API_KEY?.trim();
  if (!key) return 'não configurado (opcional)';
  const url = new URL('https://api.rawg.io/api/games');
  url.searchParams.set('key', key);
  url.searchParams.set('page_size', '1');
  return probe(url.toString());
}

async function startServer() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'wasm-unsafe-eval'", 'https://www.google.com', 'https://books.google.com', 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        mediaSrc: ["'self'", 'blob:', 'https:'],
        connectSrc: [
          "'self'",
          'https://api.themoviedb.org',
          'https://api.jikan.moe',
          'https://graphql.anilist.co',
          'https://www.googleapis.com',
          'https://openlibrary.org',
          'https://covers.openlibrary.org',
          'https://www.cheapshark.com',
          'https://store.steampowered.com',
          'https://cdn.jsdelivr.net',
          ...(supabaseOrigin ? [supabaseOrigin] : []),
        ],
        frameSrc: [
          'https://www.google.com',
          'https://books.google.com',
          ...STREAM_EMBED_HOSTS.map((host) => `https://${host}`),
        ],
        workerSrc: ["'self'", 'blob:', 'https://cdn.jsdelivr.net'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    } : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(express.json({ limit: '1mb' }));
  if (process.env.HUBORA_E2E_ASSET_DIR) {
    app.use('/__e2e__', express.static(path.resolve(__dirname, process.env.HUBORA_E2E_ASSET_DIR), {
      dotfiles: 'deny',
      fallthrough: false,
      index: false,
    }));
  }
  app.use('/api', rateLimit({
    windowMs: API_RATE_LIMIT_WINDOW_MS,
    limit: resolveApiRateLimit(process.env.HUBORA_API_RATE_LIMIT),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }));

  app.get('/api/tmdb', async (req, res) => {
    const requestedPath = typeof req.query.path === 'string' ? req.query.path.trim() : '';
    if (!TMDB_ALLOWED_PATHS.some((pattern) => pattern.test(requestedPath))) {
      res.status(400).json({ error: 'Rota TMDB não permitida.' });
      return;
    }
    const apiKey = process.env.TMDB_API_KEY?.trim();
    const readToken = process.env.TMDB_API_READ_TOKEN?.trim();
    if (!apiKey && !readToken) {
      res.status(503).json({ error: 'Catálogo TMDB não configurado no servidor.' });
      return;
    }

    const upstream = new URL(`https://api.themoviedb.org/3${requestedPath}`);
    for (const [key, rawValue] of Object.entries(req.query)) {
      const value = typeof rawValue === 'string' ? rawValue : undefined;
      if (value && value.length <= 200 && TMDB_ALLOWED_QUERY.has(key)) upstream.searchParams.set(key, value);
    }
    if (!upstream.searchParams.has('language') && !requestedPath.endsWith('/watch/providers')) upstream.searchParams.set('language', 'pt-BR');
    const cacheKey = `${requestedPath}?${upstream.searchParams.toString()}`;
    const cached = tmdbResponseCache.get(cacheKey);
    if (cached) {
      res.status(cached.status)
        .set('content-type', 'application/json; charset=utf-8')
        .set('cache-control', 'public, max-age=120')
        .set('x-hubora-cache', 'hit')
        .send(cached.body);
      return;
    }
    if (apiKey && !readToken) upstream.searchParams.set('api_key', apiKey);

    try {
      const response = await fetch(upstream, {
        headers: readToken ? { Authorization: `Bearer ${readToken}`, Accept: 'application/json' } : { Accept: 'application/json' },
      });
      const body = await response.text();
      if (response.ok) tmdbResponseCache.set(cacheKey, { body, status: response.status });
      res.status(response.status).set('content-type', 'application/json; charset=utf-8').set('cache-control', response.ok ? 'public, max-age=120' : 'no-store').send(body);
    } catch {
      res.status(502).json({ error: 'O catálogo TMDB está temporariamente indisponível.' });
    }
  });

  app.get('/api/google-books', async (req, res) => {
    const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (id && !/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
      res.status(400).json({ error: 'ID de volume inválido.' });
      return;
    }
    if (!id && (!query || query.length > 200)) {
      res.status(400).json({ error: 'Consulta inválida.' });
      return;
    }
    const upstream = id
      ? new URL(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(id)}`)
      : new URL('https://www.googleapis.com/books/v1/volumes');
    if (!id) {
      const startIndex = Math.min(1_000, Math.max(0, Number.parseInt(String(req.query.startIndex || '0'), 10) || 0));
      const maxResults = Math.min(40, Math.max(1, Number.parseInt(String(req.query.maxResults || '20'), 10) || 20));
      upstream.searchParams.set('q', query);
      upstream.searchParams.set('startIndex', String(startIndex));
      upstream.searchParams.set('maxResults', String(maxResults));
      upstream.searchParams.set('orderBy', req.query.orderBy === 'newest' ? 'newest' : 'relevance');
      upstream.searchParams.set('langRestrict', /^[a-z]{2}$/i.test(String(req.query.langRestrict || 'pt')) ? String(req.query.langRestrict || 'pt').toLowerCase() : 'pt');
      upstream.searchParams.set('printType', 'books');
    }
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY?.trim();
    if (apiKey) upstream.searchParams.set('key', apiKey);
    try {
      const response = await fetch(upstream, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(9_000) });
      const body = await response.text();
      res.status(response.status).set('content-type', 'application/json; charset=utf-8').set('cache-control', response.ok ? 'public, max-age=300' : 'no-store').send(body);
    } catch {
      res.status(502).json({ error: 'O catálogo Google Books está temporariamente indisponível.' });
    }
  });

  app.get('/api/reader-source', async (req, res) => {
    try {
      const result = await fetchAllowedReaderSource(typeof req.query.url === 'string' ? req.query.url : null);
      res.status(200)
        .set('content-type', result.contentType)
        .set('content-length', String(result.body.byteLength))
        .set('cache-control', 'public, max-age=300')
        .set('content-disposition', 'inline')
        .set('x-content-type-options', 'nosniff')
        .send(Buffer.from(result.body));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Fonte de leitura indisponível.' });
    }
  });


  app.get('/api/health', (_req, res) => {
    const supabaseConfigured = Boolean(
      process.env.VITE_SUPABASE_URL?.trim() &&
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
    );
    res.json({
      ok: true,
      localFirst: true,
      supabaseConfigured,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/health/config', (_req, res) => {
    const envValue = (name: string) => process.env[name]?.trim() || '';
    const explicitBoolean = (name: string): boolean | null => {
      const setting = envValue(name);
      if (setting === 'true') return true;
      if (setting === 'false') return false;
      return null;
    };
    const checks = {
      viteSupabaseUrl: Boolean(envValue('VITE_SUPABASE_URL')),
      viteSupabasePublishableKey: Boolean(envValue('VITE_SUPABASE_PUBLISHABLE_KEY')),
      supabaseUrl: Boolean(envValue('SUPABASE_URL')),
      supabaseSecretKey: Boolean(envValue('SUPABASE_SECRET_KEY') || envValue('SUPABASE_SERVICE_ROLE_KEY')),
      supabasePublishableKey: Boolean(envValue('SUPABASE_PUBLISHABLE_KEY') || envValue('VITE_SUPABASE_PUBLISHABLE_KEY')),
      tmdb: Boolean(envValue('TMDB_API_KEY') || envValue('TMDB_API_READ_TOKEN')),
      igdb: Boolean(envValue('IGDB_CLIENT_ID') && envValue('IGDB_CLIENT_SECRET')),
      googleBooks: Boolean(envValue('GOOGLE_BOOKS_API_KEY')),
      rawg: Boolean(envValue('RAWG_API_KEY')),
      requireAuthentication: explicitBoolean('VITE_REQUIRE_AUTH'),
      allowPublicSignup: explicitBoolean('VITE_ALLOW_PUBLIC_SIGNUP'),
      allowGuestMode: explicitBoolean('VITE_ALLOW_GUEST_MODE'),
    };
    const required: Array<[string, boolean]> = [
      ['VITE_SUPABASE_URL', checks.viteSupabaseUrl],
      ['VITE_SUPABASE_PUBLISHABLE_KEY', checks.viteSupabasePublishableKey],
      ['SUPABASE_URL', checks.supabaseUrl],
      ['SUPABASE_SECRET_KEY', checks.supabaseSecretKey],
      ['TMDB_API_KEY ou TMDB_API_READ_TOKEN', checks.tmdb],
      ['IGDB_CLIENT_ID + IGDB_CLIENT_SECRET', checks.igdb],
      ['GOOGLE_BOOKS_API_KEY', checks.googleBooks],
    ];
    const recommended: Array<[string, boolean]> = [
      ['RAWG_API_KEY', checks.rawg],
    ];
    const missingRequired = required.filter(([, ok]) => !ok).map(([name]) => name);
    const missingRecommended = recommended.filter(([, ok]) => !ok).map(([name]) => name);
    res.set('cache-control', 'no-store').json({
      ready: missingRequired.length === 0,
      checks,
      missingRequired,
      missingRecommended,
      checkedAt: new Date().toISOString(),
      note: 'Esta verificação confirma somente a presença de configuração. Ela não confirma schema/RLS do Supabase, direitos de reprodução ou disponibilidade de cada obra.',
    });
  });

  const fullHealthLimiter = rateLimit({
    windowMs: 5 * 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });

  app.get('/api/health/full', fullHealthLimiter, async (_req, res) => {
    if (fullHealthCache && fullHealthCache.expiresAt > Date.now()) {
      res.json({ ...fullHealthCache.payload, cached: 'sim' });
      return;
    }

    const tmdbKey = process.env.TMDB_API_KEY?.trim();
    const tmdbReadToken = process.env.TMDB_API_READ_TOKEN?.trim();
    const checks = await Promise.all([
      tmdbKey || tmdbReadToken ? probe(
        tmdbKey ? `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(tmdbKey)}` : 'https://api.themoviedb.org/3/configuration',
        tmdbReadToken ? { headers: { Authorization: `Bearer ${tmdbReadToken}` } } : undefined,
      ) : Promise.resolve('não configurado'),
      probe('https://api.jikan.moe/v4/anime?limit=1'),
      probeGoogleBooksHealth(),
      probe('https://openlibrary.org/search.json?q=test&limit=1'),
      probe('https://www.cheapshark.com/api/1.0/games?title=test&limit=1'),
      probe('https://store.steampowered.com/api/storesearch/?term=test&l=english&cc=US'),
      probe('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'query { Page(page: 1, perPage: 1) { media { id } } }' }),
      }),
      probeSupabaseSchema(),
      probeIgdbHealth(),
      probeRawgHealth(),
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
    fullHealthCache = { expiresAt: Date.now() + 5 * 60_000, payload };
    res.json({ ...payload, cached: 'não' });
  });

  // --- Games API (IGDB + CheapShark fallback) ---
  let igdbToken: string | null = null;
  let igdbTokenExpiresAt = 0;

  async function getIGDBToken(): Promise<string | null> {
    const clientId = process.env.IGDB_CLIENT_ID?.trim();
    const clientSecret = process.env.IGDB_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) return null;
    if (igdbToken && Date.now() < igdbTokenExpiresAt) return igdbToken;
    const tokenUrl = new URL('https://id.twitch.tv/oauth2/token');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('grant_type', 'client_credentials');
    const response = await fetch(tokenUrl, { method: 'POST', signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const payload = await response.json() as { access_token?: string; expires_in?: number };
    if (!payload.access_token) return null;
    igdbToken = payload.access_token;
    igdbTokenExpiresAt = Date.now() + Math.max(60, (payload.expires_in ?? 3600) - 60) * 1000;
    return igdbToken;
  }

  async function fetchIGDB(endpoint: string, body: string): Promise<any[] | null> {
    const token = await getIGDBToken();
    const clientId = process.env.IGDB_CLIENT_ID?.trim();
    if (!token || !clientId) return null;
    const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: 'POST',
      headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'text/plain' },
      body,
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return null;
    return response.json() as Promise<any[]>;
  }

  function normalizeIGDB(item: any) {
    const coverUrl = item.cover?.url ? String(item.cover.url).replace('t_thumb', 't_1080p').replace(/^\/\//, 'https://') : undefined;
    return {
      id: `igdb-${item.id}`, providerId: item.id, source: 'igdb', title: item.name, originalTitle: item.name,
      posterPath: coverUrl, backdropPath: item.screenshots?.[0]?.url ? String(item.screenshots[0].url).replace('t_thumb', 't_1080p').replace(/^\/\//, 'https://') : coverUrl,
      mediaType: 'game', releaseDate: item.first_release_date ? new Date(item.first_release_date * 1000).toISOString() : undefined,
      voteAverage: item.rating ? item.rating / 10 : 0, genres: item.genres?.map((g: any) => g.name) ?? [], overview: item.summary, status: 'Released',
    };
  }

  async function fetchCheapSharkGames(query: string): Promise<any[]> {
    const url = new URL('https://www.cheapshark.com/api/1.0/games');
    url.searchParams.set('title', query); url.searchParams.set('limit', '15');
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as any[];
    return data.map((item) => ({ id: `cs-${item.gameID}`, providerId: item.gameID, source: 'cheapshark', title: item.external, originalTitle: item.external, posterPath: item.thumb, mediaType: 'game', voteAverage: 0 }));
  }

  async function fetchCheapSharkDeals(): Promise<any[]> {
    const url = new URL('https://www.cheapshark.com/api/1.0/deals');
    url.searchParams.set('storeID', '1'); url.searchParams.set('onSale', '1'); url.searchParams.set('sortBy', 'Deal Rating'); url.searchParams.set('pageSize', '15');
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as any[];
    return data.map((item) => ({ id: `cs-${item.gameID}`, providerId: item.gameID, source: 'cheapshark', title: item.title, posterPath: item.thumb, mediaType: 'game', voteAverage: item.metacriticScore ? item.metacriticScore / 10 : Number(item.dealRating || 0), customBadge: 'Em promoção' }));
  }

  app.get('/api/games/:action', async (req, res) => {
    const action = req.params.action;
    try {
      if (action === 'status') { res.json({ igdb: process.env.IGDB_CLIENT_ID ? 'configured' : 'not configured', cheapshark: 'available' }); return; }
      if (action === 'search') {
        const query = String(req.query.q || '').trim().slice(0, 120);
        if (!query) { res.json([]); return; }
        const igdbData = await fetchIGDB('games', `search "${query.replace(/[\\"]/g, ' ')}"; fields name,cover.url,first_release_date,rating,genres.name,summary,screenshots.url; limit 15;`);
        if (igdbData?.length) { res.json(igdbData.map(normalizeIGDB)); return; }
        res.json(await fetchCheapSharkGames(query));
        return;
      }
      if (action === 'trending' || action === 'recent') {
        const now = Math.floor(Date.now() / 1000);
        const igdbData = await fetchIGDB('games', `fields name,cover.url,first_release_date,rating,total_rating,total_rating_count,genres.name,summary,screenshots.url; where first_release_date > ${now - 31536000} & total_rating_count > 5; sort total_rating desc; limit 15;`);
        if (igdbData?.length) { res.json(igdbData.map(normalizeIGDB)); return; }
        res.json(await fetchCheapSharkDeals());
        return;
      }
      if (action === 'upcoming') {
        const now = Math.floor(Date.now() / 1000);
        const igdbData = await fetchIGDB('games', `fields name,cover.url,first_release_date,rating,genres.name,summary,screenshots.url; where first_release_date > ${now} & cover != null; sort first_release_date asc; limit 15;`);
        res.json(igdbData?.map(normalizeIGDB) ?? []);
        return;
      }
      if (/^(?:igdb|cs|rawg)-\d+$/.test(action)) {
        const details = await gameDetails(action);
        if (!details) { res.status(404).json({ error: 'Jogo não encontrado.' }); return; }
        res.json(details);
        return;
      }
      res.json([]);
    } catch { res.status(502).json({ error: 'Games API indisponível.' }); }
  });

  // --- Free Catalog API (Google Books + Open Library + Gutenberg + Internet Archive) ---
  app.get('/api/free-catalog', async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (!query || query.length < 2) { res.status(400).json({ error: 'Busca entre 2 e 120 caracteres.' }); return; }

    const googleBooks = async () => {
      const key = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${encodeURIComponent(process.env.GOOGLE_BOOKS_API_KEY)}` : '';
      const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&filter=free-ebooks&maxResults=20&printType=books${key}`, { signal: AbortSignal.timeout(9000) });
      if (!r.ok) return [];
      const data = await r.json() as any;
      return (data.items || []).map((record: any) => {
        const info = record.volumeInfo || {};
        const accessInfo = record.accessInfo || {};
        const access: any[] = [];
        if (accessInfo.embeddable) access.push({ kind: 'google-books', label: accessInfo.viewability === 'ALL_PAGES' ? 'Ler completo' : 'Abrir prévia', volumeId: record.id, url: accessInfo.webReaderLink, free: Boolean(accessInfo.publicDomain || accessInfo.viewability === 'ALL_PAGES') });
        if (accessInfo.epub?.isAvailable && accessInfo.epub?.downloadLink) access.push({ kind: 'epub', label: 'EPUB', url: accessInfo.epub.downloadLink, free: true });
        if (accessInfo.pdf?.isAvailable && accessInfo.pdf?.downloadLink) access.push({ kind: 'pdf', label: 'PDF', url: accessInfo.pdf.downloadLink, free: true });
        if (!access.length && info.previewLink) access.push({ kind: 'official-link', label: 'Abrir Google Books', url: info.previewLink, free: false });
        return { id: `google:${record.id}`, source: 'Google Books', mediaType: 'book', title: info.title || 'Sem título', authors: info.authors || [], description: info.description?.replace(/<[^>]+>/g, ' ').slice(0, 300), image: info.imageLinks?.thumbnail?.replace('http:', 'https:'), year: info.publishedDate, access };
      });
    };

    const openLibrary = async () => {
      const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,first_publish_year,cover_i,public_scan_b,ia`, { signal: AbortSignal.timeout(9000) });
      if (!r.ok) return [];
      const data = await r.json() as any;
      return (data.docs || []).map((doc: any) => {
        const ia = Array.isArray(doc.ia) ? doc.ia[0] : undefined;
        const access: any[] = [];
        if (ia && doc.public_scan_b) access.push({ kind: 'embed', label: 'Ler no Internet Archive', url: `https://archive.org/embed/${encodeURIComponent(ia)}`, free: true });
        access.push({ kind: 'official-link', label: 'Abrir Open Library', url: `https://openlibrary.org${doc.key}`, free: Boolean(doc.public_scan_b) });
        return { id: `ol:${doc.key}`, source: 'Open Library', mediaType: 'book', title: doc.title || 'Sem título', authors: doc.author_name || [], image: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined, year: doc.first_publish_year ? String(doc.first_publish_year) : undefined, access };
      });
    };

    const internetArchiveMovies = async () => {
      const terms = query.replace(/[^\p{L}\p{N}\s'-]/gu, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 8).map((t) => `title:${JSON.stringify(t)}`).join(' AND ');
      if (!terms) return [];
      const search = `mediatype:movies AND (collection:feature_films OR collection:opensource_movies OR collection:prelinger) AND (${terms})`;
      const params = new URLSearchParams({ q: search, rows: '12', page: '1', output: 'json', sort: 'downloads desc' });
      ['identifier', 'title', 'creator', 'date', 'description', 'licenseurl', 'rights', 'collection'].forEach((f) => params.append('fl[]', f));
      const r = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) return [];
      const data = await r.json() as any;
      return (data.response?.docs || []).flatMap((doc: any) => {
        const identifier = String(doc.identifier || '').trim();
        if (!identifier) return [];
        const page = `https://archive.org/details/${encodeURIComponent(identifier)}`;
        const licenseText = [doc.licenseurl, doc.rights]
          .flatMap((value) => Array.isArray(value) ? value : value ? [value] : [])
          .map(String)
          .join(' ')
          .toLowerCase();
        const hasOpenLicense = /creativecommons\.org|public domain|cc0|no known copyright restrictions/.test(licenseText);
        const access = hasOpenLicense
          ? [{ kind: 'embed', label: 'Assistir no Hubora', url: `https://archive.org/embed/${encodeURIComponent(identifier)}`, free: true }, { kind: 'official-link', label: 'Abrir item e licença', url: page, free: true }]
          : [{ kind: 'official-link', label: 'Verificar acesso e licença na origem', url: page, free: false }];
        return [{ id: `archive:${identifier}`, source: 'Internet Archive', mediaType: 'movie', title: Array.isArray(doc.title) ? String(doc.title[0]) : String(doc.title || 'Sem título'), authors: Array.isArray(doc.creator) ? doc.creator.map(String) : doc.creator ? [String(doc.creator)] : [], description: String(doc.description || doc.rights || '').replace(/<[^>]+>/g, ' ').slice(0, 300), image: `https://archive.org/services/img/${encodeURIComponent(identifier)}`, year: Array.isArray(doc.date) ? String(doc.date[0]) : String(doc.date || ''), access }];
      });
    };

    try {
      const settled = await Promise.allSettled([googleBooks(), openLibrary(), internetArchiveMovies()]);
      const items = settled.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
      res.set('cache-control', 'public, max-age=900').json({ items, sources: { googleBooks: settled[0].status, openLibrary: settled[1].status, internetArchive: settled[2].status } });
    } catch { res.status(502).json({ error: 'Catálogo gratuito indisponível.' }); }
  });

  app.all('/api/*all', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  app.use('/api', (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('API Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  });

  if (!isProduction) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/*splat', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hubora running on http://localhost:${PORT}`);
  });
}

void startServer();
