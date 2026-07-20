import { MediaItem } from '@/types';

// --- Interfaces for API Responses ---

export interface TMDBMovie {
  id: number;
  title: string;
  original_title?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  release_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  popularity?: number;
  adult?: boolean;
}

export interface TMDBTV {
  id: number;
  name: string;
  original_name?: string;
  original_language?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  popularity?: number;
  adult?: boolean;
  next_episode_to_air?: {
    air_date: string;
    episode_number: number;
    season_number: number;
    name: string;
  } | null;
}

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_japanese?: string;
  images?: { jpg?: { image_url?: string; large_image_url?: string } };
  trailer?: { embed_url?: string; url?: string; images?: { maximum_image_url?: string } };
  synopsis?: string;
  aired?: { from?: string };
  score?: number;
  genres?: { name: string }[];
  status?: string;
  members?: number;
  rating?: string;
  explicit_genres?: { name: string }[];
}

export interface JikanManga {
  mal_id: number;
  title: string;
  title_japanese?: string;
  images?: { jpg?: { image_url?: string; large_image_url?: string } };
  synopsis?: string;
  published?: { from?: string };
  score?: number;
  genres?: { name: string }[];
  status?: string;
  members?: number;
  explicit_genres?: { name: string }[];
}

export interface AnilistMedia {
  id: number;
  title: { english?: string; romaji?: string; native?: string };
  coverImage?: { extraLarge?: string; large?: string };
  bannerImage?: string;
  description?: string;
  startDate?: { year?: number; month?: number; day?: number };
  averageScore?: number;
  genres?: string[];
  status?: string;
  isAdult?: boolean;
}

export interface RAWGGame {
  id: number;
  name: string;
  background_image?: string;
  description_raw?: string;
  released?: string;
  rating?: number;
  genres?: { name: string }[];
}

export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    imageLinks?: { thumbnail?: string };
    description?: string;
    publishedDate?: string;
    averageRating?: number;
    categories?: string[];
  };
}

// TMDB Configuration
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

export const adaptTMDBMovie = (movie: TMDBMovie): MediaItem => ({
  id: `tmdb-movie-${movie.id}`,
  tmdbId: movie.id,
  source: 'tmdb',
  sourceId: movie.id,
  externalIds: { tmdb: String(movie.id) },
  providerIdentities: [{ provider: 'tmdb', providerId: String(movie.id), mediaType: 'movie', verifiedAt: Date.now() }],
  title: movie.title,
  originalTitle: movie.original_title,
  posterPath: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : undefined,
  backdropPath: movie.backdrop_path ? `${TMDB_BACKDROP_BASE}${movie.backdrop_path}` : undefined,
  overview: movie.overview,
  mediaType: 'movie',
  releaseDate: movie.release_date,
  voteAverage: movie.vote_average,
  genres: movie.genre_ids?.map((id: number) => String(id)),
  popularity: movie.popularity,
  isAdult: Boolean(movie.adult),
  explicitContent: Boolean(movie.adult),
  ageRating: movie.adult ? 18 : undefined,
  ageRatingSystem: movie.adult ? 'TMDB' : undefined,
});

export const adaptTMDBTV = (tv: TMDBTV): MediaItem => ({
  id: `tmdb-tv-${tv.id}`,
  tmdbId: tv.id,
  source: 'tmdb',
  sourceId: tv.id,
  externalIds: { tmdb: String(tv.id) },
  providerIdentities: [{ provider: 'tmdb', providerId: String(tv.id), mediaType: 'tv', verifiedAt: Date.now() }],
  title: tv.name,
  originalTitle: tv.original_name,
  posterPath: tv.poster_path ? `${TMDB_IMAGE_BASE}${tv.poster_path}` : undefined,
  backdropPath: tv.backdrop_path ? `${TMDB_BACKDROP_BASE}${tv.backdrop_path}` : undefined,
  overview: tv.overview,
  mediaType: 'tv',
  releaseDate: tv.first_air_date,
  voteAverage: tv.vote_average,
  genres: tv.genre_ids?.map((id: number) => String(id)),
  popularity: tv.popularity,
  isAdult: Boolean(tv.adult),
  explicitContent: Boolean(tv.adult),
  ageRating: tv.adult ? 18 : undefined,
  ageRatingSystem: tv.adult ? 'TMDB' : undefined,
  nextEpisodeToAir: tv.next_episode_to_air ? {
    airDate: tv.next_episode_to_air.air_date,
    episodeNumber: tv.next_episode_to_air.episode_number,
    seasonNumber: tv.next_episode_to_air.season_number,
    name: tv.next_episode_to_air.name
  } : undefined
});

