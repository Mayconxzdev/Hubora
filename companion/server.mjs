import { createHash, randomBytes, randomInt } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { spawn } from 'node:child_process';
import WebTorrent from 'webtorrent';

const VERSION = '1.0.0';
const PORT = Number(process.env.HUBORA_COMPANION_PORT || 49821);
const HOST = process.env.HUBORA_COMPANION_HOST || '127.0.0.1';
const CACHE_LIMIT_BYTES = Number(process.env.HUBORA_CACHE_LIMIT_BYTES || 25 * 1024 ** 3);
const CLEANUP_DELAY_MS = Number(process.env.HUBORA_CACHE_CLEANUP_MS || 10 * 60_000);
const DATA_DIR = resolve(process.env.HUBORA_COMPANION_DATA || join(process.env.LOCALAPPDATA || homedir(), 'Hubora', 'Companion'));
const CACHE_DIR = join(DATA_DIR, 'cache');
const CONFIG_FILE = join(DATA_DIR, 'config.json');
const SESSION_FILE = join(DATA_DIR, 'sessions.json');
const DEFAULT_ORIGINS = [
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:4173', 'http://127.0.0.1:4173',
  'http://localhost:4187', 'http://127.0.0.1:4187',
];

await mkdir(CACHE_DIR, { recursive: true });

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}

const stored = await readJson(CONFIG_FILE, {});
const config = {
  token: typeof stored.token === 'string' ? stored.token : '',
  allowedOrigins: Array.from(new Set([
    ...DEFAULT_ORIGINS,
    ...(Array.isArray(stored.allowedOrigins) ? stored.allowedOrigins : []),
    ...(process.env.HUBORA_ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean),
  ])),
  cacheLimitBytes: CACHE_LIMIT_BYTES,
  cleanupDelayMs: CLEANUP_DELAY_MS,
  realDebridApiKey: typeof stored.realDebridApiKey === 'string' ? stored.realDebridApiKey : '',
  torBoxApiKey: typeof stored.torBoxApiKey === 'string' ? stored.torBoxApiKey : '',
};

const torrentClient = new WebTorrent({ maxConns: 55 });

let pairingCode = String(randomInt(100000, 999999));
const pairingAttempts = new Map();
const sessions = new Map();

function sessionSummary(session) {
  return {
    id: session.id,
    title: session.title,
    kind: session.kind,
    createdAt: session.createdAt,
    lastAccessAt: session.lastAccessAt,
    stoppedAt: session.stoppedAt || null,
    downloadedBytes: session.downloadedBytes || 0,
    progressSeconds: session.progressSeconds || 0,
  };
}

