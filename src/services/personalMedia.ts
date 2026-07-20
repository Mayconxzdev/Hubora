import type { IntegrationConfig, MediaItem, MediaType } from '@/types';

const SUPPORTED_INTEGRATION_KINDS = new Set<IntegrationConfig['kind']>(['jellyfin', 'komga', 'kavita', 'opds']);

export function isSupportedIntegrationKind(value: unknown): value is IntegrationConfig['kind'] {
  return typeof value === 'string' && SUPPORTED_INTEGRATION_KINDS.has(value as IntegrationConfig['kind']);
}

export interface PersonalMediaItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  mediaType: MediaType;
  progress?: number;
  imageUrl?: string;
  openUrl: string;
  source: IntegrationConfig['kind'];
  media: MediaItem;
}

function normalizeBaseUrl(url: string): string {
  const parsed = new URL(url.trim());
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) {
    throw new Error('Use HTTPS. HTTP só é aceito para localhost durante o desenvolvimento.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Não coloque usuário ou senha na URL. Use o campo de credencial.');
  }
  parsed.hash = '';
  return parsed.toString().replace(/\/+$/, '');
}

function authHeaders(config: IntegrationConfig): Headers {
  const headers = new Headers({ Accept: 'application/json, application/xml, application/atom+xml' });
  if (config.token) {
    if (config.kind === 'jellyfin') headers.set('X-Emby-Token', config.token);
    else if (config.kind === 'komga') headers.set('X-API-Key', config.token);
    else if (config.kind === 'kavita') headers.set('x-api-key', config.token);
    else headers.set('Authorization', `Bearer ${config.token}`);
  }
  return headers;
}

async function request(config: IntegrationConfig, path: string, init: RequestInit = {}) {
  const headers = authHeaders(config);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}${path}`, { ...init, headers });
  if (!response.ok) throw new Error(`${config.name}: ${response.status} ${response.statusText}`.trim());
  return response;
}

function mediaTypeForJellyfin(type: string): MediaType {
  if (type === 'Movie') return 'movie';
  return 'tv';
}

function jellyfinImage(config: IntegrationConfig, id: string): string | undefined {
  if (!config.token) return undefined;
  return `${normalizeBaseUrl(config.baseUrl)}/Items/${encodeURIComponent(id)}/Images/Primary?maxWidth=500&quality=82&api_key=${encodeURIComponent(config.token)}`;
}

async function jellyfinUser(config: IntegrationConfig): Promise<{ Id: string; Name?: string }> {
  const response = await request(config, '/Users/Me');
  return response.json();
}

async function browseJellyfin(config: IntegrationConfig): Promise<PersonalMediaItem[]> {
  const user = await jellyfinUser(config);
  const params = new URLSearchParams({
    Recursive: 'true',
    IncludeItemTypes: 'Movie,Series,Episode',
    Fields: 'Overview,Genres,RunTimeTicks,UserData,ProductionYear,DateCreated',
    ImageTypeLimit: '1',
    EnableImageTypes: 'Primary,Backdrop',
    Limit: '120',
    SortBy: 'DateCreated',
    SortOrder: 'Descending',
  });
  const response = await request(config, `/Users/${encodeURIComponent(user.Id)}/Items?${params}`);
  const data = await response.json() as { Items?: Array<Record<string, any>> };
  return (data.Items || []).map((item) => {
    const mediaType = mediaTypeForJellyfin(String(item.Type || 'Series'));
    const progress = Number(item.UserData?.PlayedPercentage || 0);
    const media: MediaItem = {
      id: `jellyfin:${item.Id}`,
      source: 'jellyfin',
      sourceId: item.Id,
      title: item.Name || 'Sem título',
      originalTitle: item.OriginalTitle,
      overview: item.Overview,
      mediaType,
      genres: item.Genres || [],
      releaseDate: item.ProductionYear ? `${item.ProductionYear}-01-01` : undefined,
      runtime: item.RunTimeTicks ? Math.round(Number(item.RunTimeTicks) / 600_000_000) : undefined,
    };
    const imageUrl = jellyfinImage(config, item.Id);
    return {
      id: String(item.Id),
      title: media.title,
      subtitle: [item.Type, item.ProductionYear, progress ? `${Math.round(progress)}%` : ''].filter(Boolean).join(' • '),
      description: item.Overview,
      mediaType,
      progress,
      imageUrl,
      openUrl: `${normalizeBaseUrl(config.baseUrl)}/web/#/details?id=${encodeURIComponent(item.Id)}`,
      source: 'jellyfin' as const,
      media,
    };
  });
}

async function browseKomga(config: IntegrationConfig): Promise<PersonalMediaItem[]> {
  const response = await request(config, '/api/v1/series/latest?size=80');
  const data = await response.json();
  const series = Array.isArray(data) ? data : data.content || [];
  return series.map((item: any) => {
    const media: MediaItem = {
      id: `komga:${item.id}`,
      source: 'komga',
      sourceId: item.id,
      title: item.metadata?.title || item.name || 'Sem título',
      overview: item.metadata?.summary,
      mediaType: 'comic',
      genres: item.metadata?.genres || [],
      authors: (item.metadata?.authors || []).map((author: any) => author.name).filter(Boolean),
      status: item.metadata?.status,
      books: undefined,
    } as MediaItem;
    const readCount = Number(item.booksReadCount || 0);
    const totalCount = Number(item.booksCount || 0);
    const progress = totalCount ? (readCount / totalCount) * 100 : 0;
    return {
      id: String(item.id), title: media.title, subtitle: `${totalCount || 0} volumes • ${Math.round(progress)}%`,
      description: media.overview, mediaType: 'comic' as const, progress,
      openUrl: `${normalizeBaseUrl(config.baseUrl)}/series/${encodeURIComponent(item.id)}`,
      source: 'komga' as const, media,
    };
  });
}

