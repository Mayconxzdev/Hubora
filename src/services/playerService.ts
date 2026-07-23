/**
 * Legacy compatibility helpers.
 *
 * Hubora no longer manufactures third-party embed URLs from a TMDB id. A
 * playable source must come from MediaItem.access, a personal server, or a
 * provider explicitly installed by the user and resolved through the provider
 * protocol. Keeping these functions returning an empty list prevents old call
 * sites or persisted UI state from silently restoring unverifiable players.
 */
export interface StreamSource {
  id: string;
  name: string;
  url: string;
  quality?: string;
  isOfficial?: boolean;
}

export function getCleanTmdbId(rawId: string | number): string {
  return String(rawId).replace(/^(tmdb-movie-|tmdb-tv-|movie-|tv-|game-|anime-)/i, '').trim();
}

export function getMovieStreamSources(_tmdbId: string | number): StreamSource[] {
  return [];
}

export function getTvStreamSources(
  _tmdbId: string | number,
  _season = 1,
  _episode = 1,
): StreamSource[] {
  return [];
}