async function persistConfig() {
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

async function persistSessions() {
  await writeFile(SESSION_FILE, JSON.stringify(Array.from(sessions.values()).map(sessionSummary), null, 2), { mode: 0o600 });
}

function corsOrigin(request, allowUnknown = false) {
  const origin = request.headers.origin;
  if (!origin) return null;
  return allowUnknown || config.allowedOrigins.includes(origin) ? origin : null;
}

function setCors(request, response, allowUnknown = false) {
  const origin = corsOrigin(request, allowUnknown);
  if (origin) response.setHeader('access-control-allow-origin', origin);
  response.setHeader('vary', 'Origin');
  response.setHeader('access-control-allow-private-network', 'true');
  response.setHeader('access-control-allow-headers', 'content-type,x-hubora-token');
  response.setHeader('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS');
}

function json(request, response, status, body) {
  setCors(request, response);
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function bodyJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 256 * 1024) throw new Error('Corpo excede 256 KB.');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function authorized(request) {
  const token = request.headers['x-hubora-token'];
  return Boolean(config.token && typeof token === 'string' && token.length === config.token.length && token === config.token);
}

function safeSourceUrl(value) {
  const str = String(value || '');
  if (str.startsWith('magnet:')) {
    if (!str.includes('xt=urn:btih:')) throw new Error('Link magnet inválido.');
    return {
      protocol: 'magnet:',
      toString() { return str; },
      pathname: '',
      search: str.substring(7),
      hostname: 'magnet'
    };
  }
  const url = new URL(str);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    || /^10\./.test(url.hostname)
    || /^192\.168\./.test(url.hostname)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('A origem deve usar HTTPS ou estar na sua rede local.');
  if (url.username || url.password) throw new Error('Credenciais não podem ficar dentro da URL.');
  return url;
}

async function resolveRealDebridMagnet(magnetUrl) {
  const apiKey = config.realDebridApiKey;
  if (!apiKey) throw new Error('Chave do Real-Debrid não configurada.');
  const addRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ magnet: magnetUrl })
  });
  if (!addRes.ok) {
    const err = await addRes.json().catch(() => ({}));
    throw new Error(`Real-Debrid addMagnet falhou: ${err.error || addRes.status}`);
  }
  const addData = await addRes.json();
  const torrentId = addData.id;
  const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!infoRes.ok) throw new Error('Falha ao obter info do torrent no Real-Debrid.');
  const infoData = await infoRes.json();
  const files = infoData.files || [];
  const videoFiles = files.filter(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.path));
  let selectedFiles = 'all';
  if (videoFiles.length > 0) {
    videoFiles.sort((a, b) => b.bytes - a.bytes);
    selectedFiles = String(videoFiles[0].id);
  }
  const selectRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ files: selectedFiles })
  });
  if (!selectRes.ok) throw new Error('Falha ao selecionar arquivos no Real-Debrid.');
  let attempts = 0;
  let currentInfo = infoData;
  while (attempts < 15) {
    const checkRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (checkRes.ok) {
      currentInfo = await checkRes.json();
      if (currentInfo.status === 'downloaded') break;
      if (currentInfo.status === 'error' || currentInfo.status === 'dead') throw new Error('Torrent com erro no Real-Debrid.');
    }
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }
  if (currentInfo.status !== 'downloaded') throw new Error('O torrent está baixando no Real-Debrid.');
  const links = currentInfo.links || [];
  if (links.length === 0) throw new Error('Nenhum link gerado para o torrent.');
  const unrestrictRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ link: links[0] })
  });
  if (!unrestrictRes.ok) {
    const err = await unrestrictRes.json().catch(() => ({}));
    throw new Error(`Real-Debrid unrestrict falhou: ${err.error || unrestrictRes.status}`);
  }
  const unrestrictData = await unrestrictRes.json();
  return unrestrictData.download;
}

async function resolveTorBoxMagnet(magnetUrl) {
  const apiKey = config.torBoxApiKey;
  if (!apiKey) throw new Error('Chave do TorBox não configurada.');
  const addRes = await fetch('https://api.torbox.app/v1/api/torrents/createtorrent', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ magnet: magnetUrl })
  });
  if (!addRes.ok) {
    const err = await addRes.json().catch(() => ({}));
    throw new Error(`TorBox createtorrent falhou: ${err.error || addRes.status}`);
  }
  const addData = await addRes.json();
  const torrentId = addData.data?.torrent_id;
  if (!torrentId) throw new Error('ID do torrent não retornado pelo TorBox.');
  let attempts = 0;
  let fileId = 1;
  while (attempts < 10) {
    const listRes = await fetch('https://api.torbox.app/v1/api/torrents/mylist', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      const torrent = (listData.data || []).find(t => t.id === torrentId || t.torrent_id === torrentId);
      if (torrent) {
        const files = torrent.files || [];
        if (files.length > 0) {
          const videoFiles = files.filter(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name || f.path || ''));
          if (videoFiles.length > 0) {
            videoFiles.sort((a, b) => (b.size || 0) - (a.size || 0));
            fileId = videoFiles[0].id;
          } else {
            files.sort((a, b) => (b.size || 0) - (a.size || 0));
            fileId = files[0].id;
          }
          break;
        }
      }
    }
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }
  return `https://api.torbox.app/v1/api/torrents/requestdl?token=${encodeURIComponent(apiKey)}&torrent_id=${encodeURIComponent(torrentId)}&file_id=${encodeURIComponent(fileId)}&redirect=true`;
}