async function browseKavita(config: IntegrationConfig): Promise<PersonalMediaItem[]> {
  const response = await request(config, '/api/Series/recently-added-v2?PageNumber=0&PageSize=80', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ libraries: [], genres: [], tags: [], writers: [], artists: [], languages: [], ageRatings: [], publicationStatus: [], sortOptions: { sortField: 1, isAscending: false } }),
  });
  const data = await response.json();
  const series = Array.isArray(data) ? data : data.result || data.items || [];
  return series.map((item: any) => {
    const mediaType: MediaType = item.format === 3 || item.libraryType === 2 ? 'book' : 'comic';
    const media: MediaItem = {
      id: `kavita:${item.id}`,
      source: 'kavita', sourceId: item.id, title: item.name || item.localizedName || 'Sem título',
      overview: item.summary, mediaType, genres: item.genres || [], releaseDate: item.releaseYear ? `${item.releaseYear}-01-01` : undefined,
    };
    const pagesRead = Number(item.pagesRead || 0);
    const pages = Number(item.pages || 0);
    const progress = pages ? (pagesRead / pages) * 100 : Number(item.readProgress || 0);
    return {
      id: String(item.id), title: media.title, subtitle: [item.releaseYear, progress ? `${Math.round(progress)}%` : ''].filter(Boolean).join(' • '),
      description: media.overview, mediaType, progress,
      openUrl: `${normalizeBaseUrl(config.baseUrl)}/library/series/${encodeURIComponent(item.id)}`,
      source: 'kavita' as const, media,
    };
  });
}

function textContent(element: Element | null, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const value = element?.querySelector(selector)?.textContent?.trim();
    if (value) return value;
  }
  return undefined;
}

async function browseOpds(config: IntegrationConfig): Promise<PersonalMediaItem[]> {
  const response = await request(config, '');
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('json')) {
    const data = await response.json();
    const publications = data.publications || data.navigation || [];
    return publications.slice(0, 100).map((item: any, index: number) => {
      const link = (item.links || []).find((entry: any) => entry.rel === 'http://opds-spec.org/acquisition' || String(entry.type || '').includes('epub')) || item.links?.[0];
      const media: MediaItem = { id: `opds:${item.metadata?.identifier || index}`, source: 'opds', sourceId: item.metadata?.identifier || index, title: item.metadata?.title || 'Sem título', overview: item.metadata?.description, mediaType: 'book', authors: (item.metadata?.author || []).map((author: any) => author.name || author).filter(Boolean) };
      return { id: String(media.sourceId), title: media.title, subtitle: media.authors?.join(', '), description: media.overview, mediaType: 'book' as const, openUrl: new URL(link?.href || config.baseUrl, config.baseUrl).toString(), source: 'opds' as const, media };
    });
  }
  const xml = await response.text();
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(document.querySelectorAll('entry')).slice(0, 100).map((entry, index) => {
    const linkElement = Array.from(entry.querySelectorAll('link')).find((link) => /acquisition|epub|pdf|cbz|cbr/i.test(`${link.getAttribute('rel')} ${link.getAttribute('type')}`)) || entry.querySelector('link');
    const href = linkElement?.getAttribute('href') || config.baseUrl;
    const title = textContent(entry, ['title']) || 'Sem título';
    const author = textContent(entry, ['author > name', 'dc\\:creator', 'creator']);
    const description = textContent(entry, ['summary', 'content']);
    const id = textContent(entry, ['id']) || `${index}`;
    const media: MediaItem = { id: `opds:${id}`, source: 'opds', sourceId: id, title, overview: description, mediaType: 'book', authors: author ? [author] : [] };
    return { id, title, subtitle: author, description, mediaType: 'book' as const, openUrl: new URL(href, config.baseUrl).toString(), source: 'opds' as const, media };
  });
}

export async function testIntegration(config: IntegrationConfig): Promise<{ ok: boolean; detail: string }> {
  try {
    if (config.kind === 'jellyfin') {
      const user = await jellyfinUser(config);
      return { ok: true, detail: `Jellyfin conectado como ${user.Name || 'usuário'}` };
    }
    if (config.kind === 'komga') {
      const response = await request(config, '/api/v1/libraries');
      const data = await response.json();
      return { ok: true, detail: `Komga conectado • ${Array.isArray(data) ? data.length : data.content?.length || 0} biblioteca(s)` };
    }
    if (config.kind === 'kavita') {
      await request(config, '/api/Account');
      return { ok: true, detail: 'Kavita conectado' };
    }
    const response = await request(config, '');
    return { ok: true, detail: `Catálogo OPDS respondeu ${response.status}` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : 'Falha desconhecida' };
  }
}

export async function browsePersonalMedia(config: IntegrationConfig): Promise<PersonalMediaItem[]> {
  if (config.kind === 'jellyfin') return browseJellyfin(config);
  if (config.kind === 'komga') return browseKomga(config);
  if (config.kind === 'kavita') return browseKavita(config);
  return browseOpds(config);
}

export function jellyfinItemUrl(config: IntegrationConfig, itemId: string): string {
  return `${normalizeBaseUrl(config.baseUrl)}/web/#/details?id=${encodeURIComponent(itemId)}`;
}
