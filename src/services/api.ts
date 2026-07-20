import { MediaItem } from '@/types';
import { useStore } from '@/store/useStore';
import { calculateHypeScore } from '@/utils/hype';
import { 
  adaptTMDBMovie, 
  adaptTMDBTV, 
  adaptJikanAnime, 
  adaptJikanManga, 
  adaptAnilistMedia,
  adaptRAWGGame,
  adaptGoogleBook,
  TMDBMovie,
  TMDBTV,
  JikanAnime,
  JikanManga,
  AnilistMedia,
  RAWGGame,
  GoogleBook
} from './adapters';

import { fetchBooksWithFallback, fetchBooksFallback } from './apiBookService';
import { getAdultMode } from './adultPolicy';
import { isVaultUnlocked } from './vault';

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
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        continue;
      }
      if (!response.ok && response.status >= 500) {
        // Server error, retry
        const delay = Math.pow(2, retries) * 1000;
        console.warn(`Server error ${response.status} for ${url}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        continue;
      }
      return response;
    } catch (error) {
      if (retries === maxRetries - 1) throw error;
      const delay = Math.pow(2, retries) * 1000;
      console.warn(`Network error for ${url}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }
  throw new Error(`Max retries reached for ${url}`);
};

// TMDB Configuration
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

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
  return value?.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function adaptTVMazeShow(show: TVMazeShow): MediaItem {
  const country = show.network?.country?.code || show.webChannel?.country?.code;
  const next = show._embedded?.nextepisode;
  return {
    id: `tvmaze-tv-${show.id}`,
    sourceId: show.id,
    source: 'tvmaze',
    providerIdentities: [{ provider: 'tvmaze', providerId: String(show.id), mediaType: 'tv', verifiedAt: Date.now() }],
    title: show.name,
    mediaType: 'tv',
    posterPath: show.image?.medium || show.image?.original,
    backdropPath: show.image?.original,
    overview: stripMarkup(show.summary),
    releaseDate: show.premiered,
    voteAverage: show.rating?.average || undefined,
    popularity: show.weight,
    genres: show.genres || [],
    status: show.status,
    runtime: show.averageRuntime || show.runtime,
    countries: country ? [country] : undefined,
    providerUrl: `https://www.tvmaze.com/shows/${show.id}`,
    nextEpisodeToAir: next?.airdate ? { airDate: next.airdate, seasonNumber: next.season || 0, episodeNumber: next.number || 0, name: next.name || 'Próximo episódio' } : undefined,
  };
}

async function discoverTVMaze(page = 1, query = '', doramaOnly = false): Promise<MediaItem[]> {
  try {
    const url = query
      ? `${TVMAZE_BASE_URL}/search/shows?q=${encodeURIComponent(query)}`
      : `${TVMAZE_BASE_URL}/shows?page=${Math.max(0, page - 1)}`;
    const response = await fetchWithRetry(url, { headers: { accept: 'application/json' } }, 2);
    if (!response.ok) return [];
    const payload = await response.json() as Array<TVMazeShow | { show: TVMazeShow }>;
    let shows = payload.map((record) => 'show' in record ? record.show : record);
    if (doramaOnly) {
      const eastAsianCountries = new Set(['KR', 'JP', 'CN', 'TW', 'TH']);
      const eastAsianLanguages = /korean|japanese|chinese|thai/i;
      shows = shows.filter((show) => eastAsianCountries.has(show.network?.country?.code || show.webChannel?.country?.code || '') || eastAsianLanguages.test(show.language || ''));
    }
    return deduplicateMediaItems(shows.slice(0, 24).map(adaptTVMazeShow));
  } catch (error) {
    console.warn('TVmaze fallback falhou:', error);
    return [];
  }
}

// Jikan Configuration (Anime/Manga)
const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

// Jikan Rate Limiter
const jikanQueue: { task: () => Promise<void>, reject: (reason?: any) => void }[] = [];
let isProcessingJikan = false;

const processJikanQueue = async () => {
  if (isProcessingJikan || jikanQueue.length === 0) return;
  isProcessingJikan = true;
  while (jikanQueue.length > 0) {
    const item = jikanQueue.shift();
    if (item) {
      await item.task();
      // Jikan limit is 3 requests per second, 60 per minute
      await new Promise(resolve => setTimeout(resolve, 350)); 
    }
  }
  isProcessingJikan = false;
};

const jikanCache = new Map<string, { data: any, timestamp: number }>();
const JIKAN_CACHE_TTL = 1000 * 60 * 60 * 12; // 12 hours local cache TTL for slower-changing media metadata

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
  } catch (e) {
    // Fail-safe in case of disabled localStorage or btoa failures
  }
  return null;
};

const setJikanCache = (url: string, data: any) => {
  try {
    const key = JIKAN_CACHE_PREFIX + btoa(url).replace(/=/g, '');
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    // If quota exceeded, clean up expired cache and try one more time
    cleanExpiredJikanCache();
    try {
      const key = JIKAN_CACHE_PREFIX + btoa(url).replace(/=/g, '');
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (err) {
      // Ignore if localStorage is fully loaded or blocked
    }
  }
};

const cleanExpiredJikanCache = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(JIKAN_CACHE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (Date.now() - parsed.timestamp >= JIKAN_CACHE_TTL) {
            keysToRemove.push(key);
          }
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    // Ignore
  }
};

const fetchJikan = (url: string, options?: RequestInit, retries = 1): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const cached = jikanCache.get(url);
    if (cached && Date.now() - cached.timestamp < JIKAN_CACHE_TTL) {
      resolve(new Response(JSON.stringify(cached.data), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return;
    }

    // Try persistent localStorage cache before hitting the queue or making web requests
    const localCachedData = getJikanCache(url);
    if (localCachedData) {
      jikanCache.set(url, { data: localCachedData, timestamp: Date.now() });
      resolve(new Response(JSON.stringify(localCachedData), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return;
    }

    if (jikanQueue.length > 20) {
      reject(new Error("Jikan queue is full, please try again later."));
      return;
    }
    
    jikanQueue.push({
      reject,
      task: async () => {
        try {
          let res = await fetch(url, options);
          if (res.status === 429 && retries > 0) {
            console.warn(`Jikan Rate Limit hit, retrying ${url}...`);
            await new Promise(r => setTimeout(r, 1500)); // Increased backoff
            res = await fetch(url, options);
          }
          
          if (res.ok) {
             const clonedRes = res.clone();
             const data = await clonedRes.json();
             jikanCache.set(url, { data, timestamp: Date.now() });
             setJikanCache(url, data);
          }
          resolve(res);
        } catch (err) {
          reject(err);
        }
      }
    });
    processJikanQueue();
  });
};

// Anilist Configuration
const ANILIST_URL = 'https://graphql.anilist.co';

const fetchAnilist = async (query: string, type: 'ANIME' | 'MANGA', sfw: boolean = true) => {
  const graphqlQuery = `
    query ($search: String, $type: MediaType, $isAdult: Boolean) {
      Page(page: 1, perPage: 5) {
        media(search: $search, type: $type, isAdult: $isAdult, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
          }
          bannerImage
          description
          format
          status
          startDate {
            year
            month
            day
          }
          averageScore
          genres
          isAdult
        }
      }
    }
  `;

  const variables = {
    search: query,
    type: type,
    isAdult: sfw ? false : undefined // If sfw is true, strictly filter out adult. If false, allow both.
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: graphqlQuery,
      variables: variables
    })
  };

  try {
    const response = await fetch(ANILIST_URL, options);
    const data = await response.json();
    const mediaList = data?.data?.Page?.media || [];
    
    if (mediaList.length > 0) {
      const exactMatch = mediaList.find((item: AnilistMedia) => 
        item.title?.english?.toLowerCase() === query.toLowerCase() ||
        item.title?.romaji?.toLowerCase() === query.toLowerCase() ||
        item.title?.native?.toLowerCase() === query.toLowerCase()
      );
      if (exactMatch) {
        // Move exact match to the front
        return [exactMatch, ...mediaList.filter((m: AnilistMedia) => m.id !== exactMatch.id)];
      }
    }
    return mediaList;
  } catch (error) {
    console.error("Anilist fetch error:", error);
    return [];
  }
};