async function scanLocalGames() {
  const games = [];
  const steamPath = 'C:\\Program Files (x86)\\Steam\\steamapps';
  if (existsSync(steamPath)) {
    try {
      const files = await readdir(steamPath);
      for (const file of files) {
        if (file.startsWith('appmanifest_') && file.endsWith('.acf')) {
          const content = await readFile(join(steamPath, file), 'utf8');
          const appidMatch = content.match(/"appid"\s+"(\d+)"/i);
          const nameMatch = content.match(/"name"\s+"([^"]+)"/i);
          if (appidMatch && nameMatch) {
            games.push({
              id: `steam-${appidMatch[1]}`,
              title: nameMatch[1],
              platform: 'Steam',
              launchUrl: `steam://rungameid/${appidMatch[1]}`,
              source: 'steam',
              sourceId: appidMatch[1],
              free: false,
              official: true,
              mode: 'game-launcher',
              categories: ['games']
            });
          }
        }
      }
    } catch (err) {
      console.error('[Scan Steam]', err);
    }
  }
  const userHome = homedir();
  const startMenuPaths = [
    'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs',
    join(userHome, 'AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs')
  ];
  for (const startPath of startMenuPaths) {
    if (existsSync(startPath)) {
      try {
        const scanDir = async (dir) => {
          const items = await readdir(dir, { withFileTypes: true });
          for (const item of items) {
            const fullPath = join(dir, item.name);
            if (item.isDirectory()) {
              await scanDir(fullPath);
            } else if (item.name.endsWith('.lnk')) {
              const name = item.name.slice(0, -4);
              const isGameLink = /League of Legends|Valorant|Genshin Impact|Epic Games|Cyberpunk|Minecraft|Roblox|Witcher|Grand Theft Auto|Red Dead|Hades|Fifa/i.test(name);
              if (isGameLink && !games.some(g => g.title.toLowerCase() === name.toLowerCase())) {
                games.push({
                  id: `shortcut-${name.replace(/\s+/g, '-').toLowerCase()}`,
                  title: name,
                  platform: 'PC',
                  launchUrl: fullPath,
                  source: 'shortcut',
                  sourceId: name,
                  free: true,
                  official: true,
                  mode: 'game-launcher',
                  categories: ['games']
                });
              }
            }
          }
        };
        await scanDir(startPath);
      } catch (err) {
        console.error('[Scan Shortcuts]', err);
      }
    }
  }
  return games;
}

function mergeInterval(intervals, start, end) {
  const next = [...intervals, [start, end]].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const interval of next) {
    const last = merged.at(-1);
    if (last && interval[0] <= last[1] + 1) last[1] = Math.max(last[1], interval[1]);
    else merged.push([...interval]);
  }
  return merged;
}

function hasRange(intervals, start, end) {
  return intervals.some(([from, to]) => from <= start && to >= end);
}

async function directorySize(path) {
  if (!existsSync(path)) return 0;
  let total = 0;
  for (const item of await readdir(path, { withFileTypes: true })) {
    const child = join(path, item.name);
    total += item.isDirectory() ? await directorySize(child) : (await stat(child)).size;
  }
  return total;
}

async function cacheState() {
  return {
    usedBytes: await directorySize(CACHE_DIR),
    limitBytes: config.cacheLimitBytes,
    sessions: sessions.size,
    cleanupDelayMs: config.cleanupDelayMs,
  };
}

async function cleanup(force = false) {
  const now = Date.now();
  const candidates = Array.from(sessions.values())
    .filter((session) => force || (session.stoppedAt && now - session.stoppedAt >= config.cleanupDelayMs))
    .sort((a, b) => (a.stoppedAt || a.lastAccessAt) - (b.stoppedAt || b.lastAccessAt));
  for (const session of candidates) {
    await rm(session.directory, { recursive: true, force: true });
    if (session.webtorrentHash) {
      try {
        const t = torrentClient.get(session.webtorrentHash);
        if (t) t.destroy({ destroyStore: true });
      } catch (err) { console.error('[webtorrent destroy]', err); }
    }
    sessions.delete(session.id);
  }
  let used = await directorySize(CACHE_DIR);
  if (used > config.cacheLimitBytes) {
    const stopped = Array.from(sessions.values()).filter((session) => session.stoppedAt).sort((a, b) => a.lastAccessAt - b.lastAccessAt);
    for (const session of stopped) {
      if (used <= config.cacheLimitBytes) break;
      const size = await directorySize(session.directory);
      await rm(session.directory, { recursive: true, force: true });
      sessions.delete(session.id);
      used -= size;
    }
  }
  await persistSessions();
}

