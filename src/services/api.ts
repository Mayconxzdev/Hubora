import { MediaItem } from '@/types';
import { useStore } from '@/store/useStore';
import {
  adaptTMDBMovie,
  adaptTMDBTV,
  adaptJikanAnime,
  adaptJikanManga,
  adaptAnilistMedia,
  AnilistMedia,
} from './adapters';
import type { TMDBMovie } from './adapters';

import {
  adaptGoogleBooksVolume,
  fetchBooksWithFallback,
  getOfficialReadableCatalogItem,
  getOpenLibraryArchiveAccess,
  OFFICIAL_READABLE_CATALOG,
} from './apiBookService';
import { normalizeTmdbVideos } from './mediaVideos';
import { canQueryExplicitProviderContent } from './adultPolicy';
import { isVaultUnlocked } from './vault';
import { findOfficialGameByTitle, getOfficialGameCatalogItem } from './officialGameCatalog';

// Utility for fetching with exponential backoff retry
const fetchWithRetry = async (url: string, options?: RequestInit, maxRetries = 3): Promise<Response> => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retries) * 1000;
        console.warn(`Rate limit hit for ${url}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
        continue;
      }
      if (!response.ok && response.status >= 500) {
        const delay = Math.pow(2, retries) * 1000;
        console.warn(`Server error ${response.status} for ${url}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
        continue;
      }
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      if (retries === maxRetries - 1) throw error;
      const delay = Math.pow(2, retries) * 1000;
      console.warn(`Network error for ${url}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      retries++;
    }
  }
  throw new Error(`Max retries reached for ${url}`);
};

function tmdbUrl(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const query = new URLSearchParams({ path });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  return `/api/tmdb?${query.toString()}`;
}

const TVMAZE_BASE_URL = 'https://api.tvmaze.com';

type TVMazeShow = {
  id: number;
  name: string;
  language?: string;
  genres?: string[];
  status?: string;
  premiered?: string;
  ended?: string;
  runtime?: number;
  averageRuntime?: number;
  officialSite?: string;
  rating?: { average?: number | null };
  weight?: number;
  image?: { medium?: string; original?: string };
  summary?: string;
  network?: { country?: { code?: string; name?: string } };
  webChannel?: { country?: { code?: string; name?: string } | null };
  _embedded?: { nextepisode?: { airdate?: string; season?: number; number?: number; name?: string } };
};

function stripMarkup(value?: string) {
  return value
    ?.replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function adaptTVMazeShow(show: TVMazeShow): MediaItem {
  const country = show.network?.country?.code || show.webChannel?.country?.code;
  return {
    id: `tvmaze-tv-${show.id}`,
    sourceId: show.id,
    source: 'tvmaze',
    providerIdentities: [{ provider: 'tvmaze', providerId: String(show.id), mediaType: 'tv', verifiedAt: Date.now() }],
    title: show.name,
    originalTitle: show.name,
    posterPath: show.image?.original || show.image?.medium,
    backdropPath: show.image?.original || show.image?.medium,
    mediaType: country && ['KR', 'JP', 'CN', 'TW', 'TH'].includes(country) ? 'drama' : 'tv',
    releaseDate: show.premiered,
    overview: stripMarkup(show.summary) || 'Sem descrição cadastrada no TVmaze.',
    voteAverage: show.rating?.average ? Number(show.rating.average.toFixed(1)) : 0,
    genres: show.genres || [],
    runtime: show.averageRuntime || show.runtime || undefined,
    status: show.status === 'Ended' ? 'Ended' : 'Returning Series',
    providerUrl: show.officialSite || `https://www.tvmaze.com/shows/${show.id}`,
  };
}

async function discoverTVMaze(page = 1, query = '', doramaOnly = false, signal?: AbortSignal): Promise<MediaItem[]> {
  try {
    const url = query
      ? `${TVMAZE_BASE_URL}/search/shows?q=${encodeURIComponent(query)}`
      : `${TVMAZE_BASE_URL}/shows?page=${Math.max(0, page - 1)}`;
    const response = await fetchWithRetry(url, { headers: { accept: 'application/json' }, signal }, 2);
    if (!response.ok) return [];
    const payload = (await response.json()) as Array<TVMazeShow | { show: TVMazeShow }>;
    let shows = payload.map((record) => ('show' in record ? record.show : record));
    if (doramaOnly) {
      const eastAsianCountries = new Set(['KR', 'JP', 'CN', 'TW', 'TH']);
      const eastAsianLanguages = /korean|japanese|chinese|thai/i;
      shows = shows.filter(
        (show) =>
          eastAsianCountries.has(show.network?.country?.code || show.webChannel?.country?.code || '') ||
          eastAsianLanguages.test(show.language || ''),
      );
    }
    return deduplicateMediaItems(shows.slice(0, 24).map(adaptTVMazeShow));
  } catch (error) {
    console.warn('TVmaze fallback falhou:', error);
    return [];
  }
}

// Jikan Configuration (Anime/Manga)
const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

const jikanQueue: { task: () => Promise<void>; reject: (reason?: any) => void }[] = [];
let isProcessingJikan = false;