// --- INTENT DETECTION ---
const detectIntent = (query: string) => {
  const q = query.toLowerCase();
  return {
    isAnime: /\banime\b|\banimes\b|\botaku\b|\bcrunchyroll\b|\bfunimation\b/i.test(q),
    isManga: /\bmanga\b|\bmangas\b|\bmanhwa\b|\bmanhua\b|\bwebtoon\b|\bwebtoons\b/i.test(q),
    isMovie: /\bfilme\b|\bfilmes\b|\bmovie\b|\bmovies\b|\bcinema\b|\bfilm\b|\bfilms\b/i.test(q),
    isTv: /\bserie\b|\bseries\b|\bsérie\b|\bséries\b|\btv\b|\btelevision\b|\btelevisão\b/i.test(q),
    isGame: /\bjogo\b|\bjogos\b|\bgame\b|\bgames\b|\bplaystation\b|\bxbox\b|\bnintendo\b|\bpc\b|\bsteam\b|\bepic\b/i.test(q),
    isBook: /\blivro\b|\blivros\b|\bbook\b|\bbooks\b|\bleitura\b|\bread\b|\breading\b/i.test(q),
    isComic: /\bhq\b|\bhqs\b|\bquadrinho\b|\bquadrinhos\b|\bcomic\b|\bcomics\b|\bdc\b|\bmarvel\b/i.test(q),
    isDorama: /\bdorama\b|\bdoramas\b|\bk-drama\b|\bj-drama\b|\bc-drama\b|\bthai-drama\b|\bdrama\b|\bdramas\b/i.test(q),
  };
};

