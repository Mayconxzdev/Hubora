export type MediaType = 'movie' | 'tv' | 'series' | 'drama' | 'anime' | 'manga' | 'comic' | 'book' | 'novel' | 'game';
export type AdultContentMode = 'off' | 'mature' | 'vault';
export type SpoilerShieldMode = 'off' | 'balanced' | 'strict' | 'custom';
export type ItemVisibility = 'private' | 'friends' | 'public';
export type ProviderCapability = 'catalog' | 'search' | 'details' | 'stream' | 'reader' | 'subtitles' | 'availability' | 'progress' | 'download' | 'chapters' | 'health';
export type AccessKind = 'official-link' | 'embed' | 'video' | 'hls' | 'dash' | 'audio' | 'book-preview' | 'epub' | 'pdf' | 'html';
export type ProviderMode = 'metadata' | 'downloadable-file' | 'embedded-player' | 'personal-server' | 'external-resolver' | 'external-page' | 'manifest';
export type ProviderAuthKind = 'none' | 'api-key' | 'account' | 'server-token' | 'manifest-url' | 'manual-authorization';
export type ProviderCategory = 'movies' | 'series' | 'anime' | 'doramas' | 'books' | 'novels' | 'manga' | 'comics' | 'games';

export interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

export interface ProviderIdentity {
  provider: string;
  providerId: string;
  mediaType: MediaType;
  verifiedAt: number;
}

export interface ExternalIdMap {
  imdb?: string;
  tmdb?: string;
  tvdb?: string;
  anilist?: string;
  mal?: string;
  anidb?: string;
  isbn?: string;
  openLibrary?: string;
  googleBooks?: string;
  igdb?: string;
  steam?: string;
}

export type MediaVideoKind = 'trailer' | 'teaser' | 'clip' | 'featurette' | 'opening' | 'ending' | 'gameplay' | 'other';

export interface MediaVideo {
  id: string;
  key: string;
  name: string;
  kind: MediaVideoKind;
  provider: 'TMDB / YouTube' | 'Jikan / MyAnimeList' | 'YouTube';
  embedUrl: string;
  official: boolean;
  language?: string;
  publishedAt?: string;
}

export interface MediaItem {
  id: string | number;
  tmdbId?: number;
  malId?: number;
  title: string;
  originalTitle?: string;
  posterPath?: string;
  backdropPath?: string;
  overview?: string;
  mediaType: MediaType;
  releaseDate?: string;
  voteAverage?: number;
  genres?: string[];
  status?: string; // Released, Ongoing, Completed, etc.
  popularity?: number;
  cast?: { name: string; character: string; profilePath?: string }[];
  similar?: MediaItem[];
  trailerUrl?: string;
  videos?: MediaVideo[];
  runtime?: number;
  nextEpisodeToAir?: {
    airDate: string;
    episodeNumber: number;
    seasonNumber: number;
    name: string;
  };
  watchProviders?: {
    providerId: number;
    providerName: string;
    logoPath: string;
    url?: string;
  }[];
  // Game specific
  platforms?: string[];
  developers?: string[];
  publishers?: string[];
  screenshots?: string[];
  customBadge?: string;
  price?: string;
  dealID?: string;
  source?: string;
  sourceId?: string | number;
  providerIdentities?: ProviderIdentity[];
  externalIds?: ExternalIdMap;
  workFingerprint?: string;
  moods?: string[];
  themes?: string[];
  pace?: 'slow' | 'medium' | 'fast';
  countries?: string[];
  // TV / Anime specific
  seasonsCount?: number;
  episodesCount?: number;
  // Book / Manga specific
  authors?: string[];
  // HypeScore Info
  hypeScore?: number;
  hypeReason?: string;
  hypeRank?: number;
  chaptersCount?: number;
  volumesCount?: number;
  pages?: number;
  publisher?: string;
  ageRating?: number;
  ageRatingSystem?: string;
  contentDescriptors?: string[];
  isAdult?: boolean;
  explicitContent?: boolean;
  visibility?: ItemVisibility;
  connections?: MediaConnection[];
  access?: MediaAccess[];
  providerUrl?: string;
  embeddable?: boolean;
  publicDomain?: boolean;
  googleVolumeId?: string;
}