const processJikanQueue = async () => {
  if (isProcessingJikan || jikanQueue.length === 0) return;
  isProcessingJikan = true;
  while (jikanQueue.length > 0) {
    const item = jikanQueue.shift();
    if (item) {
      await item.task();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  isProcessingJikan = false;
};

const jikanCache = new Map<string, { data: any; timestamp: number }>();
const JIKAN_CACHE_TTL = 1000 * 60 * 60 * 12;
const JIKAN_CACHE_PREFIX = 'hubora_jikan_';

const getJikanCache = (url: string): any | null => {
  try {
    const key = JIKAN_CACHE_PREFIX + btoa(url).replace(/=/g, '');
    const item = localStorage.getItem(key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (Date.now() - parsed.timestamp < JIKAN_CACHE_TTL) {
      return parsed.data;
    }
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  return null;
};

const setJikanCache = (url: string, data: any) => {
  try {
    const key = JIKAN_CACHE_PREFIX + btoa(url).replace(/=/g, '');
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // ignore
  }
};

const JIKAN_TIMEOUT_MS = 8_000;

function jikanProxyUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://api.jikan.moe' || !parsed.pathname.startsWith('/v4/')) {
    throw new Error('Rota Jikan inválida');
  }
  const proxy = new URL('/api/jikan', window.location.origin);
  proxy.searchParams.set('path', parsed.pathname.slice('/v4'.length));
  parsed.searchParams.forEach((value, key) => proxy.searchParams.set(key, value));
  return `${proxy.pathname}${proxy.search}`;
}

function isJikanUsable(response: Response): boolean {
  return response.ok && response.headers.get('x-hubora-provider-status') !== 'unavailable';
}

async function fetchJikanAttempt(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  const timeout = window.setTimeout(() => controller.abort(), JIKAN_TIMEOUT_MS);
  options?.signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    return await fetch(jikanProxyUrl(url), {
      ...options,
      headers: { Accept: 'application/json', ...options?.headers },
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
    options?.signal?.removeEventListener('abort', abortFromCaller);
  }
}

const fetchJikan = async (url: string, options?: RequestInit, retries = 1): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const cachedData = jikanCache.get(url);
    if (cachedData && Date.now() - cachedData.timestamp < JIKAN_CACHE_TTL) {
      resolve(
        new Response(JSON.stringify(cachedData.data), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );
      return;
    }

    const localCachedData = getJikanCache(url);
    if (localCachedData) {
      jikanCache.set(url, { data: localCachedData, timestamp: Date.now() });
      resolve(
        new Response(JSON.stringify(localCachedData), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );
      return;
    }

    if (jikanQueue.length > 20) {
      reject(new Error('Jikan queue is full'));
      return;
    }

    jikanQueue.push({
      reject,
      task: async () => {
        try {
          let res = await fetchJikanAttempt(url, options);
          if ((res.status === 429 || res.status >= 500) && retries > 0) {
            await new Promise((r) => setTimeout(r, res.status === 429 ? 1_000 : 500));
            res = await fetchJikanAttempt(url, options);
          }

          if (isJikanUsable(res)) {
            const clonedRes = res.clone();
            const data = await clonedRes.json();
            jikanCache.set(url, { data, timestamp: Date.now() });
            setJikanCache(url, data);
          }
          resolve(res);
        } catch (err) {
          reject(err);
        }
      },
    });
    processJikanQueue();
  });
};

// Anilist Configuration
const ANILIST_URL = 'https://graphql.anilist.co';

const fetchAnilistById = async (id: string): Promise<MediaItem | null> => {
  const graphqlQuery = `
    query ($id: Int) {
      Media(id: $id) {
        id
        type
        title { romaji english native }
        coverImage { extraLarge large }
        bannerImage
        description
        status
        startDate { year month day }
        averageScore
        genres
        isAdult
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: graphqlQuery, variables: { id: Number(id) } }),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const media = payload?.data?.Media as (AnilistMedia & { type?: 'ANIME' | 'MANGA' }) | undefined;
    if (!media?.id || !media.type) return null;
    return adaptAnilistMedia(media, media.type === 'MANGA' ? 'manga' : 'anime');
  } catch (error) {
    console.warn('AniList detail fetch error:', error);
    return null;
  }
};

// --- INTENT DETECTION & QUERY CLEANING ---
const detectIntent = (query: string) => {
  const q = query.toLowerCase();
  return {
    isAnime: /\banime\b|\banimes\b|\botaku\b|\bcrunchyroll\b/i.test(q),
    isManga: /\bmanga\b|\bmangas\b|\bmanhwa\b|\bwebtoon\b/i.test(q),
    isMovie: /\bfilme\b|\bfilmes\b|\bmovie\b|\bcinema\b/i.test(q),
    isTv: /\bserie\b|\bseries\b|\bsérie\b|\bséries\b|\btv\b/i.test(q),
    isGame: /\bjogo\b|\bjogos\b|\bgame\b|\bgames\b/i.test(q),
    isBook: /\blivro\b|\blivros\b|\bbook\b|\bbooks\b/i.test(q),
    isNovel: /\bnovel\b|\bnovels\b|\blight novel\b/i.test(q),
    isComic: /\bhq\b|\bhqs\b|\bquadrinho\b|\bquadrinhos\b|\bcomic\b/i.test(q),
    isDorama: /\bdorama\b|\bdoramas\b|\bk-drama\b|\bdrama\b/i.test(q),
  };
};

const cleanQuery = (query: string) => {
  const q = query.trim();
  if (q.length < 15) return q;
  return (
    q
      .replace(
        /\b(quero|ver|assistir|ler|jogar|recomenda|indica|filme|serie|série|anime|manga|mangá|jogo|game|livro|novel|hq|dorama|sobre|como|parecido|com|want|to|watch|read|play|recommend|show|me|movie|series|tv|book|comic|drama|about|like|similar|to)\b/gi,
        '',
      )
      .replace(/\s+/g, ' ')
      .trim() || q
  );
};

export const normalizeSearchText = (str: string): string => {
  return str
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

const isTMDBAvailable = () => true;

const isAdultAllowed = () => {
  const profile = useStore.getState().user;
  return canQueryExplicitProviderContent(profile, isVaultUnlocked());
};

const discoverAnilist = async (
  page = 1,
  type: 'ANIME' | 'MANGA',
  sort = 'bypopularity',
  genreId = '',
  query = '',
  signal?: AbortSignal,
): Promise<MediaItem[]> => {
  const graphqlQuery = `
    query ($page: Int, $perPage: Int, $type: MediaType, $sort: [MediaSort], $genre: String, $search: String, $isAdult: Boolean) {
      Page(page: $page, perPage: $perPage) {
        media(type: $type, sort: $sort, genre: $genre, search: $search, isAdult: $isAdult) {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          bannerImage
          description
          format
          status
          startDate { year month day }
          averageScore
          genres
          isAdult
        }
      }
    }
  `;

  const genreIdToName: Record<string, string> = {
    '1': 'Action',
    '2': 'Adventure',
    '4': 'Comedy',
    '8': 'Drama',
    '10': 'Fantasy',
    '14': 'Horror',
    '7': 'Mystery',
    '22': 'Romance',
    '24': 'Sci-Fi',
    '36': 'Slice of Life',
    '30': 'Sports',
    '37': 'Supernatural',
  };

  const genreName = genreId ? genreIdToName[genreId] : undefined;
  let anilistSort = ['POPULARITY_DESC'];
  if (sort === 'score') anilistSort = ['SCORE_DESC'];
  else if (sort === 'trending') anilistSort = ['TRENDING_DESC'];

  const sfw = !isAdultAllowed();
  const variables: any = { page, perPage: 20, type, sort: anilistSort, isAdult: sfw ? false : undefined };
  if (genreName) variables.genre = genreName;
  if (query && query.trim()) variables.search = query.trim();

  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: graphqlQuery, variables }),
    signal,
  };

  try {
    const response = await fetch(ANILIST_URL, options);
    if (!response.ok) throw new Error(`Anilist API returned status ${response.status}`);
    const data = await response.json();
    const mediaList = data?.data?.Page?.media || [];
    return mediaList.map((m: any) => adaptAnilistMedia(m, type.toLowerCase() as 'anime' | 'manga'));
  } catch (error) {
    console.error('Anilist discover fallback error:', error);
    return [];
  }
};

const deduplicateMediaItems = (items: MediaItem[]): MediaItem[] => {
  const seenKeys = new Set<string>();
  const seenTitles = new Set<string>();

  return items.filter((item) => {
    if (!item || !item.id) return false;
    const idKey = `${item.mediaType || 'media'}-${item.id}`;
    const cleanTitle = (item.title || item.originalTitle || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');
    const titleKey = cleanTitle ? `${item.mediaType || 'media'}-${cleanTitle}` : null;

    if (seenKeys.has(idKey)) return false;
    if (titleKey && seenTitles.has(titleKey)) return false;

    seenKeys.add(idKey);
    if (titleKey) seenTitles.add(titleKey);
    return true;
  });
};

const searchMultiCache = new Map<string, { results: MediaItem[]; timestamp: number }>();
const SEARCH_CACHE_TTL = 1000 * 60 * 15;
const MULTI_SEARCH_SOURCE_TIMEOUT_MS = 4_500;

export type MultiSearchSourceStatus = 'timed_out' | 'failed';

type MultiSearchOptions = {
  signal?: AbortSignal;
  perCategoryLimit?: number;
  onSourceStatus?: (source: string, status: MultiSearchSourceStatus) => void;
};

type MultiSearchSourceResult = {
  source: string;
  items: MediaItem[];
  status?: MultiSearchSourceStatus;
};

function abortError() {
  return new DOMException('Busca cancelada', 'AbortError');
}

async function runMultiSearchSource(
  source: string,
  run: (signal: AbortSignal) => Promise<MediaItem[]>,
  parentSignal?: AbortSignal,
): Promise<MultiSearchSourceResult> {
  if (parentSignal?.aborted) throw abortError();

  const controller = new AbortController();
  const abortFromParent = () => controller.abort();
  parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, MULTI_SEARCH_SOURCE_TIMEOUT_MS);

  try {
    const items = await run(controller.signal);
    if (parentSignal?.aborted) throw abortError();
    return { source, items, status: timedOut ? 'timed_out' : undefined };
  } catch (error) {
    if (parentSignal?.aborted || (error instanceof DOMException && error.name === 'AbortError' && !timedOut)) {
      throw abortError();
    }
    return { source, items: [], status: timedOut ? 'timed_out' : 'failed' };
  } finally {
    window.clearTimeout(timeout);
    parentSignal?.removeEventListener('abort', abortFromParent);
  }
}

function catalogSearchText(item: MediaItem): string {
  return normalizeSearchText([
    item.title,
    item.originalTitle,
    ...(item.genres || []),
    item.overview || '',
  ].join(' '));
}

function isComicResult(item: MediaItem): boolean {
  if (item.source !== 'googlebooks') return item.mediaType === 'comic';
  return /(comic|quadrinh|graphicnovel|manga|marvel|dccomics)/.test(catalogSearchText(item));
}

function isNovelResult(item: MediaItem): boolean {
  if (item.source !== 'googlebooks') return item.mediaType === 'novel';
  return /(lightnovel|webnovel|webfiction|novel)/.test(catalogSearchText(item));
}

function isBookResult(item: MediaItem): boolean {
  const text = catalogSearchText(item);
  return !/(comic|quadrinh|graphicnovel|manga|lightnovel|webnovel|webfiction)/.test(text);
}

type TMDBCollectionResponse = {
  id: number;
  name: string;
  overview?: string;
  parts?: TMDBMovie[];
};

function collectionMatchScore(name: string, query: string) {
  const normalizedName = normalizeSearchText(name);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery || !normalizedName.includes(normalizedQuery)) return -1;
  if (normalizedName === normalizedQuery) return 300;
  if (normalizedName.startsWith(normalizedQuery)) return 200;
  return 100;
}

export const api = {
  instantLocalSearch: (query: string): MediaItem[] => {
    if (!query || !query.trim()) return [];
    const norm = normalizeSearchText(query);
    const results: MediaItem[] = [];

    // Instant local catalog match (< 1ms)
    OFFICIAL_READABLE_CATALOG.forEach((item) => {
      const normTitle = normalizeSearchText(item.title);
      const normOrig = normalizeSearchText(item.originalTitle || '');
      if (normTitle.includes(norm) || normOrig.includes(norm)) {
        results.push(item);
      }
    });

    // Search active cache entries (< 1ms)
    searchMultiCache.forEach((entry) => {
      entry.results.forEach((item) => {
        const normTitle = normalizeSearchText(item.title);
        const normOrig = normalizeSearchText(item.originalTitle || '');
        if (normTitle.includes(norm) || normOrig.includes(norm)) {
          results.push(item);
        }
      });
    });

    return deduplicateMediaItems(results).slice(0, 12);
  },

  discoverMovies: async (
    page = 1,
    sort = 'popularity.desc',
    genre = '',
    query = '',
    signal?: AbortSignal,
  ): Promise<MediaItem[]> => {
    try {
      const tmdbKey = isTMDBAvailable();
      const adult = isAdultAllowed();
      if (tmdbKey) {
        let url = tmdbUrl('/discover/movie', {
          sort_by: sort,
          page,
          language: 'pt-BR',
          include_adult: adult,
          with_genres: genre,
        });
        if (query) url = tmdbUrl('/search/movie', { query, page, language: 'pt-BR', include_adult: adult });

        const res = await fetch(url, { signal });
        const data = await res.json();
        if (data.results) return deduplicateMediaItems(data.results.map(adaptTMDBMovie));
      }
      return [];
    } catch {
      return [];
    }
  },

  discoverTV: async (
    page = 1,
    sort = 'popularity.desc',
    genre = '',
    query = '',
    signal?: AbortSignal,
  ): Promise<MediaItem[]> => {
    try {
      const tmdbKey = isTMDBAvailable();
      const adult = isAdultAllowed();
      if (tmdbKey) {
        let url = tmdbUrl('/discover/tv', {
          sort_by: sort,
          page,
          language: 'pt-BR',
          include_adult: adult,
          with_genres: genre,
        });
        if (query) url = tmdbUrl('/search/tv', { query, page, language: 'pt-BR', include_adult: adult });

        const res = await fetch(url, { signal });
        const data = await res.json();
        if (data.results?.length) return deduplicateMediaItems(data.results.map(adaptTMDBTV));
      }
      return discoverTVMaze(page, query, false, signal);
    } catch {
      return [];
    }
  },

  discoverAnime: async (
    page = 1,
    sort = 'bypopularity',
    genre = '',
    query = '',
    signal?: AbortSignal,
  ): Promise<MediaItem[]> => {
    try {
      const sfw = !isAdultAllowed();
      let url = `${JIKAN_BASE_URL}/anime?page=${page}&order_by=${sort === 'bypopularity' ? 'members' : 'score'}&sort=desc&sfw=${sfw}`;
      if (genre) url += `&genres=${genre}`;
      if (query) url += `&q=${encodeURIComponent(query)}`;

      const res = await fetchJikan(url, { signal });
      if (!isJikanUsable(res)) return discoverAnilist(page, 'ANIME', sort, genre, query, signal);
      const data = await res.json();
      if (data.data && data.data.length > 0) return deduplicateMediaItems(data.data.map(adaptJikanAnime));
      return discoverAnilist(page, 'ANIME', sort, genre, query, signal);
    } catch {
      return discoverAnilist(page, 'ANIME', sort, genre, query, signal);
    }
  },

  discoverManga: async (
    page = 1,
    sort = 'bypopularity',
    genre = '',
    query = '',
    signal?: AbortSignal,
  ): Promise<MediaItem[]> => {
    try {
      const sfw = !isAdultAllowed();
      let url = `${JIKAN_BASE_URL}/manga?page=${page}&order_by=${sort === 'bypopularity' ? 'members' : 'score'}&sort=desc&sfw=${sfw}`;
      if (genre) url += `&genres=${genre}`;
      if (query) url += `&q=${encodeURIComponent(query)}`;

      const res = await fetchJikan(url, { signal });
      if (!isJikanUsable(res)) return discoverAnilist(page, 'MANGA', sort, genre, query, signal);
      const data = await res.json();
      if (data.data && data.data.length > 0) return deduplicateMediaItems(data.data.map(adaptJikanManga));
      return discoverAnilist(page, 'MANGA', sort, genre, query, signal);
    } catch {
      return discoverAnilist(page, 'MANGA', sort, genre, query, signal);
    }
  },

  discoverComics: async (
    page = 1,
    sort = 'relevance',
    genre = '',
    query = '',
    signal?: AbortSignal,
  ): Promise<MediaItem[]> => {
    try {
      const startIndex = (page - 1) * 20;
      let searchQuery = query ? `subject:comics ${query}` : 'subject:comics';
      if (genre) searchQuery += ` subject:${genre}`;
      const orderBy = sort === 'newest' ? 'newest' : 'relevance';
      const url = `/api/google-books?q=${encodeURIComponent(searchQuery)}&startIndex=${startIndex}&maxResults=20&orderBy=${orderBy}&langRestrict=pt`;
      const results = await fetchBooksWithFallback(url, 'comic', searchQuery, signal);
      return results.filter(isComicResult);
    } catch {
      return [];
    }
  },

  discoverBooks: async (
    page = 1,
    sort = 'relevance',
    genre = '',
    query = '',
    signal?: AbortSignal,
  ): Promise<MediaItem[]> => {
    try {
      const startIndex = (page - 1) * 20;
      let searchQuery = query.trim() || 'subject:fiction';
      if (genre) searchQuery += ` subject:${genre}`;
      const orderBy = sort === 'newest' ? 'newest' : 'relevance';
      const url = `/api/google-books?q=${encodeURIComponent(searchQuery)}&startIndex=${startIndex}&maxResults=20&orderBy=${orderBy}&langRestrict=pt`;
      const results = await fetchBooksWithFallback(url, 'book', searchQuery, signal);
      return results.filter(isBookResult);
    } catch {
      return [];
    }
  },

  discoverNovels: async (
    page = 1,
    sort = 'relevance',
    genre = '',
    query = '',
    signal?: AbortSignal,
  ): Promise<MediaItem[]> => {
    try {
      const startIndex = (page - 1) * 20;
      let searchQuery = query.trim() ? `"light novel" ${query.trim()}` : '"light novel"';
      if (genre) searchQuery += ` subject:${genre}`;
      const orderBy = sort === 'newest' ? 'newest' : 'relevance';
      const url = `/api/google-books?q=${encodeURIComponent(searchQuery)}&startIndex=${startIndex}&maxResults=20&orderBy=${orderBy}&langRestrict=pt`;
      const results = await fetchBooksWithFallback(url, 'novel', searchQuery, signal);
      return results.filter(isNovelResult);
    } catch {
      return [];
    }
  },

  discoverGames: async (
    _page = 1,
    _sort = '-rating',
    _genre = '',
    query = '',
    signal?: AbortSignal,
  ): Promise<MediaItem[]> => {
    const officialMatch = query.trim() ? findOfficialGameByTitle(query) : null;
    try {
      const url = query ? `/api/games/search?q=${encodeURIComponent(query)}` : `/api/games/trending`;
      const res = await fetch(url, { signal });
      if (!res.ok) return officialMatch ? [officialMatch] : [];
      const data = await res.json();
      const remoteGames = Array.isArray(data) ? data : [];
      return deduplicateMediaItems(officialMatch ? [officialMatch, ...remoteGames] : remoteGames);
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        console.warn('Game API indisponível:', error);
      }
      return officialMatch ? [officialMatch] : [];
    }
  },

  getGameDeals: async (title: string): Promise<any[]> => {
    try {
      const url = `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(title)}&limit=1`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (data && data.length > 0) {
        const gameID = data[0].gameID;
        const infoUrl = `https://www.cheapshark.com/api/1.0/games?id=${gameID}`;
        const infoRes = await fetch(infoUrl);
        if (!infoRes.ok) return [];
        const infoData = await infoRes.json();
        return infoData.deals || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  getSimilarMovies: async (tmdbId: string): Promise<MediaItem[]> => {
    try {
      const response = await fetchWithRetry(tmdbUrl(`/movie/${tmdbId}/similar`, { page: 1 }));
      if (!response.ok) return [];
      const data = await response.json();
      return (data.results || []).map(adaptTMDBMovie).filter((item: MediaItem) => item.posterPath);
    } catch {
      return [];
    }
  },

  getSimilarTV: async (tmdbId: string): Promise<MediaItem[]> => {
    try {
      const response = await fetchWithRetry(tmdbUrl(`/tv/${tmdbId}/similar`, { page: 1 }));
      if (!response.ok) return [];
      const data = await response.json();
      return (data.results || []).map(adaptTMDBTV).filter((item: MediaItem) => item.posterPath);
    } catch {
      return [];
    }
  },

  /**
   * Resolve a film collection through TMDB's explicit collection relation.
   * This is deliberately narrower than a text search: unrelated adaptations,
   * homonyms and fan works must not become a "franchise order" by accident.
   */
  getMovieCollectionByQuery: async (query: string): Promise<{ name: string; overview?: string; items: MediaItem[] } | null> => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) return null;
    try {
      const searchResponse = await fetchWithRetry(tmdbUrl('/search/collection', { query: cleanQuery, page: 1, language: 'pt-BR' }));
      if (!searchResponse.ok) return null;
      const searchData = await searchResponse.json() as { results?: Array<Pick<TMDBCollectionResponse, 'id' | 'name'>> };
      const collection = (searchData.results || [])
        .map((candidate) => ({ candidate, score: collectionMatchScore(candidate.name, cleanQuery) }))
        .filter((entry) => entry.score >= 0)
        .sort((a, b) => b.score - a.score)[0]?.candidate;
      if (!collection) return null;

      const detailResponse = await fetchWithRetry(tmdbUrl(`/collection/${collection.id}`, { language: 'pt-BR' }));
      if (!detailResponse.ok) return null;
      const detail = await detailResponse.json() as TMDBCollectionResponse;
      const items = (detail.parts || [])
        .map(adaptTMDBMovie)
        .sort((a, b) => (a.releaseDate || '9999-12-31').localeCompare(b.releaseDate || '9999-12-31'));
      if (!items.length) return null;
      return { name: detail.name || collection.name, overview: detail.overview, items };
    } catch {
      return null;
    }
  },

  getTrendingAnime: async (): Promise<MediaItem[]> => {
    try {
      const sfw = !isAdultAllowed();
      const res = await fetchJikan(`${JIKAN_BASE_URL}/top/anime?limit=10&sfw=${sfw}`);
      if (!isJikanUsable(res)) return discoverAnilist(1, 'ANIME', 'trending');
      const data = await res.json();
      if (data.data && data.data.length > 0) return deduplicateMediaItems(data.data.map(adaptJikanAnime));
      return discoverAnilist(1, 'ANIME', 'trending');
    } catch {
      return discoverAnilist(1, 'ANIME', 'trending');
    }
  },

  getTrendingManga: async (): Promise<MediaItem[]> => {
    try {
      const sfw = !isAdultAllowed();
      const res = await fetchJikan(`${JIKAN_BASE_URL}/top/manga?limit=10&sfw=${sfw}`);
      if (!isJikanUsable(res)) return discoverAnilist(1, 'MANGA', 'trending');
      const data = await res.json();
      if (data.data && data.data.length > 0) return deduplicateMediaItems(data.data.map(adaptJikanManga));
      return discoverAnilist(1, 'MANGA', 'trending');
    } catch {
      return discoverAnilist(1, 'MANGA', 'trending');
    }
  },

  getTrending: async (): Promise<MediaItem[]> => {
    try {
      const tmdbKey = isTMDBAvailable();
      const sfw = !isAdultAllowed();
      const promises: Promise<any>[] = [];

      if (tmdbKey) {
        promises.push(fetch(tmdbUrl('/trending/movie/week', { language: 'pt-BR' })).then((r) => r.json()));
        promises.push(fetch(tmdbUrl('/trending/tv/week', { language: 'pt-BR' })).then((r) => r.json()));
      }

      promises.push(
        fetchJikan(`${JIKAN_BASE_URL}/top/anime?filter=airing&limit=15&sfw=${sfw}`).then(async (r) =>
          isJikanUsable(r) ? r.json() : discoverAnilist(1, 'ANIME', 'trending'),
        ),
      );
      promises.push(
        fetchJikan(`${JIKAN_BASE_URL}/top/manga?filter=publishing&limit=15&sfw=${sfw}`).then(async (r) =>
          isJikanUsable(r) ? r.json() : discoverAnilist(1, 'MANGA', 'trending'),
        ),
      );
      promises.push(
        fetch(`/api/games/trending`)
          .then((r) => r.json())
          .catch(() => []),
      );
      promises.push(
        fetchBooksWithFallback(
          `/api/google-books?q=${encodeURIComponent('subject:fiction')}&orderBy=newest&maxResults=10`,
          'book',
          'ficção',
        ).catch(() => []),
      );

      const results = (await Promise.allSettled(promises)) as any[];
      const movies: MediaItem[] = [];
      const tv: MediaItem[] = [];
      const anime: MediaItem[] = [];
      const manga: MediaItem[] = [];
      const games: MediaItem[] = [];
      const books: MediaItem[] = [];

      results.forEach((res) => {
        if (res.status === 'fulfilled' && res.value) {
          if (res.value.results) {
            movies.push(...res.value.results.map(adaptTMDBMovie));
          } else if (Array.isArray(res.value)) {
            const value = res.value as MediaItem[];
            if (value[0]?.mediaType === 'anime') anime.push(...value);
            else if (value[0]?.mediaType === 'manga') manga.push(...value);
            else if (value[0]?.mediaType === 'book' || value[0]?.mediaType === 'novel') books.push(...value);
            else games.push(...value);
          } else if (res.value.data) {
            anime.push(...res.value.data.map(adaptJikanAnime));
          }
        }
      });

      return deduplicateMediaItems([...movies, ...tv, ...anime, ...manga, ...games, ...books]);
    } catch {
      return [];
    }
  },

  searchMulti: async (
    query: string,
    page: number = 1,
    options: MultiSearchOptions = {},
  ): Promise<MediaItem[]> => {
    if (!query || query.trim().length < 2 || options.signal?.aborted) return [];
    const perCategoryLimit = Math.max(1, Math.min(12, options.perCategoryLimit || 6));
    const cacheKey = `${query.toLowerCase().trim()}-p${page}-c${perCategoryLimit}`;
    const cachedEntry = searchMultiCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < SEARCH_CACHE_TTL) {
      return cachedEntry.results;
    }

    const searchTerms = cleanQuery(query);
    const intent = detectIntent(query);

    try {
      // Uma API lenta não pode congelar a busca inteira. Cada categoria tem
      // seu próprio cancelamento e o consumidor recebe um estado parcial explícito.
      const sources: Array<{ source: string; run: (signal: AbortSignal) => Promise<MediaItem[]> }> = [
        { source: 'Livros', run: (signal) => api.discoverBooks(page, 'relevance', '', searchTerms, signal) },
        { source: 'Filmes', run: (signal) => api.discoverMovies(page, 'popularity.desc', '', searchTerms, signal) },
        { source: 'Séries e doramas', run: (signal) => api.discoverTV(page, 'popularity.desc', '', searchTerms, signal) },
        { source: 'Jogos', run: (signal) => api.discoverGames(page, '-rating', '', searchTerms, signal) },
        { source: 'Animes', run: (signal) => api.discoverAnime(page, 'bypopularity', '', searchTerms, signal) },
        { source: 'Mangás', run: (signal) => api.discoverManga(page, 'bypopularity', '', searchTerms, signal) },
        { source: 'Novels', run: (signal) => api.discoverNovels(page, 'relevance', '', searchTerms, signal) },
        { source: 'Quadrinhos', run: (signal) => api.discoverComics(page, 'relevance', '', searchTerms, signal) },
      ];

      const settled = await Promise.allSettled(
        sources.map(({ source, run }) => runMultiSearchSource(source, run, options.signal)),
      );
      if (options.signal?.aborted) throw new DOMException('Busca cancelada', 'AbortError');
      const sourceResults = settled
        .filter((res): res is PromiseFulfilledResult<MultiSearchSourceResult> => res.status === 'fulfilled')
        .map((res) => res.value);
      sourceResults.forEach(({ source, status }) => {
        if (status) options.onSourceStatus?.(source, status);
      });
      const flatResults = sourceResults
        .map((result) => result.items)
        .flat();

      const normQuery = normalizeSearchText(searchTerms);

      // Scoring & Ranking based on exact title match & intent
      const scoredResults = flatResults.map((item) => {
        let score = item.voteAverage || 5.0;
        const normTitle = normalizeSearchText(item.title);
        const normOriginal = normalizeSearchText(item.originalTitle || '');

        // Exact Title Match (Massive +100 Boost for ANY query match!)
        if (normTitle === normQuery || normOriginal === normQuery) {
          score += 100;
        } else if (normTitle.includes(normQuery) || normQuery.includes(normTitle)) {
          score += 50;
        }

        // Intent Bonus
        if (intent.isBook && item.mediaType === 'book') score += 30;
        if (intent.isMovie && item.mediaType === 'movie') score += 30;
        if (intent.isTv && item.mediaType === 'tv') score += 30;
        if (intent.isGame && item.mediaType === 'game') score += 30;
        if (intent.isAnime && item.mediaType === 'anime') score += 30;
        if (intent.isManga && item.mediaType === 'manga') score += 30;

        return { item, score };
      });

      // Deduplicate and return top ranked
      const uniqueItems = new Map<string, MediaItem>();
      scoredResults
        .sort((a, b) => b.score - a.score)
        .forEach(({ item }) => {
          const key = `${item.mediaType || 'media'}-${item.id}`;
          if (!uniqueItems.has(key)) {
            uniqueItems.set(key, item);
          }
        });

      const categoryCounts = new Map<string, number>();
      const finalResults = Array.from(uniqueItems.values()).filter((item) => {
        const category = item.mediaType;
        const count = categoryCounts.get(category) || 0;
        if (count >= perCategoryLimit) return false;
        categoryCounts.set(category, count + 1);
        return true;
      });
      searchMultiCache.set(cacheKey, { results: finalResults, timestamp: Date.now() });
      return finalResults;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return [];
      console.error('searchMulti error', e);
      return [];
    }
  },

  getDetails: async (id: string): Promise<MediaItem | null> => {
    if (!id) return null;

    const officialItem = getOfficialReadableCatalogItem(id);
    if (officialItem) return officialItem;

    const officialGame = getOfficialGameCatalogItem(id);
    if (officialGame) return officialGame;

    if (id.startsWith('tmdb-movie-')) {
      const tmdbId = id.replace('tmdb-movie-', '');
      try {
        const [res, videosRes] = await Promise.all([
          fetch(tmdbUrl(`/movie/${tmdbId}`, { language: 'pt-BR' })),
          fetch(tmdbUrl(`/movie/${tmdbId}/videos`, { language: 'pt-BR' })).catch(() => null),
        ]);
        const data = await res.json();
        let videos: any[] = [];
        if (videosRes && videosRes.ok) {
          const vData = await videosRes.json();
          videos = normalizeTmdbVideos(vData.results);
        }
        if (data.id) return { ...adaptTMDBMovie(data), videos };
      } catch (e) {
        console.warn('TMDB detail fetch error:', e);
      }
    }

    if (id.startsWith('tmdb-tv-')) {
      const tmdbId = id.replace('tmdb-tv-', '');
      try {
        const [res, videosRes] = await Promise.all([
          fetch(tmdbUrl(`/tv/${tmdbId}`, { language: 'pt-BR' })),
          fetch(tmdbUrl(`/tv/${tmdbId}/videos`, { language: 'pt-BR' })).catch(() => null),
        ]);
        const data = await res.json();
        let videos: any[] = [];
        if (videosRes && videosRes.ok) {
          const vData = await videosRes.json();
          videos = normalizeTmdbVideos(vData.results);
        }
        if (data.id) return { ...adaptTMDBTV(data), videos };
      } catch (e) {
        console.warn('TMDB tv detail error:', e);
      }
    }

    if (id.startsWith('mal-anime-')) {
      const malId = id.replace('mal-anime-', '');
      try {
        const response = await fetchJikan(`${JIKAN_BASE_URL}/anime/${encodeURIComponent(malId)}/full`);
        if (!isJikanUsable(response)) return null;
        const payload = await response.json();
        return payload?.data ? adaptJikanAnime(payload.data) : null;
      } catch (error) {
        console.warn('Jikan anime detail error:', error);
        return null;
      }
    }

    if (id.startsWith('mal-manga-')) {
      const malId = id.replace('mal-manga-', '');
      try {
        const response = await fetchJikan(`${JIKAN_BASE_URL}/manga/${encodeURIComponent(malId)}/full`);
        if (!isJikanUsable(response)) return null;
        const payload = await response.json();
        return payload?.data ? adaptJikanManga(payload.data) : null;
      } catch (error) {
        console.warn('Jikan manga detail error:', error);
        return null;
      }
    }

    if (id.startsWith('anilist-')) {
      return fetchAnilistById(id.replace('anilist-', ''));
    }

    if (id.startsWith('ol-')) {
      const novel = id.startsWith('ol-novel-');
      const olId = id.replace(novel ? 'ol-novel-' : 'ol-', '');
      try {
        const res = await fetch(`https://openlibrary.org/works/${olId}.json`);
        if (res.ok) {
          const data = await res.json();
          const editionsRes = await fetch(`https://openlibrary.org/works/${olId}/editions.json`);
          const access: any[] = [];
          if (editionsRes.ok) {
            const editionsData = await editionsRes.json();
            const entryWithOcaid = editionsData.entries?.find((e: any) => e.ocaid);
            if (entryWithOcaid) {
              const archiveAccess = await getOpenLibraryArchiveAccess(entryWithOcaid);
              if (archiveAccess) access.push(archiveAccess);
            }
          }
          access.push({
            id: `openlibrary-${olId}`,
            label: 'Abrir Open Library',
            kind: 'official-link',
            url: `https://openlibrary.org/works/${olId}`,
            provider: 'Open Library',
            free: false,
          });

          return {
            id,
            source: 'openlibrary',
            sourceId: olId,
            title: data.title || 'Sem título',
            mediaType: novel ? 'novel' : 'book',
            posterPath: data.covers?.[0] ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg` : undefined,
            overview:
              typeof data.description === 'string' ? data.description : data.description?.value || 'Sem descrição.',
            status: 'Published',
            providerUrl: `https://openlibrary.org/works/${olId}`,
            access,
          };
        }
      } catch (e) {
        console.warn('OL get details error', e);
      }
    }

    if (id.startsWith('gbooks-')) {
      const novel = id.startsWith('gbooks-novel-');
      const gbooksId = id.replace(novel ? 'gbooks-novel-' : 'gbooks-', '');
      try {
        const res = await fetch(`/api/google-books?id=${encodeURIComponent(gbooksId)}`);
        const data = await res.json();
        if (data.id) return adaptGoogleBooksVolume(data, novel ? 'novel' : 'book');
      } catch (e) {
        console.warn('GBooks details error:', e);
      }
    }

    if (
      id.startsWith('igdb-') ||
      id.startsWith('cs-') ||
      id.startsWith('rawg-') ||
      id.startsWith('game-') ||
      id.startsWith('ftg-')
    ) {
      try {
        const res = await fetch(`/api/games/${encodeURIComponent(id)}`);
        if (res.ok) {
          const details = await res.json();
          if (details && !Array.isArray(details) && details.title) return details;
        }
      } catch (e) {
        console.error('error fetching game details', e);
      }
      return null;
    }

    return null;
  },

  discoverDoramas: async (page = 1, sort = 'popularity.desc', genre = '', query = ''): Promise<MediaItem[]> => {
    return api.discoverTV(page, sort, genre, query);
  },

  getCurrentSeasonAnime: async (_limit = 12): Promise<MediaItem[]> => {
    try {
      const res = await fetchJikan(`${JIKAN_BASE_URL}/seasons/now?limit=12`);
      if (!isJikanUsable(res)) return [];
      const data = await res.json();
      if (data.data) return deduplicateMediaItems(data.data.map(adaptJikanAnime));
      return [];
    } catch {
      return [];
    }
  },

  getUpcoming: async (): Promise<MediaItem[]> => {
    try {
      const tmdbKey = isTMDBAvailable();
      if (tmdbKey) {
        const res = await fetch(tmdbUrl('/movie/upcoming', { region: 'BR', language: 'pt-BR' }));
        const data = await res.json();
        if (data.results) return deduplicateMediaItems(data.results.map(adaptTMDBMovie));
      }
      return api.getTrending();
    } catch {
      return api.getTrending();
    }
  },

  getTVEpisodes: async (tmdbId: string, season: number): Promise<any[]> => {
    try {
      const res = await fetch(tmdbUrl(`/tv/${tmdbId}/season/${season}`, { language: 'pt-BR' }));
      if (!res.ok) return [];
      const data = await res.json();
      return data.episodes || [];
    } catch {
      return [];
    }
  },

  searchByTitle: async (
    title: string,
    type: string,
    _year?: number,
    _forceAdult = false,
  ): Promise<MediaItem | null> => {
    const results = await api.searchMulti(title, 1);
    const match = results.find((r) => r.mediaType === type || type === 'all');
    return match || results[0] || null;
  },
};

