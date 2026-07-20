import { fetchWithTimeout } from './http.js';

type UnknownRecord = Record<string, any>;

let igdbToken: string | null = null;
let igdbTokenExpiresAt = 0;

const HEADERS = {
  'User-Agent': 'Hubora/8.0 (personal media hub)',
};

const env = (name: string) => process.env[name]?.trim() || '';

async function getIGDBToken(): Promise<string | null> {
  const clientId = env('IGDB_CLIENT_ID');
  const clientSecret = env('IGDB_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  if (igdbToken && Date.now() < igdbTokenExpiresAt) return igdbToken;

  const tokenUrl = new URL('https://id.twitch.tv/oauth2/token');
  tokenUrl.searchParams.set('client_id', clientId);
  tokenUrl.searchParams.set('client_secret', clientSecret);
  tokenUrl.searchParams.set('grant_type', 'client_credentials');

  const response = await fetchWithTimeout(tokenUrl, { method: 'POST' });
  if (!response.ok) return null;

  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) return null;

  igdbToken = payload.access_token;
  igdbTokenExpiresAt = Date.now() + Math.max(60, (payload.expires_in ?? 3_600) - 60) * 1_000;
  return igdbToken;
}

async function fetchIGDB(endpoint: string, body: string): Promise<UnknownRecord[] | null> {
  const token = await getIGDBToken();
  const clientId = env('IGDB_CLIENT_ID');
  if (!token || !clientId) return null;

  const response = await fetchWithTimeout(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'text/plain',
    },
    body,
  });

  if (!response.ok) throw new Error(`IGDB respondeu ${response.status}`);
  return response.json() as Promise<UnknownRecord[]>;
}

async function fetchCheapShark(query: string): Promise<UnknownRecord[]> {
  const url = new URL('https://www.cheapshark.com/api/1.0/games');
  url.searchParams.set('title', query);
  url.searchParams.set('limit', '15');
  const response = await fetchWithTimeout(url, { headers: HEADERS });
  if (!response.ok) return [];
  return response.json() as Promise<UnknownRecord[]>;
}

async function fetchCheapSharkDeals(): Promise<UnknownRecord[]> {
  const url = new URL('https://www.cheapshark.com/api/1.0/deals');
  url.searchParams.set('storeID', '1');
  url.searchParams.set('onSale', '1');
  url.searchParams.set('sortBy', 'Deal Rating');
  url.searchParams.set('pageSize', '15');
  const response = await fetchWithTimeout(url, { headers: HEADERS });
  if (!response.ok) return [];
  return response.json() as Promise<UnknownRecord[]>;
}

