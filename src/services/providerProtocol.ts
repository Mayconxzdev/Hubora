import { huboraDb } from '@/lib/db';
import type { MediaAccess, MediaItem, MediaType, ProviderCapability, ProviderConfig, ProviderManifest } from '@/types';

interface StremioManifest {
  id: string;
  name: string;
  description?: string;
  version: string;
  resources?: Array<string | { name: string }>;
  types?: string[];
  catalogs?: Array<{ type: string; id: string; name?: string; extra?: Array<{ name: string }> }>;
  idPrefixes?: string[];
}

interface StremioMetaPreview {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  description?: string;
  releaseInfo?: string;
  genres?: string[];
}

interface HuboraManifest {
  protocol: 'hubora-provider/v1';
  id: string;
  name: string;
  description?: string;
  version: string;
  capabilities: ProviderCapability[];
  mediaTypes: string[];
  endpoints: {
    search?: string;
    access?: string;
    health?: string;
  };
}

interface HuboraSearchItem {
  id: string | number;
  title: string;
  originalTitle?: string;
  mediaType?: string;
  poster?: string;
  backdrop?: string;
  description?: string;
  year?: string;
  genres?: string[];
  externalIds?: MediaItem['externalIds'];
}

const MEDIA_MAP: Record<string, MediaType> = {
  movie: 'movie', movies: 'movie', series: 'tv', tv: 'tv', dorama: 'tv', doramas: 'tv', anime: 'anime', manga: 'manga', comic: 'comic', comics: 'comic', book: 'book', books: 'book', novel: 'book', novels: 'book', game: 'game', games: 'game',
};

export const BUILTIN_PROVIDERS: ProviderManifest[] = [
  {
    id: 'tmdb', name: 'TMDB', description: 'Filmes, séries, doramas, elenco, imagens e disponibilidade.', version: '1',
    baseUrl: 'https://api.themoviedb.org/3', capabilities: ['catalog', 'search', 'details', 'availability'], mediaTypes: ['movie', 'tv'], official: true, enabledByDefault: true,
  },
  {
    id: 'jikan', name: 'Jikan / MyAnimeList', description: 'Catálogo de anime e mangá com fallback local.', version: '1',
    baseUrl: 'https://api.jikan.moe/v4', capabilities: ['catalog', 'search', 'details'], mediaTypes: ['anime', 'manga'], official: false, enabledByDefault: true,
  },
  {
    id: 'google-books', name: 'Google Books', description: 'Livros, amostras, previews incorporáveis e acesso por região.', version: '1',
    baseUrl: 'https://www.googleapis.com/books/v1', capabilities: ['catalog', 'search', 'details', 'reader'], mediaTypes: ['book', 'comic'], official: true, enabledByDefault: true,
  },
  {
    id: 'open-library', name: 'Open Library', description: 'Obras, edições e acesso a títulos disponíveis para leitura ou empréstimo.', version: '1',
    baseUrl: 'https://openlibrary.org', capabilities: ['catalog', 'search', 'details', 'reader'], mediaTypes: ['book', 'comic'], official: true, enabledByDefault: true,
  },
  {
    id: 'project-gutenberg', name: 'Project Gutenberg', description: 'Catálogo OPDS de ebooks gratuitos.', version: '1',
    baseUrl: 'https://www.gutenberg.org/ebooks/search.opds/', capabilities: ['catalog', 'search', 'reader'], mediaTypes: ['book'], official: true, enabledByDefault: true,
  },
  {
    id: 'igdb', name: 'IGDB', description: 'Jogos, plataformas, franquias, empresas e lançamentos.', version: '1',
    baseUrl: '/api/games', capabilities: ['catalog', 'search', 'details'], mediaTypes: ['game'], official: true, enabledByDefault: true,
  },
  {
    id: 'trace-moe', name: 'trace.moe', description: 'Identificação especializada de cenas de anime.', version: '1',
    baseUrl: 'https://api.trace.moe', capabilities: ['search'], mediaTypes: ['anime'], official: true, enabledByDefault: true,
  },
];

