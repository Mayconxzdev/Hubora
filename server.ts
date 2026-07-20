import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

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

const TMDB_ALLOWED_PATHS = [
  /^\/discover\/(movie|tv)$/,
  /^\/search\/(movie|tv)$/,
  /^\/trending\/(movie|tv)\/(day|week)$/,
  /^\/movie\/upcoming$/,
  /^\/tv\/on_the_air$/,
  /^\/(movie|tv)\/\d+(?:\/(?:credits|similar|videos|watch\/providers))?$/,
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

async function startServer() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://www.google.com', 'https://books.google.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
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
          ...(supabaseOrigin ? [supabaseOrigin] : []),
        ],
        frameSrc: ['https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://www.google.com', 'https://books.google.com', 'https://archive.org'],
        workerSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    } : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', rateLimit({
    windowMs: 60_000,
    limit: 120,
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
    if (apiKey && !readToken) upstream.searchParams.set('api_key', apiKey);

    try {
      const response = await fetch(upstream, {
        headers: readToken ? { Authorization: `Bearer ${readToken}`, Accept: 'application/json' } : { Accept: 'application/json' },
      });
      const body = await response.text();
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
      probe('https://www.googleapis.com/books/v1/volumes?q=test&maxResults=1'),
      probe('https://openlibrary.org/search.json?q=test&limit=1'),
      probe('https://www.cheapshark.com/api/1.0/games?title=test&limit=1'),
      probe('https://store.steampowered.com/api/storesearch/?term=test&l=english&cc=US'),
      probe('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      supabase: process.env.VITE_SUPABASE_URL ? 'configurado' : 'não configurado',
      checkedAt: new Date().toISOString(),
    };
    fullHealthCache = { expiresAt: Date.now() + 5 * 60_000, payload };
    res.json({ ...payload, cached: 'não' });
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
