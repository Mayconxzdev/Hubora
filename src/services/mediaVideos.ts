import type { MediaVideo, MediaVideoKind } from '@/types';

export interface TmdbVideoInput {
  id?: string;
  key?: string;
  name?: string;
  site?: string;
  type?: string;
  official?: boolean;
  iso_639_1?: string;
  published_at?: string;
}

export interface JikanVideoInput {
  youtube_id?: string;
  embed_url?: string;
  url?: string;
}

const SAFE_YOUTUBE_KEY = /^[A-Za-z0-9_-]{6,20}$/;

function videoKind(type = ''): MediaVideoKind {
  const normalized = type.trim().toLowerCase();
  if (normalized === 'trailer') return 'trailer';
  if (normalized === 'teaser') return 'teaser';
  if (normalized === 'clip') return 'clip';
  if (normalized === 'featurette' || normalized === 'behind the scenes') return 'featurette';
  if (normalized === 'opening') return 'opening';
  if (normalized === 'ending') return 'ending';
  if (normalized === 'gameplay') return 'gameplay';
  return 'other';
}

function videoPriority(video: MediaVideo): number {
  const language = video.language === 'pt' ? 0 : video.language === 'en' ? 1 : 2;
  const kind = ({ trailer: 0, teaser: 1, clip: 2, featurette: 3, opening: 4, ending: 5, gameplay: 6, other: 7 } as const)[video.kind];
  return language * 100 + (video.official ? 0 : 20) + kind;
}

function embedUrl(key: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}`;
}

export function youtubeKeyFromUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    let key = '';
    if (host === 'youtu.be') key = url.pathname.split('/').filter(Boolean)[0] || '';
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(host)) {
      key = url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] || '';
    }
    return SAFE_YOUTUBE_KEY.test(key) ? key : null;
  } catch {
    return null;
  }
}

export function normalizeTmdbVideos(inputs: TmdbVideoInput[]): MediaVideo[] {
  const normalized = inputs.flatMap((input): MediaVideo[] => {
    if (input.site !== 'YouTube' || !input.key || !SAFE_YOUTUBE_KEY.test(input.key)) return [];
    return [{
      id: input.id || `tmdb-${input.key}`,
      key: input.key,
      name: input.name?.trim() || input.type?.trim() || 'Vídeo oficial',
      kind: videoKind(input.type),
      provider: 'TMDB / YouTube',
      embedUrl: embedUrl(input.key),
      official: input.official === true,
      language: input.iso_639_1,
      publishedAt: input.published_at,
    }];
  }).sort((left, right) => videoPriority(left) - videoPriority(right) || (right.publishedAt || '').localeCompare(left.publishedAt || ''));

  const seen = new Set<string>();
  return normalized.filter((video) => {
    if (seen.has(video.key)) return false;
    seen.add(video.key);
    return true;
  }).slice(0, 12);
}

export function normalizeJikanVideo(input?: JikanVideoInput): MediaVideo | null {
  if (!input) return null;
  const key = input.youtube_id && SAFE_YOUTUBE_KEY.test(input.youtube_id)
    ? input.youtube_id
    : youtubeKeyFromUrl(input.embed_url) || youtubeKeyFromUrl(input.url);
  if (!key) return null;
  return {
    id: `jikan-${key}`,
    key,
    name: 'Trailer oficial',
    kind: 'trailer',
    provider: 'Jikan / MyAnimeList',
    embedUrl: embedUrl(key),
    official: true,
  };
}

export function normalizeLegacyTrailer(url?: string): MediaVideo | null {
  const key = youtubeKeyFromUrl(url);
  if (!key) return null;
  return { id: `youtube-${key}`, key, name: 'Trailer', kind: 'trailer', provider: 'YouTube', embedUrl: embedUrl(key), official: false };
}