function pipeWebBody(body, response, writer, onBytes) {
  if (!body) { response.end(); writer?.end(); return; }
  const stream = Readable.fromWeb(body);
  stream.on('data', (chunk) => {
    writer?.write(chunk);
    onBytes?.(chunk.length);
  });
  stream.on('end', () => writer?.end());
  stream.on('error', () => writer?.destroy());
  stream.pipe(response);
}

function copyHeaders(upstream, response) {
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) response.setHeader(name, value);
  }
  response.setHeader('cache-control', 'no-store');
}

function playbackAuthorized(url, session) {
  return url.searchParams.get('key') === session.playbackKey;
}

async function proxyVideo(request, response, session) {
  session.lastAccessAt = Date.now();
  session.stoppedAt = null;
  
  if (session.webtorrentFile) {
    const range = request.headers.range;
    const match = range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = match ? Number(match[1]) : 0;
    const requestedEnd = match?.[2] ? Number(match[2]) : session.webtorrentFile.length - 1;
    const size = requestedEnd - start + 1;
    response.writeHead(206, {
      'content-type': session.contentType || 'video/mp4',
      'content-length': String(size),
      'content-range': `bytes ${start}-${requestedEnd}/${session.webtorrentFile.length}`,
      'accept-ranges': 'bytes',
      'cache-control': 'no-store'
    });
    const stream = session.webtorrentFile.createReadStream({ start, end: requestedEnd });
    stream.pipe(response);
    return;
  }

  const range = request.headers.range;
  const match = range?.match(/^bytes=(\d+)-(\d*)$/);
  const start = match ? Number(match[1]) : 0;
  const requestedEnd = match?.[2] ? Number(match[2]) : undefined;
  const file = join(session.directory, 'media.bin');
  if (requestedEnd !== undefined && existsSync(file) && hasRange(session.intervals, start, requestedEnd)) {
    const size = requestedEnd - start + 1;
    response.writeHead(206, { 'content-type': session.contentType || 'video/mp4', 'content-length': String(size), 'content-range': `bytes ${start}-${requestedEnd}/${session.totalBytes || '*'}`, 'accept-ranges': 'bytes', 'cache-control': 'no-store' });
    createReadStream(file, { start, end: requestedEnd }).pipe(response);
    return;
  }

  const headers = {};
  if (range) headers.Range = range;
  const upstream = await fetch(session.sourceUrl, { headers, redirect: 'follow' });
  if (!upstream.ok && upstream.status !== 206) {
    json(request, response, upstream.status, { error: `A origem respondeu ${upstream.status}.` });
    return;
  }
  copyHeaders(upstream, response);
  response.statusCode = upstream.status;
  session.contentType = upstream.headers.get('content-type') || session.contentType;
  const contentRange = upstream.headers.get('content-range')?.match(/bytes (\d+)-(\d+)\/(\d+|\*)/i);
  const writeStart = contentRange ? Number(contentRange[1]) : start;
  const writeEnd = contentRange ? Number(contentRange[2]) : writeStart + Math.max(0, Number(upstream.headers.get('content-length') || 0) - 1);
  if (contentRange?.[3] && contentRange[3] !== '*') session.totalBytes = Number(contentRange[3]);
  await mkdir(dirname(file), { recursive: true });
  const writer = createWriteStream(file, { flags: existsSync(file) ? 'r+' : 'w', start: writeStart });
  let received = 0;
  pipeWebBody(upstream.body, response, writer, (bytes) => { received += bytes; session.downloadedBytes += bytes; });
  response.on('close', () => {
    if (received > 0) session.intervals = mergeInterval(session.intervals, writeStart, Math.min(writeEnd, writeStart + received - 1));
    void persistSessions();
  });
}

function resolveHlsUrl(value, base) {
  return new URL(value, base).toString();
}

