import { Router } from "express";

export const gameRouter = Router();

// Cache for IGDB Token
let igdbToken: string | null = null;
let igdbTokenExpiresAt: number = 0;

async function getIGDBToken() {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  if (igdbToken && Date.now() < igdbTokenExpiresAt) {
    return igdbToken;
  }

  try {
    const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.access_token) {
      igdbToken = data.access_token;
      igdbTokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer
      return igdbToken;
    }
  } catch (e) {
    console.error("IGDB token error:", e);
  }
  return null;
}

async function fetchIGDB(endpoint: string, body: string) {
  const token = await getIGDBToken();
  const clientId = process.env.IGDB_CLIENT_ID;
  if (!token || !clientId) return null;

  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'text/plain',
    },
    body
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`IGDB Error Status ${res.status}:`, errText);
    throw new Error(`IGDB Error: ${res.statusText}`);
  }
  return res.json();
}

// Fallback sources
const HEADERS = {
  'User-Agent': 'HuboraApp/1.0 (Integration/Fallback)'
};

async function fetchCheapShark(query: string) {
  try {
    const res = await fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(query)}&limit=10`, { headers: HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("CheapShark error:", e);
    return [];
  }
}

async function fetchCheapSharkDeals() {
  try {
    const res = await fetch(`https://www.cheapshark.com/api/1.0/deals?storeID=1&onSale=1&sortBy=Deal%20Rating&pageSize=15`, { headers: HEADERS });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

async function fetchSteamSearch(query: string) {
    try {
        const res = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`, { headers: HEADERS });
        if (!res.ok) return [];
        const data = await res.json();
        return data.items || [];
    } catch {
        return [];
    }
}

// --- NORMALIZATION ---

function normalizeGameResult(item: any, source: string): any {
  if (source === 'igdb') {
    const coverUrl = item.cover?.url ? item.cover.url.replace('t_thumb', 't_1080p').replace('//', 'https://') : undefined;
    const backdropUrl = item.screenshots?.[0]?.url ? item.screenshots[0].url.replace('t_thumb', 't_1080p').replace('//', 'https://') : coverUrl;
    
    return {
      id: `igdb-${item.id}`,
      title: item.name,
      originalTitle: item.name,
      posterPath: coverUrl,
      backdropPath: backdropUrl,
      mediaType: 'game',
      releaseDate: item.first_release_date ? new Date(item.first_release_date * 1000).toISOString() : undefined,
      voteAverage: item.rating ? (item.rating / 10) : 0, // scale 0-10
      genres: item.genres?.map((g: any) => g.name) || [],
      overview: item.summary,
      status: item.status === 4 ? 'Upcoming' : 'Released',
      source: 'igdb',
      providerId: item.id
    };
  }
  
  if (source === 'cheapshark') {
    return {
      id: `cs-${item.gameID}`,
      title: item.external,
      originalTitle: item.external,
      posterPath: item.thumb,
      mediaType: 'game',
      voteAverage: 0,
      source: 'cheapshark',
      providerId: item.gameID,
      dealID: item.cheapestDealID,
      price: item.cheapest
    };
  }
  
  if (source === 'cheapshark-deal') {
    return {
        id: `cs-${item.gameID}`,
        title: item.title,
        originalTitle: item.title,
        posterPath: item.thumb,
        mediaType: 'game',
        voteAverage: item.metacriticScore ? (item.metacriticScore / 10) : (item.dealRating ? item.dealRating * 1 : 0),
        source: 'cheapshark',
        providerId: item.gameID,
        dealID: item.dealID,
        customBadge: 'Em promoção',
        hypeReason: `Desconto de ${Math.round(item.savings)}%`
    }
  }
  
  return item;
}

// Routes
gameRouter.get("/status", async (req, res) => {
  const token = await getIGDBToken();
  const rawg = process.env.RAWG_API_KEY;
  res.json({
    igdb: token ? 'connected' : 'not configured',
    cheapshark: 'available',
    steam: 'available',
    rawg: rawg ? 'configured' : 'optional'
  });
});

gameRouter.get("/search", async (req, res) => {
  const q = req.query.q as string;
  if (!q) return res.json([]);

  try {
    const igdbData = await fetchIGDB('games', `search "${q}"; fields name, cover.url, first_release_date, rating, genres.name, summary, screenshots.url; limit 15;`);
    if (igdbData && igdbData.length > 0) {
      return res.json(igdbData.map((g: any) => normalizeGameResult(g, 'igdb')));
    }
  } catch (e) {
    console.warn("IGDB search failed", e);
  }

  // Fallback 1: CheapShark
  const csData = await fetchCheapShark(q);
  if (csData && csData.length > 0) {
    return res.json(csData.map((g: any) => normalizeGameResult(g, 'cheapshark')));
  }

  res.json([]);
});

gameRouter.get("/trending", async (req, res) => {
  try {
    const body = 'fields name, cover.url, first_release_date, rating, total_rating, total_rating_count, genres.name, summary, screenshots.url; where first_release_date > ' + (Math.floor(Date.now() / 1000) - 31536000) + ' & total_rating_count > 5; sort total_rating desc; limit 15;';
    const igdbData = await fetchIGDB('games', body);
    if (igdbData && igdbData.length > 0) {
      return res.json(igdbData.map((g: any) => normalizeGameResult(g, 'igdb')));
    }
  } catch (e) {
    console.warn("IGDB trending failed", e);
  }

  const deals = await fetchCheapSharkDeals();
  if (deals && deals.length > 0) {
    return res.json(deals.map((d: any) => normalizeGameResult(d, 'cheapshark-deal')));
  }

  res.json([]);
});

gameRouter.get("/upcoming", async (req, res) => {
  try {
    const body = 'fields name, cover.url, first_release_date, rating, genres.name, summary, screenshots.url; where first_release_date > ' + Math.floor(Date.now() / 1000) + ' & cover != null; sort first_release_date asc; limit 15;';
    const igdbData = await fetchIGDB('games', body);
    if (igdbData && igdbData.length > 0) {
      return res.json(igdbData.map((g: any) => normalizeGameResult(g, 'igdb')));
    }
  } catch (e) {
    console.warn("IGDB upcoming failed", e);
  }
  res.json([]);
});

gameRouter.get("/recent", async (req, res) => {
    try {
        const body = `
        fields name, cover.url, first_release_date, rating, genres.name, summary, screenshots.url;
        where first_release_date < ${Math.floor(Date.now() / 1000)} & first_release_date > ${Math.floor(Date.now() / 1000) - (86400 * 30)};
        sort first_release_date desc;
        limit 15;
        `;
        const igdbData = await fetchIGDB('games', body);
        if (igdbData && igdbData.length > 0) {
            return res.json(igdbData.map((g: any) => normalizeGameResult(g, 'igdb')));
        }
    } catch (e) {
        console.warn("IGDB recent failed", e);
    }
    
    // Fallback: Deals
    const deals = await fetchCheapSharkDeals();
    if (deals && deals.length > 0) {
        return res.json(deals.map((d: any) => normalizeGameResult(d, 'cheapshark-deal')));
    }
    
    res.json([]);
});

gameRouter.get("/:id", async (req, res) => {
    const idParam = req.params.id;
    // Check if it's IGDB
    if (idParam.startsWith('igdb-')) {
        try {
            const numericId = idParam.replace('igdb-', '');
            const body = `
              fields name, cover.url, first_release_date, rating, genres.name, summary, screenshots.url, platforms.name, similar_games.name, similar_games.cover.url, involved_companies.company.name;
              where id = ${numericId};
            `;
            const igdbData = await fetchIGDB('games', body);
            if (igdbData && igdbData.length > 0) {
                const game = igdbData[0];
                const normalized = normalizeGameResult(game, 'igdb');
                
                // Add extra details
                normalized.platforms = game.platforms?.map((p: any) => p.name);
                normalized.companies = game.involved_companies?.map((c: any) => c.company.name);
                
                // Extract similar games
                if (game.similar_games) {
                    normalized.similar = game.similar_games.map((sg: any) => normalizeGameResult(sg, 'igdb'));
                }
                
                return res.json(normalized);
            }
        } catch (e) {
            console.error("error fetching IGDB id", e);
        }
    }
    
    if (idParam.startsWith('cs-')) {
        try {
             // Fetch deal details
             const numericId = idParam.replace('cs-', '');
             const cheapData = await fetch(`https://www.cheapshark.com/api/1.0/games?id=${numericId}`).then(r => r.json());
             if (cheapData.info) {
                 return res.json({
                     id: idParam,
                     title: cheapData.info.title,
                     posterPath: cheapData.info.thumb,
                     mediaType: 'game',
                     source: 'cheapshark',
                     customBadge: 'Em promoção (CheapShark)',
                     overview: "Mais informações disponíveis nas lojas.",
                     deals: cheapData.deals
                 });
             }
        } catch (e) {
             console.error("error fetching CS id", e);
        }
    }
    
    // Attempt RAWG fallback if configured
    const rawgKey = process.env.RAWG_API_KEY;
    if (rawgKey && idParam.startsWith('rawg-')) {
        const numericId = idParam.replace('rawg-', '');
        const data = await fetch(`https://api.rawg.io/api/games/${numericId}?key=${rawgKey}`).then(r => r.json());
        if (data && data.name) {
             return res.json({
                id: `rawg-${data.id}`,
                title: data.name,
                posterPath: data.background_image || undefined,
                backdropPath: data.background_image_additional || data.background_image || undefined,
                overview: data.description_raw,
                mediaType: 'game',
                releaseDate: data.released,
                voteAverage: data.rating ? data.rating * 2 : 0,
                genres: data.genres?.map((g: any) => g.name),
                platforms: data.platforms?.map((p: any) => p.platform.name),
                companies: data.developers?.map((d: any) => d.name),
                status: 'Released'
             });
        }
    }

    res.status(404).json({ error: "Game not found" });
});

gameRouter.post("/sync", async (req, res) => {
    // Invalidate cached tokens or similar, basically returns success to let the UI refresh.
    res.json({ success: true, timestamp: Date.now() });
});