function normalizeBase(url: string) {
  return url.replace(/\/manifest\.json(?:\?.*)?$/i, '').replace(/\/$/, '');
}

function resourceNames(manifest: StremioManifest): string[] {
  return (manifest.resources || []).map((resource) => typeof resource === 'string' ? resource : resource.name);
}

function toCapabilities(manifest: StremioManifest): ProviderCapability[] {
  const resources = new Set(resourceNames(manifest));
  const output: ProviderCapability[] = [];
  if (resources.has('catalog')) output.push('catalog', 'search');
  if (resources.has('meta')) output.push('details');
  if (resources.has('stream')) output.push('stream');
  if (resources.has('subtitles')) output.push('subtitles');
  return Array.from(new Set(output));
}

function toMediaType(type: string): MediaType | undefined {
  return MEDIA_MAP[type.toLowerCase()];
}

export async function inspectStremioProvider(manifestUrl: string): Promise<{ config: ProviderConfig; manifest: StremioManifest }> {
  const url = new URL(manifestUrl);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('Use um manifesto HTTPS ou um servidor local confiável.');
  }
  const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Manifesto respondeu ${response.status}.`);
  const rawManifest = await response.json() as StremioManifest | HuboraManifest;
  if ('protocol' in rawManifest && rawManifest.protocol === 'hubora-provider/v1') {
    if (!rawManifest.id || !rawManifest.name || !rawManifest.version || !rawManifest.endpoints) throw new Error('Manifesto Hubora incompatível.');
    const allowedCapabilities = rawManifest.capabilities.filter((item): item is ProviderCapability => ['catalog', 'search', 'details', 'stream', 'reader', 'subtitles', 'availability', 'progress', 'download', 'chapters', 'health'].includes(item));
    const now = Date.now();
    const config: ProviderConfig = {
      id: `hubora:${rawManifest.id}`,
      protocol: 'hubora',
      manifestUrl: url.toString(),
      name: rawManifest.name,
      enabled: true,
      officialOnly: true,
      capabilities: Array.from(new Set(allowedCapabilities)),
      mediaTypes: Array.from(new Set((rawManifest.mediaTypes || []).map(toMediaType).filter((item): item is MediaType => Boolean(item)))),
      createdAt: now,
      updatedAt: now,
    };
    return { config, manifest: rawManifest as unknown as StremioManifest };
  }
  const manifest = rawManifest as StremioManifest;
  if (!manifest.id || !manifest.name || !manifest.version) throw new Error('Manifesto incompatível.');
  const now = Date.now();
  const config: ProviderConfig = {
    id: `stremio:${manifest.id}`,
    protocol: 'stremio',
    manifestUrl: url.toString(),
    name: manifest.name,
    enabled: true,
    officialOnly: true,
    capabilities: toCapabilities(manifest),
    mediaTypes: Array.from(new Set((manifest.types || []).map(toMediaType).filter((item): item is MediaType => Boolean(item)))),
    createdAt: now,
    updatedAt: now,
  };
  return { config, manifest };
}

function endpointUrl(manifestUrl: string, template: string, values: Record<string, string>) {
  const manifest = new URL(manifestUrl);
  let endpoint = template;
  for (const [key, value] of Object.entries(values)) endpoint = endpoint.replaceAll(`{${key}}`, encodeURIComponent(value));
  const resolved = new URL(endpoint, manifest);
  if (resolved.origin !== manifest.origin) throw new Error('O endpoint do manifesto precisa usar a mesma origem.');
  return resolved.toString();
}

async function loadHuboraManifest(config: ProviderConfig) {
  const response = await fetch(config.manifestUrl, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Não foi possível carregar o manifesto.');
  const manifest = await response.json() as HuboraManifest;
  if (manifest.protocol !== 'hubora-provider/v1') throw new Error('Protocolo Hubora inválido.');
  return manifest;
}

export async function saveProviderConfig(config: ProviderConfig) {
  await huboraDb.providerConfigs.put(config);
}

export async function listProviderConfigs(): Promise<ProviderConfig[]> {
  return huboraDb.providerConfigs.orderBy('updatedAt').reverse().toArray();
}

export async function removeProviderConfig(id: string) {
  await huboraDb.providerConfigs.delete(id);
}

export async function searchStremioCatalog(config: ProviderConfig, query: string): Promise<MediaItem[]> {
  if (config.protocol === 'hubora') {
    const manifest = await loadHuboraManifest(config);
    if (!manifest.endpoints.search) return [];
    const response = await fetch(endpointUrl(config.manifestUrl, manifest.endpoints.search, { query }));
    if (!response.ok) return [];
    const data = await response.json() as { items?: HuboraSearchItem[] };
    return (data.items || []).slice(0, 60).flatMap((item): MediaItem[] => {
      const mediaType = toMediaType(item.mediaType || 'movie');
      if (!mediaType) return [];
      return [{
        id: `hubora:${manifest.id}:${item.id}`,
        source: `hubora:${manifest.id}`,
        sourceId: item.id,
        title: item.title,
        originalTitle: item.originalTitle,
        mediaType,
        posterPath: item.poster,
        backdropPath: item.backdrop,
        overview: item.description,
        releaseDate: item.year,
        genres: item.genres || [],
        externalIds: item.externalIds,
        providerUrl: normalizeBase(config.manifestUrl),
      }];
    });
  }
  const manifestResponse = await fetch(config.manifestUrl);
  if (!manifestResponse.ok) throw new Error('Não foi possível carregar o manifesto.');
  const manifest = await manifestResponse.json() as StremioManifest;
  const base = normalizeBase(config.manifestUrl);
  const catalogs = (manifest.catalogs || []).filter((catalog) => catalog.extra?.some((item) => item.name === 'search'));
  const results: MediaItem[] = [];
  for (const catalog of catalogs.slice(0, 8)) {
    const endpoint = `${base}/catalog/${encodeURIComponent(catalog.type)}/${encodeURIComponent(catalog.id)}/search=${encodeURIComponent(query)}.json`;
    try {
      const response = await fetch(endpoint);
      if (!response.ok) continue;
      const data = await response.json() as { metas?: StremioMetaPreview[] };
      for (const item of data.metas || []) {
        const mediaType = toMediaType(item.type);
        if (!mediaType) continue;
        results.push({
          id: `stremio:${manifest.id}:${item.id}`,
          source: `stremio:${manifest.id}`,
          sourceId: item.id,
          title: item.name,
          posterPath: item.poster,
          backdropPath: item.background,
          overview: item.description,
          mediaType,
          releaseDate: item.releaseInfo,
          genres: item.genres || [],
          providerUrl: base,
        });
      }
    } catch {
      // One catalog may fail while the remaining providers continue.
    }
  }
  return Array.from(new Map(results.map((item) => [`${item.mediaType}:${item.sourceId}`, item])).values());
}

export async function resolveSafeStremioStreams(config: ProviderConfig, type: string, id: string): Promise<MediaAccess[]> {
  if (config.protocol === 'hubora') {
    const manifest = await loadHuboraManifest(config);
    if (!manifest.endpoints.access) return [];
    const response = await fetch(endpointUrl(config.manifestUrl, manifest.endpoints.access, { type, id }));
    if (!response.ok) return [];
    const data = await response.json() as { access?: Array<Record<string, unknown>> };
  return (data.access || []).flatMap((access, index): MediaAccess[] => {
    const rawUrl = typeof access.url === 'string' ? access.url : undefined;
    const embedId = typeof access.youtubeId === 'string' ? access.youtubeId : undefined;
    if (embedId && /^[\w-]{6,20}$/.test(embedId)) return [{ id: `${config.id}:yt:${index}`, label: String(access.label || 'YouTube'), kind: 'embed', embedId, provider: config.name, free: access.free === true, mode: 'embedded-player', health: 'available' }];
    if (!rawUrl) return [];
    
    if (rawUrl.startsWith('magnet:')) return [];
    
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'https:') return [];
      const declared = String(access.kind || 'official-link');
      const safeKinds: MediaAccess['kind'][] = ['official-link', 'video', 'hls', 'dash', 'audio', 'book-preview', 'epub', 'pdf', 'html'];
      const kind = safeKinds.includes(declared as MediaAccess['kind']) ? declared as MediaAccess['kind'] : 'official-link';
      if (/\.torrent(?:$|\?)/i.test(url.pathname + url.search)) return [];
      return [{ id: `${config.id}:access:${index}`, label: String(access.label || 'Abrir'), kind, url: rawUrl, provider: config.name, quality: typeof access.quality === 'string' ? access.quality : undefined, language: typeof access.language === 'string' ? access.language : undefined, free: access.free === true, legalNote: 'Recurso fornecido pelo provedor configurado.', health: 'available' }];
    } catch { return []; }
  });
  }
  if (!config.capabilities.includes('stream')) return [];
  const base = normalizeBase(config.manifestUrl);
  const response = await fetch(`${base}/stream/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`);
  if (!response.ok) return [];
  const data = await response.json() as { streams?: Array<Record<string, unknown>> };
  return (data.streams || []).flatMap((stream, index): MediaAccess[] => {
    const rawUrl = typeof stream.url === 'string' ? stream.url : undefined;
    const ytId = typeof stream.ytId === 'string' ? stream.ytId : undefined;
    const infoHash = typeof stream.infoHash === 'string' ? stream.infoHash : undefined;
    
    if (infoHash) return [];
    
    if (ytId) {
      return [{ id: `${config.id}:yt:${index}`, label: String(stream.title || stream.name || 'YouTube'), kind: 'embed', embedId: ytId, provider: config.name, free: true, legalNote: 'Origem fornecida pelo provedor configurado.' }];
    }
    if (!rawUrl) return [];
    
    if (rawUrl.startsWith('magnet:')) return [];
    
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'https:') return [];
      if (/\.torrent(?:$|\?)/i.test(url.pathname + url.search)) return [];
      const kind: MediaAccess['kind'] = /\.m3u8(?:$|\?)/i.test(url.pathname + url.search) ? 'hls' : 'video';
      return [{ id: `${config.id}:stream:${index}`, label: String(stream.title || stream.name || 'Reproduzir'), kind, url: rawUrl, provider: config.name, quality: typeof stream.description === 'string' ? stream.description : undefined, legalNote: 'Recurso fornecido pelo provedor configurado.' }];
    } catch {
      return [];
    }
  });
}

export function getUniversalVideoStreams(imdbId: string, title: string, mediaType: string): MediaAccess[] {
  if (!imdbId) return [];
  const typeParam = mediaType === 'movie' ? 'movie' : 'tv';
  return [
    {
      id: `builtin:playimdb:${imdbId}`,
      label: 'PlayIMDb (Player Principal)',
      kind: 'embed',
      embedId: imdbId,
      url: `https://playimdb.com/embed/${imdbId}`,
      provider: 'PlayIMDb',
      free: true,
      legalNote: 'Resolvedor universal de player externo baseado no ID do IMDb.'
    },
    {
      id: `builtin:vidsrc:${imdbId}`,
      label: 'Vidsrc (Multi-fontes Alternativo)',
      kind: 'embed',
      embedId: imdbId,
      url: `https://vidsrc.to/embed/${typeParam}/${imdbId}`,
      provider: 'Vidsrc',
      free: true,
      legalNote: 'Resolvedor multi-fontes baseado no ID do IMDb.'
    }
  ];
}