function assetUrl(request, session, source) {
  return `${companionOrigin(request)}/v1/sessions/${session.id}/hls-asset?key=${encodeURIComponent(session.playbackKey)}&url=${encodeURIComponent(source)}`;
}

function companionOrigin(request) {
  const fallback = HOST === '0.0.0.0' ? `127.0.0.1:${PORT}` : `${HOST}:${PORT}`;
  const host = String(request.headers.host || fallback);
  return `http://${/^[a-z0-9.:[\]-]+$/i.test(host) ? host : fallback}`;
}

async function proxyHlsManifest(request, response, session, sourceUrl) {
  const upstream = await fetch(sourceUrl, { redirect: 'follow' });
  if (!upstream.ok) { json(request, response, upstream.status, { error: `Manifesto respondeu ${upstream.status}.` }); return; }
  const text = await upstream.text();
  const rewritten = text.split(/\r?\n/).map((line) => {
    if (!line) return line;
    if (!line.startsWith('#')) return assetUrl(request, session, resolveHlsUrl(line.trim(), sourceUrl));
    return line.replace(/URI="([^"]+)"/g, (_match, uri) => `URI="${assetUrl(request, session, resolveHlsUrl(uri, sourceUrl))}"`);
  }).join('\n');
  session.lastAccessAt = Date.now();
  session.stoppedAt = null;
  response.writeHead(200, { 'content-type': 'application/vnd.apple.mpegurl', 'cache-control': 'no-store' });
  response.end(rewritten);
}