const cleanQuery = (query: string) => {
  // Remove common filler words and intent indicators in PT and EN
  return query
    .replace(/\b(quero|ver|assistir|ler|jogar|recomenda|indica|um|uma|filme|serie|série|anime|manga|mangá|jogo|game|livro|hq|dorama|de|sobre|como|parecido|com|want|to|watch|read|play|recommend|show|me|a|an|movie|series|tv|book|comic|drama|about|like|similar|to)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// TMDB is accessed through an allowlisted Netlify/Express proxy so its
// credential never becomes part of the browser bundle.
const isTMDBAvailable = () => true;

// Provider flags such as TMDB `include_adult` and AniList `isAdult`
// are reserved for the explicit-content vault. Conventional 18+ works remain
// available through normal catalogue results and are classified locally.
const isAdultAllowed = () => {
  const profile = useStore.getState().user;
  return getAdultMode(profile) === 'vault' && Boolean(profile?.preferences.adultVaultEnabled) && isVaultUnlocked();
};

const discoverAnilist = async (
  page = 1,
  type: 'ANIME' | 'MANGA',
  sort = 'bypopularity',
  genreId = '',
  query = ''
): Promise<MediaItem[]> => {
  const graphqlQuery = `
    query ($page: Int, $perPage: Int, $type: MediaType, $sort: [MediaSort], $genre: String, $search: String, $isAdult: Boolean) {
      Page(page: $page, perPage: $perPage) {
        media(type: $type, sort: $sort, genre: $genre, search: $search, isAdult: $isAdult) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
          }
          bannerImage
          description
          format
          status
          startDate {
            year
            month
            day
          }
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
    '37': 'Supernatural'
  };

  const genreName = genreId ? genreIdToName[genreId] : undefined;
  
  let anilistSort = ['POPULARITY_DESC'];
  if (sort === 'score') {
    anilistSort = ['SCORE_DESC'];
  } else if (sort === 'trending') {
    anilistSort = ['TRENDING_DESC'];
  }

  const sfw = !isAdultAllowed();

  const variables: any = {
    page,
    perPage: 20,
    type,
    sort: anilistSort,
    isAdult: sfw ? false : undefined
  };

  if (genreName) {
    variables.genre = genreName;
  }

  if (query && query.trim()) {
    variables.search = query.trim();
  }

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: graphqlQuery,
      variables
    })
  };

  try {
    const response = await fetch(ANILIST_URL, options);
    if (!response.ok) throw new Error(`Anilist API returned status ${response.status}`);
    const data = await response.json();
    const mediaList = data?.data?.Page?.media || [];
    return mediaList.map((m: any) => adaptAnilistMedia(m, type.toLowerCase() as 'anime' | 'manga'));
  } catch (error) {
    console.error("Anilist discover fallback error:", error);
    return [];
  }
};

// --- HELPER: Interleave Arrays ---
const interleave = <T>(...arrays: T[][]): T[] => {
  const maxLength = Math.max(...arrays.map(a => a.length));
  const result: T[] = [];
  for (let i = 0; i < maxLength; i++) {
    for (const arr of arrays) {
      if (i < arr.length) result.push(arr[i]);
    }
  }
  return result;
};

export const deduplicateMediaItems = (items: MediaItem[]): MediaItem[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    // Generate a composite key. Some items have a single id, some have TMDB/Mal ID.
    // Try to use source specific identifier if available, or just mediaType + id.
    const key = `${item.mediaType}-${item.source || 'unknown'}-${item.id}`;
    if (seen.has(key)) return false;
    // Also check just id and mediatype as a fallback
    const key2 = `${item.mediaType}-${item.id}`;
    if (seen.has(key2)) return false;
    
    seen.add(key);
    seen.add(key2);
    return true;
  });
};

// --- API CALLS ---

export const api = {
  // ... (existing methods)

  discoverMovies: async (page = 1, sort = 'popularity.desc', genre = '', query = ''): Promise<MediaItem[]> => {
    try {
      const tmdbKey = isTMDBAvailable();
      const adult = isAdultAllowed();
      if (tmdbKey) {
        let url = tmdbUrl('/discover/movie', { sort_by: sort, page, language: 'pt-BR', include_adult: adult, with_genres: genre });
        if (query) url = tmdbUrl('/search/movie', { query, page, language: 'pt-BR', include_adult: adult });
        
        const res = await fetch(url);
        const data = await res.json();
        if (data.results) return deduplicateMediaItems(data.results.map(adaptTMDBMovie));
      }
      return [];
    } catch (e) {
      return [];
    }
  },

  discoverTV: async (page = 1, sort = 'popularity.desc', genre = '', query = ''): Promise<MediaItem[]> => {
    try {
      const tmdbKey = isTMDBAvailable();
      const adult = isAdultAllowed();
      if (tmdbKey) {
        let url = tmdbUrl('/discover/tv', { sort_by: sort, page, language: 'pt-BR', include_adult: adult, with_genres: genre });
        if (query) url = tmdbUrl('/search/tv', { query, page, language: 'pt-BR', include_adult: adult });

        const res = await fetch(url);
        const data = await res.json();
        if (data.results?.length) return deduplicateMediaItems(data.results.map(adaptTMDBTV));
      }
      return discoverTVMaze(page, query);
    } catch (e) {
      return [];
    }
  },

  discoverAnime: async (page = 1, sort = 'bypopularity', genre = '', query = ''): Promise<MediaItem[]> => {
    try {
      const sfw = !isAdultAllowed();
      let url = `${JIKAN_BASE_URL}/anime?page=${page}&order_by=${sort === 'bypopularity' ? 'members' : 'score'}&sort=desc&sfw=${sfw}`;
      if (genre) url += `&genres=${genre}`;
      if (query) url += `&q=${encodeURIComponent(query)}`;

      const res = await fetchJikan(url);
      if (!res.ok) {
        console.warn("Jikan failed, falling back to AniList for discoverAnime.");
        return discoverAnilist(page, 'ANIME', sort, genre, query);
      }
      const data = await res.json();
      if (data.data && data.data.length > 0) return deduplicateMediaItems(data.data.map(adaptJikanAnime));
      return discoverAnilist(page, 'ANIME', sort, genre, query);
    } catch (e) {
      console.warn("Jikan discoverAnime error, falling back to AniList:", e);
      return discoverAnilist(page, 'ANIME', sort, genre, query);
    }
  },

  discoverManga: async (page = 1, sort = 'bypopularity', genre = '', query = ''): Promise<MediaItem[]> => {
    try {
      const sfw = !isAdultAllowed();
      let url = `${JIKAN_BASE_URL}/manga?page=${page}&order_by=${sort === 'bypopularity' ? 'members' : 'score'}&sort=desc&sfw=${sfw}`;
      if (genre) url += `&genres=${genre}`;
      if (query) url += `&q=${encodeURIComponent(query)}`;

      const res = await fetchJikan(url);
      if (!res.ok) {
        console.warn("Jikan failed, falling back to AniList for discoverManga.");
        return discoverAnilist(page, 'MANGA', sort, genre, query);
      }
      const data = await res.json();
      if (data.data && data.data.length > 0) return deduplicateMediaItems(data.data.map(adaptJikanManga));
      return discoverAnilist(page, 'MANGA', sort, genre, query);
    } catch (e) {
      console.warn("Jikan discoverManga error, falling back to AniList:", e);
      return discoverAnilist(page, 'MANGA', sort, genre, query);
    }
  },


  discoverDoramas: async (page = 1, sort = 'popularity.desc', genre = '', query = ''): Promise<MediaItem[]> => {
    try {
      const tmdbKey = isTMDBAvailable();
      const adult = isAdultAllowed();
      if (tmdbKey) {
        // Exclude genre 16 (Animation) to avoid animes showing up in Doramas
        let url = tmdbUrl('/discover/tv', { sort_by: sort, page, language: 'pt-BR', with_original_language: 'ko|ja|zh|th', without_genres: 16, include_adult: adult, with_genres: genre });
        
        if (query) {
          url = tmdbUrl('/search/tv', { query, page, language: 'pt-BR', include_adult: adult });
        }

        const res = await fetch(url);
        const data = await res.json();
        
        if (data.results) {
          let results = data.results;
          if (query) {
            const langRegex = /^(ko|ja|zh|th)$/;
            results = results.filter((r: TMDBTV) => langRegex.test(r.original_language || '') && !r.genre_ids?.includes(16));
          }
          return deduplicateMediaItems(results.map(adaptTMDBTV));
        }
      }
      return discoverTVMaze(page, query, true);
    } catch (e) {
      return discoverTVMaze(page, query, true);
    }
  },

  discoverComics: async (page = 1, sort = 'relevance', genre = '', query = ''): Promise<MediaItem[]> => {
    try {
      const startIndex = (page - 1) * 20;
      let searchQuery = query ? query : 'subject:comics';
      if (genre) searchQuery += ` subject:${genre}`;

      const orderBy = sort === 'newest' ? 'newest' : 'relevance';
      
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&startIndex=${startIndex}&maxResults=20&orderBy=${orderBy}&langRestrict=pt&printType=books`;
      
      return await fetchBooksWithFallback(url, 'comic', searchQuery);
    } catch (e) {
      return [];
    }
  },

  discoverBooks: async (page = 1, sort = 'relevance', genre = '', query = ''): Promise<MediaItem[]> => {
    try {
      const startIndex = (page - 1) * 20;
      let searchQuery = query ? query : 'subject:fiction';
      if (genre) searchQuery += ` subject:${genre}`;

      const orderBy = sort === 'newest' ? 'newest' : 'relevance';
      
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&startIndex=${startIndex}&maxResults=20&orderBy=${orderBy}&langRestrict=pt&printType=books`;
      
      return await fetchBooksWithFallback(url, 'book', searchQuery);
    } catch (e) {
      return [];
    }
  },

  discoverGames: async (page = 1, sort = '-rating', genre = '', query = ''): Promise<MediaItem[]> => {
    try {
      const url = query ? `/api/games/search?q=${encodeURIComponent(query)}` : `/api/games/trending`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        return deduplicateMediaItems(data);
      }
      return [];
    } catch (e) {
      console.error("Game API Error", e);
      return [];
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
    } catch (e) {
      console.warn("CheapShark fetch error:", e);
      return [];
    }
  },

  getTrendingAnime: async (): Promise<MediaItem[]> => {
    try {
      const sfw = !isAdultAllowed();
      const res = await fetchJikan(`${JIKAN_BASE_URL}/top/anime?filter=airing&limit=10&sfw=${sfw}`);
      if (!res.ok) {
        console.warn("Jikan top anime failed, falling back to AniList trending.");
        return discoverAnilist(1, 'ANIME', 'trending');
      }
      const data = await res.json();
      if (data.data && data.data.length > 0) return deduplicateMediaItems(data.data.map(adaptJikanAnime));
      return discoverAnilist(1, 'ANIME', 'trending');
    } catch (e) {
      console.warn("Jikan getTrendingAnime error, falling back to AniList:", e);
      return discoverAnilist(1, 'ANIME', 'trending');
    }
  },

  getTrendingManga: async (): Promise<MediaItem[]> => {
    try {
      const sfw = !isAdultAllowed();
      const res = await fetchJikan(`${JIKAN_BASE_URL}/top/manga?limit=10&sfw=${sfw}`);
      if (!res.ok) {
        console.warn("Jikan top manga failed, falling back to AniList trending.");
        return discoverAnilist(1, 'MANGA', 'trending');
      }
      const data = await res.json();
      if (data.data && data.data.length > 0) return deduplicateMediaItems(data.data.map(adaptJikanManga));
      return discoverAnilist(1, 'MANGA', 'trending');
    } catch (e) {
      console.warn("Jikan getTrendingManga error, falling back to AniList:", e);
      return discoverAnilist(1, 'MANGA', 'trending');
    }
  },

  getTrending: async (): Promise<MediaItem[]> => {
    try {
      const tmdbKey = isTMDBAvailable();
      const sfw = !isAdultAllowed();
      
      const promises: Promise<any>[] = [];
      
      if (tmdbKey) {
        promises.push(fetch(tmdbUrl('/trending/movie/week', { language: 'pt-BR' })).then(r => r.json()));
        promises.push(fetch(tmdbUrl('/trending/tv/week', { language: 'pt-BR' })).then(r => r.json()));
      }
      
      // Always fetch anime and manga
      promises.push(fetchJikan(`${JIKAN_BASE_URL}/top/anime?filter=airing&limit=15&sfw=${sfw}`).then(r => r.json()));
      promises.push(fetchJikan(`${JIKAN_BASE_URL}/top/manga?filter=publishing&limit=15&sfw=${sfw}`).then(r => r.json()));

      // Fetch games from proxy API
      promises.push(fetch(`/api/games/trending`).then(r => r.json()).catch(() => []));

      // Books (Google Books) - Fetch some trending subjects
      promises.push(fetchBooksWithFallback(`https://www.googleapis.com/books/v1/volumes?q=subject:fiction&orderBy=newest&maxResults=10&langRestrict=pt&printType=books`, 'book', 'ficção').catch(() => []));
      promises.push(fetchBooksWithFallback(`https://www.googleapis.com/books/v1/volumes?q=subject:comics&orderBy=newest&maxResults=10&langRestrict=pt&printType=books`, 'comic', 'quadrinhos').catch(() => []));

      const results = await Promise.allSettled(promises) as any[];
      
      const movies: MediaItem[] = [];
      const tv: MediaItem[] = [];
      const anime: MediaItem[] = [];
      const manga: MediaItem[] = [];
      const games: MediaItem[] = [];
      const books: MediaItem[] = [];
      const comics: MediaItem[] = [];

      let index = 0;
      // Process TMDB results
      if (tmdbKey) {
        const moviesRes = results[index++];
        const tvRes = results[index++];
        
        if (moviesRes.status === 'fulfilled' && moviesRes.value.results) {
          movies.push(...moviesRes.value.results.map((item: any, i: number) => calculateHypeScore(adaptTMDBMovie(item), i)));
        }
        if (tvRes.status === 'fulfilled' && tvRes.value.results) {
          tv.push(...tvRes.value.results.map((item: any, i: number) => calculateHypeScore(adaptTMDBTV(item), i)));
        }
      }

      // Process Jikan results
      const animeRes = results[index++];
      if (animeRes.status === 'fulfilled' && animeRes.value?.data) {
        anime.push(...animeRes.value.data.map((item: any, i: number) => calculateHypeScore(adaptJikanAnime(item), i)));
      } else {
        console.warn("getTrending: Anime fetch from Jikan failed, using AniList fallback");
        const al = await discoverAnilist(1, 'ANIME', 'trending');
        anime.push(...al.map((item, i) => calculateHypeScore(item, i)));
      }
      const mangaRes = results[index++];
      if (mangaRes.status === 'fulfilled' && mangaRes.value?.data) {
        manga.push(...mangaRes.value.data.map((item: any, i: number) => calculateHypeScore(adaptJikanManga(item), i)));
      } else {
        console.warn("getTrending: Manga fetch from Jikan failed, using AniList fallback");
        const al = await discoverAnilist(1, 'MANGA', 'trending');
        manga.push(...al.map((item, i) => calculateHypeScore(item, i)));
      }

      const gamesRes = results[index++];
      if (gamesRes.status === 'fulfilled' && Array.isArray(gamesRes.value)) {
         games.push(...gamesRes.value.map((item: any, i: number) => calculateHypeScore(item, i)));
      }

      const booksRes = results[index++];
      if (booksRes.status === 'fulfilled' && Array.isArray(booksRes.value)) {
         books.push(...booksRes.value.map((item: any, i: number) => calculateHypeScore(item, i)));
      }

      const comicsRes = results[index++];
      if (comicsRes.status === 'fulfilled' && Array.isArray(comicsRes.value)) {
         comics.push(...comicsRes.value.map((item: any, i: number) => calculateHypeScore(item, i)));
      }

      if (movies.length === 0 && tv.length === 0 && anime.length === 0 && games.length === 0 && manga.length === 0 && books.length === 0 && comics.length === 0) return [];
      
      // Interleave to ensure balance
      return deduplicateMediaItems(interleave(movies, anime, games, tv, manga, books, comics)).sort((a,b) => (b.hypeScore || 0) - (a.hypeScore || 0));

    } catch (e) {
      console.warn("API Error", e);
      return [];
    }
  },

  getUpcoming: async (): Promise<MediaItem[]> => {
    try {
      const tmdbKey = isTMDBAvailable();
      const sfw = !isAdultAllowed();
      const promises: Promise<any>[] = [];

      if (tmdbKey) {
        promises.push(fetch(tmdbUrl('/movie/upcoming', { region: 'BR', language: 'pt-BR' })).then(r => r.json()));
        promises.push(fetch(tmdbUrl('/tv/on_the_air', { language: 'pt-BR' })).then(r => r.json()));
      }
      
      promises.push(fetchJikan(`${JIKAN_BASE_URL}/seasons/upcoming?limit=15&sfw=${sfw}`).then(r => r.json()));
      promises.push(fetchJikan(`${JIKAN_BASE_URL}/manga?status=upcoming&limit=15&sfw=${sfw}`).then(r => r.json()));

      promises.push(fetch(`/api/games/upcoming`).then(r => r.json()).catch(() => []));

      promises.push(fetchBooksWithFallback(`https://www.googleapis.com/books/v1/volumes?q=subject:fiction&orderBy=newest&maxResults=15&langRestrict=pt&printType=books`, 'book', 'ficção').catch(() => []));
      promises.push(fetchBooksWithFallback(`https://www.googleapis.com/books/v1/volumes?q=subject:comics&orderBy=newest&maxResults=15&langRestrict=pt&printType=books`, 'comic', 'quadrinhos').catch(() => []));

      const results = await Promise.allSettled(promises) as any[];
      const movies: MediaItem[] = [];
      const tv: MediaItem[] = [];
      const anime: MediaItem[] = [];
      const manga: MediaItem[] = [];
      const games: MediaItem[] = [];
      const books: MediaItem[] = [];
      const comics: MediaItem[] = [];

      let index = 0;
      if (tmdbKey) {
        const moviesRes = results[index++];
        const tvRes = results[index++];
        
        if (moviesRes.status === 'fulfilled' && moviesRes.value.results) {
          movies.push(...moviesRes.value.results.map(adaptTMDBMovie));
        }
        if (tvRes.status === 'fulfilled' && tvRes.value.results) {
          tv.push(...tvRes.value.results.map(adaptTMDBTV));
        }
      }

      const animeRes = results[index++];
      if (animeRes.status === 'fulfilled' && animeRes.value?.data) {
        anime.push(...animeRes.value.data.map(adaptJikanAnime));
      } else {
        console.warn("getUpcoming: Anime fetch from Jikan failed, using AniList fallback");
        const al = await discoverAnilist(1, 'ANIME', 'trending');
        anime.push(...al);
      }
      
      const mangaRes = results[index++];
      if (mangaRes.status === 'fulfilled' && mangaRes.value?.data) {
        manga.push(...mangaRes.value.data.map(adaptJikanManga));
      } else {
        console.warn("getUpcoming: Manga fetch from Jikan failed, using AniList fallback");
        const al = await discoverAnilist(1, 'MANGA', 'trending');
        manga.push(...al);
      }

      const gamesRes = results[index++];
      if (gamesRes.status === 'fulfilled' && Array.isArray(gamesRes.value)) {
         games.push(...gamesRes.value);
      }

      const booksRes = results[index++];
      if (booksRes.status === 'fulfilled' && Array.isArray(booksRes.value)) {
        books.push(...booksRes.value);
      }

      const comicsRes = results[index++];
      if (comicsRes.status === 'fulfilled' && Array.isArray(comicsRes.value)) {
        comics.push(...comicsRes.value);
      }

      if (movies.length === 0 && tv.length === 0 && anime.length === 0 && games.length === 0 && manga.length === 0 && books.length === 0 && comics.length === 0) return [];

      // Filter future dates
      const now = new Date();
      // Only strict future for movies, anime, and games. Books/TV are more loose here.
      const filterFuture = (items: MediaItem[]) => items.filter(i => i.releaseDate && new Date(i.releaseDate) >= new Date(now.setHours(0,0,0,0)));

      const futureMovies = filterFuture(movies);
      const futureTV = tv; // TV "on the air" works
      const futureAnime = filterFuture(anime);
      const futureManga = manga; // Upcoming manga often lacks exact Date in Jikan
      const futureGames = filterFuture(games);
      const futureBooks = books; // Latest books already out but basically "new releases"
      const futureComics = comics;

      // Interleave for "All" view
      return deduplicateMediaItems(interleave(futureMovies, futureAnime, futureGames, futureTV, futureManga, futureBooks, futureComics));

    } catch (e) {
      console.warn("Upcoming API Error", e);
      return [];
    }
  },

  searchMulti: async (query: string, page: number = 1): Promise<MediaItem[]> => {
    if (!query) return [];
    const tmdbKey = isTMDBAvailable();
    const sfw = !isAdultAllowed();
    const intent = detectIntent(query);
    const cleaned = cleanQuery(query);
    const searchTerms = cleaned || query;

    try {
      const promises: Promise<MediaItem[]>[] = [];

      // 1. Targeted Search based on Intent
      if (intent.isAnime) {
        promises.push(api.discoverAnime(page, 'bypopularity', '', searchTerms));
        promises.push(fetchAnilist(searchTerms, 'ANIME', sfw).then(res => res.map((i: any) => adaptAnilistMedia(i, 'anime'))));
      } else if (intent.isManga || intent.isComic) {
        promises.push(api.discoverManga(page, 'bypopularity', '', searchTerms));
        promises.push(fetchAnilist(searchTerms, 'MANGA', sfw).then(res => res.map((i: any) => adaptAnilistMedia(i, 'manga'))));
        promises.push(api.discoverComics(page, searchTerms));
      } else if (intent.isMovie) {
        promises.push(api.discoverMovies(page, 'popularity.desc', '', searchTerms));
      } else if (intent.isTv || intent.isDorama) {
        promises.push(api.discoverTV(page, 'popularity.desc', '', searchTerms));
      } else if (intent.isGame) {
        promises.push(api.discoverGames(page, searchTerms));
      } else if (intent.isBook) {
        promises.push(api.discoverBooks(page, searchTerms));
      } else {
        // 2. General Search (No specific intent)
        if (tmdbKey) promises.push(api.discoverMovies(page, 'popularity.desc', '', searchTerms));
        promises.push(api.discoverTV(page, 'popularity.desc', '', searchTerms));
        promises.push(api.discoverAnime(page, 'bypopularity', '', searchTerms));
        promises.push(api.discoverManga(page, 'bypopularity', '', searchTerms));
        promises.push(api.discoverGames(page, searchTerms));
        promises.push(api.discoverBooks(page, searchTerms));
      }

      const results = await Promise.all(promises);
      let flatResults = results.flat();

      // 4. Scoring and Ranking
      const scoredResults = flatResults.map(item => {
        let score = item.voteAverage || 0;
        const titleLower = item.title.toLowerCase();
        const queryLower = searchTerms.toLowerCase();

        // Intent match bonus
        const isAnimeMatch = intent.isAnime && (item.mediaType === 'anime');
        const isMangaMatch = (intent.isManga || intent.isComic) && (item.mediaType === 'manga' || item.mediaType === 'comic');
        const isMovieMatch = intent.isMovie && (item.mediaType === 'movie');
        const isTvMatch = (intent.isTv || intent.isDorama) && (item.mediaType === 'tv');
        const isGameMatch = intent.isGame && (item.mediaType === 'game');
        const isBookMatch = intent.isBook && (item.mediaType === 'book');

        if (isAnimeMatch || isMangaMatch || isMovieMatch || isTvMatch || isGameMatch || isBookMatch) {
          score += 15; // Strong boost for matching intent
        }

        // Exact match bonus
        if (titleLower === queryLower) score += 10;
        else if (titleLower.includes(queryLower)) score += 5;

        // Popularity weight
        if (item.popularity) score += Math.log10(item.popularity + 1);

        // Recency weight
        if (item.releaseDate) {
          const year = new Date(item.releaseDate).getFullYear();
          const currentYear = new Date().getFullYear();
          if (year === currentYear) score += 2;
          else if (year > currentYear - 5) score += 1;
        }

        return { item, score };
      });

      // 5. Deduplicate and Sort
      const uniqueItems = new Map<string, MediaItem>();
      scoredResults
        .sort((a, b) => b.score - a.score)
        .forEach(({ item }) => {
          const key = `${item.title.toLowerCase()}-${item.mediaType}-${item.releaseDate?.substring(0, 4)}`;
          if (!uniqueItems.has(key)) {
            uniqueItems.set(key, item);
          }
        });

      return Array.from(uniqueItems.values()).slice(0, 20);
    } catch (e) {
      console.error("searchMulti Error", e);
      return [];
    }
  },

  searchByTitle: async (title: string, type: string, year?: number, forceAdult = false): Promise<MediaItem | null> => {
    const tmdbKey = isTMDBAvailable();
    const sfw = forceAdult ? false : !isAdultAllowed();
    const isAnime = type === 'anime' || type === 'special' || type === 'ova';
    const isManga = type === 'manga';
    const isMovie = type === 'movie';
    const isTv = type === 'tv';
    const isGame = type === 'game';
    const isBook = type === 'book' || type === 'comic';

    const fetchTMDB = async (t: 'movie' | 'tv') => {
      if (!tmdbKey) return null;
      let url = tmdbUrl(`/search/${t}`, { query: title, language: 'pt-BR', include_adult: forceAdult || !sfw });
      let finalUrl = url;
      if (year) {
        if (t === 'movie') finalUrl = `${url}&year=${year}`;
        else finalUrl = `${url}&first_air_date_year=${year}`;
      }
      
      try {
        let res = await fetch(finalUrl);
        let data = await res.json();
        if (data.results?.[0]) {
          return t === 'movie' ? adaptTMDBMovie(data.results[0]) : adaptTMDBTV(data.results[0]);
        }
        
        // Fallback 1: Se falhou com o ano, tenta sem o ano
        if (year) {
          console.warn(`Busca TMDB falhou para ${title} com o ano ${year}. Tentando sem o ano...`);
          res = await fetch(url);
          data = await res.json();
          if (data.results?.[0]) {
            return t === 'movie' ? adaptTMDBMovie(data.results[0]) : adaptTMDBTV(data.results[0]);
          }
        }
        
        // Fallback 2: Tenta limpar o título (substitui hífens por espaço, remove dois pontos, etc.)
        const cleanedTitle = title.replace(/\s*-\s*/g, ' ').replace(/[:]/g, '').trim();
        if (cleanedTitle !== title) {
          console.warn(`Busca TMDB falhou. Tentando com título limpo: ${cleanedTitle}...`);
          let cleanedUrl = tmdbUrl(`/search/${t}`, { query: cleanedTitle, language: 'pt-BR', include_adult: forceAdult || !sfw });
          let finalCleanedUrl = cleanedUrl;
          if (year) {
            if (t === 'movie') finalCleanedUrl = `${cleanedUrl}&year=${year}`;
            else finalCleanedUrl = `${cleanedUrl}&first_air_date_year=${year}`;
          }
          res = await fetch(finalCleanedUrl);
          data = await res.json();
          if (data.results?.[0]) {
            return t === 'movie' ? adaptTMDBMovie(data.results[0]) : adaptTMDBTV(data.results[0]);
          }
          
          // Tenta título limpo sem o ano
          if (year) {
            res = await fetch(cleanedUrl);
            data = await res.json();
            if (data.results?.[0]) {
              return t === 'movie' ? adaptTMDBMovie(data.results[0]) : adaptTMDBTV(data.results[0]);
            }
          }
        }
      } catch (err) {
        console.error("TMDB fetch error:", err);
      }
      return null;
    };

    const fetchJikanLocal = async (t: 'anime' | 'manga') => {
      const res = await fetchJikan(`${JIKAN_BASE_URL}/${t}?q=${encodeURIComponent(title)}&limit=5&sfw=${sfw}`);
      const data = await res.json();
      if (!data.data || data.data.length === 0) return null;
      
      const exact = data.data.find((i: JikanAnime | JikanManga) => i.title.toLowerCase() === title.toLowerCase());
      return { item: exact ? (t === 'anime' ? adaptJikanAnime(exact as JikanAnime) : adaptJikanManga(exact as JikanManga)) : (t === 'anime' ? adaptJikanAnime(data.data[0]) : adaptJikanManga(data.data[0])), isExact: !!exact };
    };

    try {
      let result: MediaItem | null = null;

      if (isAnime) {
        const jikanRes = await fetchJikanLocal('anime');
        if (jikanRes?.isExact) {
          result = jikanRes.item;
        } else {
          const anilistRes = await fetchAnilist(title, 'ANIME', sfw);
          if (anilistRes && anilistRes.length > 0) {
            const anilistExact = anilistRes.find((item: AnilistMedia) => 
              item.title?.english?.toLowerCase() === title.toLowerCase() ||
              item.title?.romaji?.toLowerCase() === title.toLowerCase() ||
              item.title?.native?.toLowerCase() === title.toLowerCase()
            );
            
            if (anilistExact) {
              result = adaptAnilistMedia(anilistExact, 'anime');
            } else if (jikanRes) {
              result = jikanRes.item;
            } else {
              result = adaptAnilistMedia(anilistRes[0], 'anime');
            }
          } else if (jikanRes) {
            result = jikanRes.item;
          }
        }
      }
      else if (isManga) {
        const jikanRes = await fetchJikanLocal('manga');
        if (jikanRes?.isExact) {
          result = jikanRes.item;
        } else {
          const anilistRes = await fetchAnilist(title, 'MANGA', sfw);
          if (anilistRes && anilistRes.length > 0) {
            const anilistExact = anilistRes.find((item: AnilistMedia) => 
              item.title?.english?.toLowerCase() === title.toLowerCase() ||
              item.title?.romaji?.toLowerCase() === title.toLowerCase() ||
              item.title?.native?.toLowerCase() === title.toLowerCase()
            );
            
            if (anilistExact) {
              result = adaptAnilistMedia(anilistExact, 'manga');
            } else if (jikanRes) {
              result = jikanRes.item;
            } else {
              result = adaptAnilistMedia(anilistRes[0], 'manga');
            }
          } else if (jikanRes) {
            result = jikanRes.item;
          }
        }
        
        if (!result) {
          try {
            const gbooksQuery = `${title} subject:comics OR subject:graphic novel`;
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(gbooksQuery)}&maxResults=1`);
            const data = await res.json();
            if (data.items && data.items.length > 0) {
              const item = data.items[0];
              result = {
                id: `gbooks-${item.id}`,
                title: item.volumeInfo.title,
                originalTitle: item.volumeInfo.title,
                posterPath: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || undefined,
                backdropPath: undefined,
                overview: item.volumeInfo.description,
                mediaType: 'manga',
                releaseDate: item.volumeInfo.publishedDate,
                voteAverage: item.volumeInfo.averageRating ? item.volumeInfo.averageRating * 2 : 0,
                genres: item.volumeInfo.categories,
                status: 'Published'
              };
            }
          } catch (e) {
            console.error("Google Books fallback failed", e);
          }
        }
      }
      else if (isMovie) result = await fetchTMDB('movie');
      else if (isTv) result = await fetchTMDB('tv');
      else if (isGame) {
        const games = await api.discoverGames(1, title);
        result = games[0] || null;
      }
      else if (isBook) {
        try {
          const gbooksQuery = title;
          const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(gbooksQuery)}&maxResults=1`);
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            result = {
              id: `gbooks-${item.id}`,
              title: item.volumeInfo.title,
              originalTitle: item.volumeInfo.title,
              posterPath: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || undefined,
              backdropPath: undefined,
              overview: item.volumeInfo.description,
              mediaType: 'book',
              releaseDate: item.volumeInfo.publishedDate,
              voteAverage: item.volumeInfo.averageRating ? item.volumeInfo.averageRating * 2 : 0,
              genres: item.volumeInfo.categories,
              status: 'Published'
            };
          }
        } catch (e) {
          console.error("Google Books failed in searchByTitle", e);
        }
        
        if (!result) {
          try {
            console.log(`Trying OpenLibrary fallback for book: ${title}...`);
            const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`);
            const data = await res.json();
            if (data.docs && data.docs.length > 0) {
              const doc = data.docs[0];
              const coverId = doc.cover_i;
              result = {
                id: `openlib-${doc.key.replace('/works/', '')}`,
                title: doc.title,
                originalTitle: doc.title,
                posterPath: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined,
                backdropPath: undefined,
                overview: doc.first_sentence ? doc.first_sentence[0] : "Sem descrição disponível.",
                mediaType: 'book',
                releaseDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
                voteAverage: doc.ratings_average ? doc.ratings_average * 2 : 0,
                genres: doc.subject?.slice(0, 3) || [],
                status: 'Published'
              };
            }
          } catch (e) {
            console.error("OpenLibrary fallback failed in searchByTitle", e);
          }
        }
      }

      return result;
    } catch (e) {
      console.error("searchByTitle Error", e);
      return null;
    }
  },

  getWatchProviders: async (id: string): Promise<unknown> => {
    const tmdbKey = isTMDBAvailable();
    if (!tmdbKey) return null;
    
    const tmdbId = id.replace('tmdb-movie-', '').replace('tmdb-tv-', '');
    const type = id.startsWith('tmdb-movie-') ? 'movie' : 'tv';
    
    try {
      const res = await fetch(tmdbUrl(`/${type}/${tmdbId}/watch/providers`));
      const data = await res.json();
      return data.results?.BR || null;
    } catch (e) {
      return null;
    }
  },

  getDetails: async (id: string): Promise<MediaItem | null> => {
    // Parse ID to determine source
    if (id.startsWith('tmdb-movie-')) {
      const tmdbId = id.replace('tmdb-movie-', '');
      const tmdbKey = isTMDBAvailable();
      if (!tmdbKey) return null;
      
      const [detailsRes, creditsRes, similarRes, videosRes, providersRes, externalIdsRes] = await Promise.all([
        fetch(tmdbUrl(`/movie/${tmdbId}`, { language: 'pt-BR' })),
        fetch(tmdbUrl(`/movie/${tmdbId}/credits`, { language: 'pt-BR' })),
        fetch(tmdbUrl(`/movie/${tmdbId}/similar`, { language: 'pt-BR' })),
        fetch(tmdbUrl(`/movie/${tmdbId}/videos`, { language: 'pt-BR' })),
        fetch(tmdbUrl(`/movie/${tmdbId}/watch/providers`)),
        fetch(tmdbUrl(`/movie/${tmdbId}/external_ids`))
      ]);

      const data = await detailsRes.json();
      const credits = await creditsRes.json();
      const similar = await similarRes.json();
      const videos = await videosRes.json();
      const providers = await providersRes.json();
      const externalIds = await externalIdsRes.json();

      const item = adaptTMDBMovie(data);
      item.externalIds = { tmdb: tmdbId, imdb: externalIds.imdb_id || undefined };
      if (externalIds.imdb_id) item.providerIdentities = [...(item.providerIdentities || []), { provider: 'imdb', providerId: externalIds.imdb_id, mediaType: 'movie', verifiedAt: Date.now() }];
      
      if (providers.results && providers.results.BR) {
        const brProviders = providers.results.BR;
        const allProviders = [
          ...(brProviders.flatrate || []),
          ...(brProviders.rent || []),
          ...(brProviders.buy || [])
        ];
        
        // Deduplicate by provider_id
        const uniqueProviders = Array.from(new Map(allProviders.map(p => [p.provider_id, p])).values());
        
        item.watchProviders = uniqueProviders.map((p: { provider_id: number; provider_name: string; logo_path: string }) => ({
          providerId: p.provider_id,
          providerName: p.provider_name,
          logoPath: `${TMDB_IMAGE_BASE}${p.logo_path}`,
          url: brProviders.link
        }));
      }
      
      if (credits.cast) {
        item.cast = credits.cast.slice(0, 10).map((c: { name: string; character: string; profile_path: string | null }) => ({
          name: c.name,
          character: c.character,
          profilePath: c.profile_path ? `${TMDB_IMAGE_BASE}${c.profile_path}` : undefined
        }));
      }

      if (similar.results) {
        item.similar = similar.results.slice(0, 5).map(adaptTMDBMovie);
      }

      if (videos.results && videos.results.length > 0) {
        const trailer = videos.results.find((v: { type: string; site: string; key: string }) => v.type === 'Trailer' && v.site === 'YouTube') || videos.results[0];
        if (trailer && trailer.site === 'YouTube') {
          item.trailerUrl = `https://www.youtube.com/embed/${trailer.key}`;
        }
      }

      return item;
    }
    
    if (id.startsWith('tmdb-tv-')) {
      const tmdbId = id.replace('tmdb-tv-', '');
      const tmdbKey = isTMDBAvailable();
      if (!tmdbKey) return null;
      
      const [detailsRes, creditsRes, similarRes, videosRes, providersRes, externalIdsRes] = await Promise.all([
        fetch(tmdbUrl(`/tv/${tmdbId}`, { language: 'pt-BR' })),
        fetch(tmdbUrl(`/tv/${tmdbId}/credits`, { language: 'pt-BR' })),
        fetch(tmdbUrl(`/tv/${tmdbId}/similar`, { language: 'pt-BR' })),
        fetch(tmdbUrl(`/tv/${tmdbId}/videos`, { language: 'pt-BR' })),
        fetch(tmdbUrl(`/tv/${tmdbId}/watch/providers`)),
        fetch(tmdbUrl(`/tv/${tmdbId}/external_ids`))
      ]);

      const data = await detailsRes.json();
      const credits = await creditsRes.json();
      const similar = await similarRes.json();
      const videos = await videosRes.json();
      const providers = await providersRes.json();
      const externalIds = await externalIdsRes.json();

      const item = adaptTMDBTV(data);
      item.externalIds = { tmdb: tmdbId, imdb: externalIds.imdb_id || undefined, tvdb: externalIds.tvdb_id ? String(externalIds.tvdb_id) : undefined };
      item.providerIdentities = [
        ...(item.providerIdentities || []),
        ...(externalIds.imdb_id ? [{ provider: 'imdb', providerId: externalIds.imdb_id, mediaType: 'tv' as const, verifiedAt: Date.now() }] : []),
        ...(externalIds.tvdb_id ? [{ provider: 'tvdb', providerId: String(externalIds.tvdb_id), mediaType: 'tv' as const, verifiedAt: Date.now() }] : []),
      ];
      item.seasonsCount = data.number_of_seasons;
      item.episodesCount = data.number_of_episodes;

      if (providers.results && providers.results.BR) {
        const brProviders = providers.results.BR;
        const allProviders = [
          ...(brProviders.flatrate || []),
          ...(brProviders.rent || []),
          ...(brProviders.buy || [])
        ];
        
        // Deduplicate by provider_id
        const uniqueProviders = Array.from(new Map(allProviders.map(p => [p.provider_id, p])).values());
        
        item.watchProviders = uniqueProviders.map((p: { provider_id: number; provider_name: string; logo_path: string }) => ({
          providerId: p.provider_id,
          providerName: p.provider_name,
          logoPath: `${TMDB_IMAGE_BASE}${p.logo_path}`,
          url: brProviders.link
        }));
      }

      if (credits.cast) {
        item.cast = credits.cast.slice(0, 10).map((c: { name: string; character: string; profile_path: string | null }) => ({
          name: c.name,
          character: c.character,
          profilePath: c.profile_path ? `${TMDB_IMAGE_BASE}${c.profile_path}` : undefined
        }));
      }

      if (similar.results) {
        item.similar = similar.results.slice(0, 5).map(adaptTMDBTV);
      }

      if (videos.results && videos.results.length > 0) {
        const trailer = videos.results.find((v: { type: string; site: string; key: string }) => v.type === 'Trailer' && v.site === 'YouTube') || videos.results[0];
        if (trailer && trailer.site === 'YouTube') {
          item.trailerUrl = `https://www.youtube.com/embed/${trailer.key}`;
        }
      }

      return item;
    }

    if (id.startsWith('mal-anime-')) {
      const malId = id.replace('mal-anime-', '');
      try {
        const [res, streamingRes] = await Promise.all([
          fetchJikan(`${JIKAN_BASE_URL}/anime/${malId}`),
          fetchJikan(`${JIKAN_BASE_URL}/anime/${malId}/streaming`)
        ]);
        if (!res.ok) throw new Error("Jikan failed");
        const data = await res.json();
        const streamingData = await streamingRes.json();
        
        const item = adaptJikanAnime(data.data);
        item.episodesCount = data.data.episodes;
        
        if (streamingData.data && streamingData.data.length > 0) {
          item.watchProviders = streamingData.data.map((p: { name: string; url: string }, index: number) => ({
            providerId: index,
            providerName: p.name,
            logoPath: '', 
            url: p.url
          }));
        }
        
        return item;
      } catch (e) {
        console.warn(`Jikan anime detail error, trying fallback with idMal via AniList:`, e);
        const graphqlQuery = `
          query ($idMal: Int, $type: MediaType) {
            Media(idMal: $idMal, type: $type) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                extraLarge
                large
              }
              bannerImage
              description
              format
              status
              startDate {
                year
                month
                day
              }
              averageScore
              genres
              type
            }
          }
        `;
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            query: graphqlQuery,
            variables: { idMal: parseInt(malId), type: 'ANIME' }
          })
        };
        try {
          const response = await fetch(ANILIST_URL, options);
          const data = await response.json();
          if (data?.data?.Media) {
            return adaptAnilistMedia(data.data.Media, 'anime');
          }
        } catch (error) {
          console.error("Anilist fallback for mal-anime- failed:", error);
        }
        return {
          id,
          title: 'Anime (MyAnimeList offline)',
          mediaType: 'anime',
          overview: 'Erro de conexão com o MyAnimeList (Jikan). O limite de requisições foi excedido ou a API está offline.'
        } as MediaItem;
      }
    }

    if (id.startsWith('mal-manga-')) {
      const malId = id.replace('mal-manga-', '');
      try {
        const res = await fetchJikan(`${JIKAN_BASE_URL}/manga/${malId}`);
        if (!res.ok) throw new Error("Jikan failed");
        const data = await res.json();
        const item = adaptJikanManga(data.data);
        item.chaptersCount = data.data.chapters;
        item.volumesCount = data.data.volumes;
        item.authors = data.data.authors?.map((a: any) => a.name);
        return item;
      } catch (e) {
        console.warn(`Jikan manga detail error, trying fallback with idMal via AniList:`, e);
        const graphqlQuery = `
          query ($idMal: Int, $type: MediaType) {
            Media(idMal: $idMal, type: $type) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                extraLarge
                large
              }
              bannerImage
              description
              format
              status
              startDate {
                year
                month
                day
              }
              averageScore
              genres
              type
            }
          }
        `;
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            query: graphqlQuery,
            variables: { idMal: parseInt(malId), type: 'MANGA' }
          })
        };
        try {
          const response = await fetch(ANILIST_URL, options);
          const data = await response.json();
          if (data?.data?.Media) {
            return adaptAnilistMedia(data.data.Media, 'manga');
          }
        } catch (error) {
          console.error("Anilist fallback for mal-manga- failed:", error);
        }
        return {
          id,
          title: 'Mangá (MyAnimeList offline)',
          mediaType: 'manga',
          overview: 'Erro de conexão com o MyAnimeList (Jikan). O limite de requisições foi excedido ou a API está offline.'
        } as MediaItem;
      }
    }

    if (id.startsWith('anilist-')) {
      const anilistId = id.replace('anilist-', '');
      const graphqlQuery = `
        query ($id: Int) {
          Media(id: $id) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              extraLarge
              large
            }
            bannerImage
            description
            format
            status
            startDate {
              year
              month
              day
            }
            averageScore
            genres
            type
          }
        }
      `;

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { id: parseInt(anilistId) }
        })
      };

      try {
        const response = await fetch(ANILIST_URL, options);
        const data = await response.json();
        if (data?.data?.Media) {
          return adaptAnilistMedia(data.data.Media, data.data.Media.type.toLowerCase() as 'anime' | 'manga');
        }
      } catch (error) {
        console.error("Anilist getDetails error:", error);
      }
      return null;
    }

    if (id.startsWith('ol-')) {
      const olId = id.replace('ol-', '');
      try {
        const res = await fetch(`https://openlibrary.org/works/${olId}.json`);
        if (res.ok) {
           const data = await res.json();
           return {
            id,
            title: data.title,
            mediaType: 'book', // Defaulting since we can't tell perfectly without parsing subjects
            posterPath: data.covers?.[0] ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg` : undefined,
             overview: typeof data.description === 'string' ? data.description : data.description?.value || 'Sem descrição.',
            status: 'Published'
           }
        }
      } catch (e) { console.warn("OL get details error", e) }
    }

    if (id.startsWith('gbooks-')) {
      const gbooksId = id.replace('gbooks-', '');
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${gbooksId}`);
      const data = await res.json();
      
      if (data.id) {
        const categories = data.volumeInfo.categories || [];
        const isComic = categories.some((c: string) => c.toLowerCase().includes('comic') || c.toLowerCase().includes('graphic novel'));
        
        const watchProviders = [];
        if (data.saleInfo?.buyLink) {
          watchProviders.push({
            providerId: 1,
            providerName: 'Google Play Books (Buy)',
            logoPath: '',
            url: data.saleInfo.buyLink
          });
        }
        if (data.accessInfo?.webReaderLink) {
          watchProviders.push({
            providerId: 2,
            providerName: 'Google Play Books (Read)',
            logoPath: '',
            url: data.accessInfo.webReaderLink
          });
        }

        return {
          id: `gbooks-${data.id}`,
          title: data.volumeInfo.title,
          originalTitle: data.volumeInfo.title,
          posterPath: data.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || undefined,
          backdropPath: undefined,
          overview: data.volumeInfo.description,
          mediaType: isComic ? 'comic' : 'book',
          releaseDate: data.volumeInfo.publishedDate,
          voteAverage: data.volumeInfo.averageRating ? data.volumeInfo.averageRating * 2 : 0,
          genres: categories,
          authors: data.volumeInfo.authors,
          pages: data.volumeInfo.pageCount,
          publisher: data.volumeInfo.publisher,
          status: 'Published',
          watchProviders: watchProviders.length > 0 ? watchProviders : undefined
        };
      }
      return null;
    }

    if (id.startsWith('igdb-') || id.startsWith('cs-') || id.startsWith('rawg-')) {
        try {
            const res = await fetch(`/api/games/${id}`);
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.error("error fetching game details from API", e);
        }
        return null;
    }

    return null;
  }
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
      const res = await fetch(`https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=pt-br&translatedLanguage[]=en&limit=100&order[chapter]=asc`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).map((ch: any) => ({
        id: ch.id,
        chapter: ch.attributes.chapter || '0',
        title: ch.attributes.title || `Capítulo ${ch.attributes.chapter || ''}`,
        volume: ch.attributes.volume || ''
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
  }
};