function normalizeGameResult(item: UnknownRecord, source: 'igdb' | 'cheapshark' | 'cheapshark-deal') {
  if (source === 'igdb') {
    const coverUrl = item.cover?.url
      ? String(item.cover.url).replace('t_thumb', 't_1080p').replace(/^\/\//, 'https://')
      : undefined;
    const backdropUrl = item.screenshots?.[0]?.url
      ? String(item.screenshots[0].url).replace('t_thumb', 't_1080p').replace(/^\/\//, 'https://')
      : coverUrl;

    return {
      id: `igdb-${item.id}`,
      providerId: item.id,
      source: 'igdb',
      title: item.name,
      originalTitle: item.name,
      posterPath: coverUrl,
      backdropPath: backdropUrl,
      mediaType: 'game',
      releaseDate: item.first_release_date
        ? new Date(item.first_release_date * 1_000).toISOString()
        : undefined,
      voteAverage: item.rating ? item.rating / 10 : 0,
      genres: item.genres?.map((genre: UnknownRecord) => genre.name) ?? [],
      overview: item.summary,
      status: item.status === 4 ? 'Upcoming' : 'Released',
    };
  }

  if (source === 'cheapshark-deal') {
    return {
      id: `cs-${item.gameID}`,
      providerId: item.gameID,
      source: 'cheapshark',
      title: item.title,
      originalTitle: item.title,
      posterPath: item.thumb,
      mediaType: 'game',
      voteAverage: item.metacriticScore
        ? item.metacriticScore / 10
        : Number(item.dealRating || 0),
      dealID: item.dealID,
      customBadge: 'Em promoção',
      hypeReason: `Desconto de ${Math.round(Number(item.savings || 0))}%`,
    };
  }

  return {
    id: `cs-${item.gameID}`,
    providerId: item.gameID,
    source: 'cheapshark',
    title: item.external,
    originalTitle: item.external,
    posterPath: item.thumb,
    mediaType: 'game',
    voteAverage: 0,
    dealID: item.cheapestDealID,
    price: item.cheapest,
  };
}

function sanitizeSearch(value: string): string {
  return value.trim().slice(0, 120).replace(/[\\"]/g, ' ');
}

export function gameStatus() {
  return {
    igdb: env('IGDB_CLIENT_ID') && env('IGDB_CLIENT_SECRET') ? 'configured' : 'not configured',
    cheapshark: 'available',
    steam: 'available',
    rawg: env('RAWG_API_KEY') ? 'configured' : 'optional',
  };
}

export async function searchGames(query: string) {
  const safeQuery = sanitizeSearch(query);
  if (!safeQuery) return [];

  try {
    const data = await fetchIGDB(
      'games',
      `search "${safeQuery}"; fields name,cover.url,first_release_date,rating,genres.name,summary,screenshots.url; limit 15;`,
    );
    if (data?.length) return data.map((item) => normalizeGameResult(item, 'igdb'));
  } catch (error) {
    console.warn('IGDB search indisponível:', error);
  }

  return (await fetchCheapShark(safeQuery)).map((item) => normalizeGameResult(item, 'cheapshark'));
}

export async function trendingGames() {
  const now = Math.floor(Date.now() / 1_000);
  try {
    const data = await fetchIGDB(
      'games',
      `fields name,cover.url,first_release_date,rating,total_rating,total_rating_count,genres.name,summary,screenshots.url; where first_release_date > ${now - 31_536_000} & total_rating_count > 5; sort total_rating desc; limit 15;`,
    );
    if (data?.length) return data.map((item) => normalizeGameResult(item, 'igdb'));
  } catch (error) {
    console.warn('IGDB trending indisponível:', error);
  }

  return (await fetchCheapSharkDeals()).map((item) => normalizeGameResult(item, 'cheapshark-deal'));
}

export async function upcomingGames() {
  const now = Math.floor(Date.now() / 1_000);
  try {
    const data = await fetchIGDB(
      'games',
      `fields name,cover.url,first_release_date,rating,genres.name,summary,screenshots.url; where first_release_date > ${now} & cover != null; sort first_release_date asc; limit 15;`,
    );
    return data?.map((item) => normalizeGameResult(item, 'igdb')) ?? [];
  } catch (error) {
    console.warn('IGDB upcoming indisponível:', error);
    return [];
  }
}

export async function recentGames() {
  const now = Math.floor(Date.now() / 1_000);
  try {
    const data = await fetchIGDB(
      'games',
      `fields name,cover.url,first_release_date,rating,genres.name,summary,screenshots.url; where first_release_date < ${now} & first_release_date > ${now - 2_592_000}; sort first_release_date desc; limit 15;`,
    );
    if (data?.length) return data.map((item) => normalizeGameResult(item, 'igdb'));
  } catch (error) {
    console.warn('IGDB recent indisponível:', error);
  }

  return (await fetchCheapSharkDeals()).map((item) => normalizeGameResult(item, 'cheapshark-deal'));
}

export async function gameDetails(id: string) {
  if (/^igdb-\d+$/.test(id)) {
    const numericId = id.replace('igdb-', '');
    const data = await fetchIGDB(
      'games',
      `fields name,cover.url,first_release_date,rating,genres.name,summary,screenshots.url,platforms.name,similar_games.name,similar_games.cover.url,involved_companies.company.name; where id = ${numericId};`,
    );
    if (!data?.length) return null;
    const game = data[0];
    return {
      ...normalizeGameResult(game, 'igdb'),
      platforms: game.platforms?.map((platform: UnknownRecord) => platform.name) ?? [],
      companies: game.involved_companies?.map((entry: UnknownRecord) => entry.company?.name).filter(Boolean) ?? [],
      similar: game.similar_games?.map((item: UnknownRecord) => normalizeGameResult(item, 'igdb')) ?? [],
    };
  }

  if (/^cs-\d+$/.test(id)) {
    const numericId = id.replace('cs-', '');
    const url = new URL('https://www.cheapshark.com/api/1.0/games');
    url.searchParams.set('id', numericId);
    const response = await fetchWithTimeout(url, { headers: HEADERS });
    if (!response.ok) return null;
    const data = await response.json() as UnknownRecord;
    if (!data.info) return null;
    return {
      id,
      title: data.info.title,
      posterPath: data.info.thumb,
      mediaType: 'game',
      source: 'cheapshark',
      customBadge: 'Em promoção (CheapShark)',
      overview: 'Mais informações disponíveis nas lojas.',
      deals: data.deals ?? [],
    };
  }

  if (/^rawg-\d+$/.test(id) && env('RAWG_API_KEY')) {
    const numericId = id.replace('rawg-', '');
    const url = new URL(`https://api.rawg.io/api/games/${numericId}`);
    url.searchParams.set('key', env('RAWG_API_KEY'));
    const response = await fetchWithTimeout(url);
    if (!response.ok) return null;
    const data = await response.json() as UnknownRecord;
    if (!data.name) return null;
    return {
      id: `rawg-${data.id}`,
      title: data.name,
      posterPath: data.background_image || undefined,
      backdropPath: data.background_image_additional || data.background_image || undefined,
      overview: data.description_raw,
      mediaType: 'game',
      releaseDate: data.released,
      voteAverage: data.rating ? data.rating * 2 : 0,
      genres: data.genres?.map((genre: UnknownRecord) => genre.name) ?? [],
      platforms: data.platforms?.map((entry: UnknownRecord) => entry.platform?.name).filter(Boolean) ?? [],
      companies: data.developers?.map((developer: UnknownRecord) => developer.name) ?? [],
      status: 'Released',
    };
  }

  return null;
}