export const mangaDexApi = {
  async searchManga(title: string): Promise<string | null> {
    try {
      const res = await fetch(`https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=1`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data?.[0]?.id || null;
    } catch (err) {
      console.error('[MangaDex search]', err);
      return null;
    }
  },

  async getChapters(mangaId: string): Promise<Array<{ id: string; chapter: string; title: string; volume: string }>> {
    try {
      const res = await fetch(
        `https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=pt-br&translatedLanguage[]=en&limit=100&order[chapter]=asc`,
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).map((ch: any) => ({
        id: ch.id,
        chapter: ch.attributes.chapter || '0',
        title: ch.attributes.title || `Capítulo ${ch.attributes.chapter || ''}`,
        volume: ch.attributes.volume || '',
      }));
    } catch (err) {
      console.error('[MangaDex chapters]', err);
      return [];
    }
  },

  async getChapterPages(chapterId: string): Promise<string[]> {
    try {
      const res = await fetch(`https://api.mangadex.org/at-home/server/${chapterId}`);
      if (!res.ok) return [];
      const data = await res.json();
      const baseUrl = data.baseUrl;
      const hash = data.chapter.hash;
      const files = data.chapter.data;
      return files.map((file: string) => `${baseUrl}/data/${hash}/${file}`);
    } catch (err) {
      console.error('[MangaDex pages]', err);
      return [];
    }
  },
};