export type LibraryStatus = 'planning' | 'consuming' | 'completed' | 'dropped' | 'paused';
export type LibraryPriority = 'low' | 'medium' | 'high' | 'must';

export interface ProgressState {
  // Movie
  watched?: boolean;
  watchedAt?: number;
  
  // TV / Anime
  currentSeason?: number;
  currentEpisode?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
  nextEpisodeDate?: string;
  airingDay?: string;
  studio?: string;
  
  // Manga
  currentChapter?: number;
  currentVolume?: number;
  totalChapters?: number;
  totalVolumes?: number;
  
  // Book
  currentPage?: number;
  totalPages?: number;
  percentageRead?: number;
  author?: string;
  publisher?: string;
  
  // Comic / HQ
  currentIssue?: number;
  arcName?: string;
  writer?: string;
  artist?: string;
  
  // Game
  platform?: string;
  hoursPlayed?: number;
  completionPercentage?: number;
  isInstalled?: boolean;
  isOwned?: boolean;
  completionStatus?: string;
  mainStoryCompleted?: boolean;
  favoritePlatform?: string;
}

export interface ReleasePreferences {
  new_episode: boolean;
  new_season: boolean;
  new_volume: boolean;
  release: boolean;
  availability: boolean;
  price: boolean;
}

export interface UserMediaEntry {
  id: string; // Stable provider-qualified entry id
  canonicalId?: string;
  workFingerprint?: string;
  providerIdentities?: ProviderIdentity[];
  revision?: number;
  mediaId: string | number;
  sourceId: string | number;
  source: string;
  mediaType: MediaType;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  media: MediaItem;
  status: LibraryStatus;
  progress: ProgressState;
  rating?: number;
  priority: LibraryPriority;
  tags: string[];
  notes?: string;
  isFavorite: boolean;
  isTrackedRelease: boolean;
  releasePreferences?: ReleasePreferences;
  dateAdded: number;
  lastUpdated: number;
  lastInteractedAt: number;
  visibility?: ItemVisibility;
  adultPrivate?: boolean;
}

export type ConsumptionEventKind = 'progress' | 'completed' | 'rating' | 'status' | 'session';

export interface ConsumptionEvent {
  id: string;
  entryId: string;
  kind: ConsumptionEventKind;
  occurredAt: number;
  value?: number | string | boolean;
  metadata?: Record<string, unknown>;
}

export type SyncEntity = 'library' | 'custom_list' | 'consumption_event' | 'profile';

export interface SyncOperation {
  operationId: string;
  entity: SyncEntity;
  entityId: string;
  action: 'upsert' | 'delete';
  payload?: unknown;
  createdAt: number;
  attempts: number;
  nextAttemptAt?: number;
  lastError?: string;
}

export interface CustomList {
  id: string;
  name: string;
  description?: string;
  items: string[]; // mediaIds or internal ids
  createdAt: number;
  updatedAt?: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  xp?: number;
  level?: number;
  preferences: {
    theme: 'dark' | 'light' | 'system';
    adultContent: boolean;
    adultMode?: AdultContentMode;
    adultVaultEnabled?: boolean;
    adultFilterEnabled?: boolean;
    adultVaultPinMode?: 'never' | 'session' | 'always';
    adultLibraryPublicByDefault?: boolean;
    birthYear?: number;
    adultConfirmed?: boolean;
    spoilerShield?: SpoilerShieldMode;
    spoilerProtection?: {
      synopsis: boolean;
      images: boolean;
      reviews: boolean;
      comments: boolean;
      characters: boolean;
      achievements: boolean;
      futureSeasons: boolean;
    };
    adaptiveHome?: boolean;
    language: string;
    favoriteGenres?: string[];
    dislikedGenres?: string[];
    favoriteMediaTypes?: MediaType[];
    categoryOrder?: MediaType[];
    localModelsEnabled?: boolean;
    notificationsEnabled?: boolean;
    notificationDigest?: 'immediate' | 'daily' | 'weekly' | 'off';
  };
  stats: {
    totalWatched: number;
    totalRead: number;
    timeSpent: number; // minutes
  };
}