async function proxyHlsAsset(request, response, session, sourceUrl) {
  const hash = createHash('sha256').update(sourceUrl).digest('hex');
  const file = join(session.directory, 'hls', hash);
  if (existsSync(file)) {
    const info = await stat(file);
    response.writeHead(200, { 'content-length': String(info.size), 'content-type': 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(response);
    return;
  }
  const upstream = await fetch(sourceUrl, { redirect: 'follow' });
  if (!upstream.ok) { json(request, response, upstream.status, { error: `Segmento respondeu ${upstream.status}.` }); return; }
  await mkdir(dirname(file), { recursive: true });
  copyHeaders(upstream, response);
  response.statusCode = upstream.status;
  const writer = createWriteStream(file, { flags: 'w' });
  pipeWebBody(upstream.body, response, writer, (bytes) => { session.downloadedBytes += bytes; });
  session.lastAccessAt = Date.now();
}

async function handle(request, response) {
  const url = new URL(request.url || '/', `http://${request.headers.host || `127.0.0.1:${PORT}`}`);
  const publicHandshake = url.pathname === '/v1/health' || url.pathname === '/v1/pair';
  setCors(request, response, publicHandshake);
  if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }

  if (request.method === 'GET' && url.pathname === '/v1/health') {
    json(request, response, 200, { ok: true, version: VERSION, paired: Boolean(config.token), cache: await cacheState(), capabilities: ['direct-video-cache', 'hls-cache', 'progress', 'auto-cleanup', 'launchers', 'local-media', 'debrid-integration', 'torrent-p2p'] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/v1/config') {
    if (!authorized(request)) { json(request, response, 401, { error: 'Companion não pareado.' }); return; }
    const body = await bodyJson(request);
    if (typeof body.realDebridApiKey === 'string') config.realDebridApiKey = body.realDebridApiKey;
    if (typeof body.torBoxApiKey === 'string') config.torBoxApiKey = body.torBoxApiKey;
    await persistConfig();
    json(request, response, 200, { ok: true });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/v1/games/local') {
    if (!authorized(request)) { json(request, response, 401, { error: 'Companion não pareado.' }); return; }
    try {
      const games = await scanLocalGames();
      json(request, response, 200, { ok: true, games });
    } catch (err) {
      json(request, response, 500, { error: err.message });
    }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/v1/pair') {
    const origin = request.headers.origin || 'local';
    const attempts = pairingAttempts.get(origin) || { count: 0, resetAt: Date.now() + 60_000 };
    if (attempts.resetAt < Date.now()) { attempts.count = 0; attempts.resetAt = Date.now() + 60_000; }
    attempts.count += 1;
    pairingAttempts.set(origin, attempts);
    if (attempts.count > 8) { json(request, response, 429, { error: 'Muitas tentativas. Aguarde um minuto.' }); return; }
    const body = await bodyJson(request);
    if (String(body.code || '') !== pairingCode) { json(request, response, 403, { error: 'Código de pareamento inválido.' }); return; }
    if (request.headers.origin && !config.allowedOrigins.includes(request.headers.origin)) config.allowedOrigins.push(request.headers.origin);
    config.token = randomBytes(32).toString('base64url');
    pairingCode = String(randomInt(100000, 999999));
    await persistConfig();
    json(request, response, 200, { token: config.token, endpoint: companionOrigin(request), cacheLimitBytes: config.cacheLimitBytes, cleanupDelayMs: config.cleanupDelayMs });
    return;
  }

  if (!authorized(request)) { json(request, response, 401, { error: 'Companion não pareado.' }); return; }

  if (request.method === 'GET' && url.pathname === '/v1/cache') {
    json(request, response, 200, { ...(await cacheState()), items: Array.from(sessions.values()).map(sessionSummary) });
    return;
  }
  if (request.method === 'DELETE' && url.pathname === '/v1/cache') {
    for (const session of sessions.values()) session.stoppedAt = Date.now() - config.cleanupDelayMs;
    await cleanup(true);
    json(request, response, 200, { ok: true, cache: await cacheState() });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/v1/sessions') {
    const body = await bodyJson(request);
    const source = safeSourceUrl(body.sourceUrl);
    if (body.authorizationConfirmed !== true) { json(request, response, 400, { error: 'Confirme que você pode acessar esta origem.' }); return; }
    
    let resolvedUrl = source.toString();
    let webtorrentFile = null;
    let webtorrentHash = null;
    
    if (source.protocol === 'magnet:') {
      if (config.realDebridApiKey) {
        try {
          resolvedUrl = await resolveRealDebridMagnet(source.toString());
        } catch (err) {
          console.warn('[RealDebrid Fallback]', err.message);
          if (config.torBoxApiKey) {
            resolvedUrl = await resolveTorBoxMagnet(source.toString());
          } else {
            const torrent = await new Promise((res, rej) => {
              torrentClient.add(source.toString(), { path: CACHE_DIR }, (t) => res(t));
              setTimeout(() => rej(new Error('WebTorrent timeout')), 18000);
            });
            webtorrentHash = torrent.infoHash;
            webtorrentFile = torrent.files.find(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name)) || torrent.files[0];
          }
        }
      } else if (config.torBoxApiKey) {
        try {
          resolvedUrl = await resolveTorBoxMagnet(source.toString());
        } catch (err) {
          console.warn('[TorBox Fallback]', err.message);
          const torrent = await new Promise((res, rej) => {
            torrentClient.add(source.toString(), { path: CACHE_DIR }, (t) => res(t));
            setTimeout(() => rej(new Error('WebTorrent timeout')), 18000);
          });
          webtorrentHash = torrent.infoHash;
          webtorrentFile = torrent.files.find(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name)) || torrent.files[0];
        }
      } else {
        const torrent = await new Promise((res, rej) => {
          torrentClient.add(source.toString(), { path: CACHE_DIR }, (t) => res(t));
          setTimeout(() => rej(new Error('WebTorrent timeout')), 18000);
        });
        webtorrentHash = torrent.infoHash;
        webtorrentFile = torrent.files.find(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name)) || torrent.files[0];
      }
    }

    const kind = body.kind === 'hls' || /\.m3u8(?:$|\?)/i.test(resolvedUrl) ? 'hls' : 'video';
    const id = randomBytes(12).toString('hex');
    const playbackKey = randomBytes(20).toString('base64url');
    const directory = join(CACHE_DIR, id);
    await mkdir(directory, { recursive: true });
    
    const session = { 
      id, 
      playbackKey, 
      sourceUrl: resolvedUrl, 
      title: String(body.title || (webtorrentFile ? webtorrentFile.name : '') || 'Reprodução'), 
      kind, 
      directory, 
      createdAt: Date.now(), 
      lastAccessAt: Date.now(), 
      stoppedAt: null, 
      downloadedBytes: 0, 
      progressSeconds: 0, 
      intervals: [],
      webtorrentFile,
      webtorrentHash
    };
    
    sessions.set(id, session);
    await persistSessions();
    const path = kind === 'hls' ? 'hls' : 'stream';
    json(request, response, 201, { id, kind, playbackUrl: `${companionOrigin(request)}/v1/sessions/${id}/${path}?key=${encodeURIComponent(playbackKey)}`, cleanupDelayMs: config.cleanupDelayMs });
    return;
  }

  const sessionMatch = url.pathname.match(/^\/v1\/sessions\/([a-f0-9]+)(?:\/(stream|hls|hls-asset|progress))?$/);
  if (sessionMatch) {
    const session = sessions.get(sessionMatch[1]);
    if (!session) { json(request, response, 404, { error: 'Sessão não encontrada.' }); return; }
    const action = sessionMatch[2];
    if (action === 'stream' && request.method === 'GET') {
      if (!playbackAuthorized(url, session)) { json(request, response, 403, { error: 'Chave de reprodução inválida.' }); return; }
      await proxyVideo(request, response, session);
      return;
    }
    if (action === 'hls' && request.method === 'GET') {
      if (!playbackAuthorized(url, session)) { json(request, response, 403, { error: 'Chave de reprodução inválida.' }); return; }
      await proxyHlsManifest(request, response, session, session.sourceUrl);
      return;
    }
    if (action === 'hls-asset' && request.method === 'GET') {
      if (!playbackAuthorized(url, session)) { json(request, response, 403, { error: 'Chave de reprodução inválida.' }); return; }
      const source = safeSourceUrl(url.searchParams.get('url'));
      await proxyHlsAsset(request, response, session, source.toString());
      return;
    }
    if (action === 'progress' && request.method === 'POST') {
      const body = await bodyJson(request);
      session.progressSeconds = Math.max(0, Number(body.seconds || 0));
      session.lastAccessAt = Date.now();
      await persistSessions();
      json(request, response, 200, { ok: true });
      return;
    }
    if (!action && request.method === 'DELETE') {
      const body = await bodyJson(request).catch(() => ({}));
      session.progressSeconds = Math.max(session.progressSeconds || 0, Number(body.seconds || 0));
      session.stoppedAt = Date.now();
      if (session.webtorrentHash) {
        try {
          const t = torrentClient.get(session.webtorrentHash);
          if (t) t.destroy({ destroyStore: true });
        } catch (err) { console.error('[webtorrent destroy]', err); }
      }
      await persistSessions();
      json(request, response, 200, { ok: true, deletesAt: session.stoppedAt + config.cleanupDelayMs });
      return;
    }
  }

  if (request.method === 'POST' && url.pathname === '/v1/launch') {
    const body = await bodyJson(request);
    const target = String(body.target || '');
    if (!/^(steam:|com\.epicgames\.launcher:|goggalaxy:|xbox:|https?:\/\/|[a-zA-Z]:\\)/i.test(target)) { json(request, response, 400, { error: 'Protocolo ou arquivo de launcher não permitido.' }); return; }
    if (process.platform !== 'win32') { json(request, response, 501, { error: 'Inicialização disponível no Companion Windows.' }); return; }
    const child = spawn('cmd.exe', ['/d', '/s', '/c', 'start', '', target], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
    json(request, response, 200, { ok: true });
    return;
  }

  json(request, response, 404, { error: 'Rota não encontrada.' });
}

const server = createServer((request, response) => {
  void handle(request, response).catch((error) => {
    console.error('[Hubora Companion]', error);
    if (!response.headersSent) json(request, response, 500, { error: error instanceof Error ? error.message : 'Erro interno.' });
    else response.destroy();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\nHubora Companion ${VERSION}`);
  console.log(`Endereço: http://${HOST}:${PORT}`);
  console.log(`Código de pareamento: ${pairingCode}`);
  console.log(`Cache: ${Math.round(config.cacheLimitBytes / 1024 ** 3)} GB • limpeza após ${Math.round(config.cleanupDelayMs / 60_000)} min\n`);
});

setInterval(() => void cleanup().catch((error) => console.error('[limpeza]', error)), 30_000).unref();

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