export const adaptJikanAnime = (anime: JikanAnime): MediaItem => ({
  id: `mal-anime-${anime.mal_id}`,
  malId: anime.mal_id,
  source: 'myanimelist',
  sourceId: anime.mal_id,
  externalIds: { mal: String(anime.mal_id) },
  providerIdentities: [{ provider: 'myanimelist', providerId: String(anime.mal_id), mediaType: 'anime', verifiedAt: Date.now() }],
  title: anime.title,
  originalTitle: anime.title_japanese,
  posterPath: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
  backdropPath: anime.trailer?.images?.maximum_image_url || anime.images?.jpg?.large_image_url,
  overview: anime.synopsis,
  mediaType: 'anime',
  releaseDate: anime.aired?.from ? new Date(anime.aired.from).toISOString().split('T')[0] : undefined,
  voteAverage: anime.score,
  genres: anime.genres?.map(g => g.name),
  status: anime.status,
  popularity: anime.members ? anime.members / 1000 : 0,
  trailerUrl: anime.trailer?.embed_url || anime.trailer?.url,
  isAdult: Boolean(anime.rating?.toLowerCase().includes('rx') || anime.explicit_genres?.length),
  explicitContent: Boolean(anime.rating?.toLowerCase().includes('rx') || anime.explicit_genres?.length),
  ageRating: anime.rating?.toLowerCase().includes('rx') ? 18 : undefined,
  ageRatingSystem: anime.rating ? 'Jikan/MAL' : undefined,
  contentDescriptors: anime.explicit_genres?.map((genre) => genre.name),
});

export const adaptJikanManga = (manga: JikanManga): MediaItem => ({
  id: `mal-manga-${manga.mal_id}`,
  malId: manga.mal_id,
  source: 'myanimelist',
  sourceId: manga.mal_id,
  externalIds: { mal: String(manga.mal_id) },
  providerIdentities: [{ provider: 'myanimelist', providerId: String(manga.mal_id), mediaType: 'manga', verifiedAt: Date.now() }],
  title: manga.title,
  originalTitle: manga.title_japanese,
  posterPath: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url,
  backdropPath: undefined,
  overview: manga.synopsis,
  mediaType: 'manga',
  releaseDate: manga.published?.from ? new Date(manga.published.from).toISOString().split('T')[0] : undefined,
  voteAverage: manga.score,
  genres: manga.genres?.map(g => g.name),
  status: manga.status,
  popularity: manga.members ? manga.members / 1000 : 0,
  isAdult: Boolean(manga.explicit_genres?.length || manga.genres?.some((genre) => ['hentai', 'erotica'].includes(genre.name.toLowerCase()))),
  explicitContent: Boolean(manga.explicit_genres?.length || manga.genres?.some((genre) => ['hentai', 'erotica'].includes(genre.name.toLowerCase()))),
  ageRating: manga.explicit_genres?.length ? 18 : undefined,
  ageRatingSystem: manga.explicit_genres?.length ? 'Jikan/MAL' : undefined,
  contentDescriptors: manga.explicit_genres?.map((genre) => genre.name),
});

export const adaptAnilistMedia = (item: AnilistMedia, type: 'anime' | 'manga'): MediaItem => {
  const releaseDate = item.startDate?.year ? `${item.startDate.year}-${String(item.startDate.month || 1).padStart(2, '0')}-${String(item.startDate.day || 1).padStart(2, '0')}` : undefined;
  
  return {
    id: `anilist-${item.id}`,
    source: 'anilist',
    sourceId: item.id,
    externalIds: { anilist: String(item.id) },
    providerIdentities: [{ provider: 'anilist', providerId: String(item.id), mediaType: type, verifiedAt: Date.now() }],
    title: item.title.english || item.title.romaji || item.title.native || 'Unknown Title',
    originalTitle: item.title.native || item.title.romaji,
    posterPath: item.coverImage?.extraLarge || item.coverImage?.large,
    backdropPath: item.bannerImage,
    overview: item.description?.replace(/<[^>]*>?/gm, ''),
    mediaType: type,
    releaseDate,
    voteAverage: item.averageScore ? item.averageScore / 10 : 0,
    genres: item.genres,
    status: item.status === 'RELEASING' ? 'Airing' : item.status === 'FINISHED' ? 'Completed' : 'Unknown',
    isAdult: Boolean(item.isAdult),
    explicitContent: Boolean(item.isAdult),
    ageRating: item.isAdult ? 18 : undefined,
    ageRatingSystem: item.isAdult ? 'AniList' : undefined
  };
};

export const adaptRAWGGame = (game: RAWGGame): MediaItem => ({
  id: `rawg-${game.id}`,
  source: 'rawg',
  sourceId: game.id,
  providerIdentities: [{ provider: 'rawg', providerId: String(game.id), mediaType: 'game', verifiedAt: Date.now() }],
  title: game.name,
  originalTitle: game.name,
  posterPath: game.background_image,
  backdropPath: game.background_image,
  overview: game.description_raw || '',
  mediaType: 'game',
  releaseDate: game.released,
  voteAverage: game.rating ? game.rating * 2 : 0,
  genres: game.genres?.map(g => g.name),
  status: 'Released'
});

export const adaptGoogleBook = (item: GoogleBook, type: 'book' | 'comic' | 'manga' | 'novel' = 'book'): MediaItem => ({
  id: `${type === 'novel' ? 'gbooks-novel-' : 'gbooks-'}${item.id}`,
  source: 'google-books',
  sourceId: item.id,
  externalIds: { googleBooks: item.id },
  providerIdentities: [{ provider: 'google-books', providerId: item.id, mediaType: type, verifiedAt: Date.now() }],
  title: item.volumeInfo.title,
  originalTitle: item.volumeInfo.title,
  posterPath: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || undefined,
  backdropPath: undefined,
  overview: item.volumeInfo.description,
  mediaType: type,
  releaseDate: item.volumeInfo.publishedDate,
  voteAverage: item.volumeInfo.averageRating ? item.volumeInfo.averageRating * 2 : 0,
  genres: item.volumeInfo.categories,
  status: 'Published'
});
