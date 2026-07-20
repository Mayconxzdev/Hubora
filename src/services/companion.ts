import type { CompanionConfig, CompanionHealth } from '@/types';

const STORAGE_KEY = 'hubora-companion-config-v1';
const DEFAULT_CONFIG: CompanionConfig = {
  endpoint: 'http://127.0.0.1:49821',
  cacheLimitBytes: 25 * 1024 ** 3,
  cleanupDelayMs: 10 * 60_000,
};

function normalizedEndpoint(value: string) {
  return value.trim().replace(/\/$/, '');
}

export function getCompanionConfig(): CompanionConfig {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<CompanionConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...stored,
      endpoint: normalizedEndpoint(stored.endpoint || DEFAULT_CONFIG.endpoint),
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveCompanionConfig(config: CompanionConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, endpoint: normalizedEndpoint(config.endpoint) }));
}

async function request<T>(path: string, init: RequestInit = {}, requireToken = true): Promise<T> {
  const config = getCompanionConfig();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (requireToken && config.token) headers.set('x-hubora-token', config.token);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4_500);
  try {
    const response = await fetch(`${config.endpoint}${path}`, { ...init, headers, signal: controller.signal });
    const body = await response.json().catch(() => ({})) as T & { error?: string };
    if (!response.ok) throw new Error(body.error || `Companion respondeu ${response.status}.`);
    return body;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function detectCompanion(): Promise<CompanionHealth> {
  return request<CompanionHealth>('/v1/health', {}, false);
}

export async function pairCompanion(code: string, endpoint = DEFAULT_CONFIG.endpoint): Promise<CompanionConfig> {
  const previous = getCompanionConfig();
  saveCompanionConfig({ ...previous, endpoint: normalizedEndpoint(endpoint) });
  const result = await request<{ token: string; endpoint: string; cacheLimitBytes: number; cleanupDelayMs: number }>('/v1/pair', {
    method: 'POST',
    body: JSON.stringify({ code: code.trim() }),
  }, false);
  const config: CompanionConfig = {
    endpoint: result.endpoint || normalizedEndpoint(endpoint),
    token: result.token,
    pairedAt: Date.now(),
    cacheLimitBytes: result.cacheLimitBytes,
    cleanupDelayMs: result.cleanupDelayMs,
  };
  saveCompanionConfig(config);
  return config;
}

export async function getCompanionCache() {
  return request<{ usedBytes: number; limitBytes: number; sessions: number; cleanupDelayMs: number; items: Array<Record<string, unknown>> }>('/v1/cache');
}

export async function clearCompanionCache() {
  return request<{ ok: boolean }>('/v1/cache', { method: 'DELETE' });
}

export async function createCompanionSession(input: { sourceUrl: string; title: string; kind: 'video' | 'hls' }) {
  return request<{ id: string; kind: 'video' | 'hls'; playbackUrl: string; cleanupDelayMs: number }>('/v1/sessions', {
    method: 'POST',
    body: JSON.stringify({ ...input, authorizationConfirmed: true }),
  });
}

export async function updateCompanionProgress(sessionId: string, seconds: number) {
  return request<{ ok: boolean }>(`/v1/sessions/${encodeURIComponent(sessionId)}/progress`, {
    method: 'POST',
    body: JSON.stringify({ seconds }),
  });
}

export async function stopCompanionSession(sessionId: string, seconds: number) {
  return request<{ ok: boolean; deletesAt: number }>(`/v1/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    body: JSON.stringify({ seconds }),
  });
}

export async function launchWithCompanion(target: string) {
  return request<{ ok: boolean }>('/v1/launch', {
    method: 'POST',
    body: JSON.stringify({ target }),
  });
}

export function formatCompanionBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 GB';
  return `${(value / 1024 ** 3).toFixed(value >= 10 * 1024 ** 3 ? 0 : 1)} GB`;
}

export async function saveDebridKeys(realDebridApiKey: string, torBoxApiKey: string) {
  const config = getCompanionConfig();
  const nextConfig = {
    ...config,
    realDebridApiKey,
    torBoxApiKey
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextConfig));
  
  if (config.token) {
    try {
      await request<{ ok: boolean }>('/v1/config', {
        method: 'POST',
        body: JSON.stringify({ realDebridApiKey, torBoxApiKey })
      });
    } catch (err) {
      console.warn('Falha ao sincronizar chaves com o Companion:', err);
    }
  }
}

export async function syncDebridKeysWithCompanion() {
  const config = getCompanionConfig();
  if (config.token && (config.realDebridApiKey || config.torBoxApiKey)) {
    try {
      await request<{ ok: boolean }>('/v1/config', {
        method: 'POST',
        body: JSON.stringify({
          realDebridApiKey: config.realDebridApiKey || '',
          torBoxApiKey: config.torBoxApiKey || ''
        })
      });
    } catch (err) {
      console.warn('Falha no handshake silencioso com Companion:', err);
    }
  }
}

export async function getGamesFromCompanion() {
  return request<{ ok: boolean; games: any[] }>('/v1/games/local');
}