export interface SearchResult {
  items: MediaItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  mediaId: string;
  mediaTitle: string;
  mediaPoster?: string;
  mediaType: string;
  rating: number;
  content: string;
  createdAt: number;
  likesCount: number;
  hasSpoilers: boolean;
  isAdult?: boolean;
  visibility?: 'public' | 'adult';
}


export interface MediaConnection {
  id: string;
  kind: 'franchise' | 'adaptation' | 'creator' | 'cast' | 'studio' | 'soundtrack' | 'sequel' | 'prequel' | 'spin_off';
  label: string;
  targetId?: string;
  targetTitle?: string;
  mediaType?: MediaType;
  confidence?: number;
  source?: string;
}

export interface Goal {
  id: string;
  title: string;
  mediaType?: MediaType;
  metric: 'items' | 'minutes' | 'pages' | 'episodes' | 'chapters' | 'hours';
  target: number;
  current: number;
  startAt: number;
  endAt: number;
  restDaysAllowed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ScreenshotDiaryEntry {
  id: string;
  entryId: string;
  createdAt: number;
  note?: string;
  imageBlob?: Blob;
  localOnly: boolean;
  isAdult: boolean;
}

export interface IntegrationConfig {
  id: string;
  kind: 'jellyfin' | 'komga' | 'kavita' | 'opds';
  name: string;
  baseUrl: string;
  token?: string; // runtime only; never persisted in plaintext
  encryptedToken?: { version: 1; iv: string; ciphertext: string };
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}


export interface MediaAccess {
  id: string;
  label: string;
  kind: AccessKind;
  url?: string;
  embedId?: string;
  provider: string;
  quality?: string;
  language?: string;
  free?: boolean;
  legalNote?: string;
  mode?: ProviderMode;
  lastCheckedAt?: number;
  health?: 'available' | 'limited' | 'offline' | 'unknown';
}

export interface ProviderCatalogEntry {
  id: string;
  name: string;
  description: string;
  homepage: string;
  categories: ProviderCategory[];
  mode: ProviderMode;
  auth: ProviderAuthKind;
  capabilities: ProviderCapability[];
  free: boolean | 'partial';
  official: boolean;
  featured?: boolean;
  note?: string;
}

export interface ProviderManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  baseUrl: string;
  capabilities: ProviderCapability[];
  mediaTypes: MediaType[];
  official: boolean;
  enabledByDefault?: boolean;
  icon?: string;
}

export interface ProviderConfig {
  id: string;
  protocol?: 'stremio' | 'hubora';
  manifestUrl: string;
  name: string;
  enabled: boolean;
  officialOnly: boolean;
  capabilities: ProviderCapability[];
  mediaTypes: MediaType[];
  createdAt: number;
  updatedAt: number;
}

export interface HuboraNotification {
  id: string;
  userId?: string;
  entryId?: string;
  title: string;
  body: string;
  url?: string;
  kind: 'release' | 'availability' | 'price' | 'reminder' | 'system';
  createdAt: number;
  readAt?: number;
  payload?: Record<string, unknown>;
}

export interface CaptureInboxItem {
  id: string;
  createdAt: number;
  kind: 'image' | 'link' | 'text' | 'barcode';
  title?: string;
  text?: string;
  url?: string;
  imageBlob?: Blob;
  processed: boolean;
}
