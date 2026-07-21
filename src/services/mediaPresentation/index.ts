import { MediaType } from '@/types';

export interface MediaTerminology {
  primaryActionLabel: string;
  continueActionLabel: string;
  unitLabel: string;
  itemPluralLabel: string;
  progressFormat: (item: any) => string;
}

export interface PrimaryActionRule {
  id: string;
  label: string;
  iconName: string;
  isAvailable: (item: any) => boolean;
}

export interface TabRule {
  id: string;
  label: string;
  isVisible: (item: any) => boolean;
}

export interface MediaPresentationContract {
  type: MediaType;
  displayName: string;
  terminology: MediaTerminology;
  primaryActions: PrimaryActionRule[];
  allowedTabs: TabRule[];
  hasSeasons: boolean;
  hasEpisodes: boolean;
  hasChapters: boolean;
  hasPages: boolean;
  hasPlaytimeHours: boolean;
  hasPlatforms: boolean;
  allowTrailers: boolean;
}

const MovieContract: MediaPresentationContract = {
  type: 'movie',
  displayName: 'Filme',
  terminology: {
    primaryActionLabel: 'Assistir',
    continueActionLabel: 'Continuar Filme',
    unitLabel: 'minutos',
    itemPluralLabel: 'Filmes',
    progressFormat: (item) => (item.runtime ? `${item.runtime} min` : 'Filme'),
  },
  primaryActions: [
    {
      id: 'watch-movie',
      label: 'Assistir Filme',
      iconName: 'PlayCircle',
      isAvailable: (item) => !!(item.watchProviders?.length || item.trailerUrl),
    },
  ],
  allowedTabs: [
    { id: 'overview', label: 'Visão Geral', isVisible: () => true },
    { id: 'videos', label: 'Vídeos & Trailers', isVisible: (item) => !!(item.videos?.length || item.trailerUrl) },
    { id: 'relations', label: 'Coleção & Franquia', isVisible: (item) => !!(item.similar?.length || item.collection) },
    { id: 'sources', label: 'Onde Assistir', isVisible: (item) => !!item.watchProviders?.length },
    { id: 'details', label: 'Ficha Técnica', isVisible: () => true },
  ],
  hasSeasons: false,
  hasEpisodes: false,
  hasChapters: false,
  hasPages: false,
  hasPlaytimeHours: false,
  hasPlatforms: false,
  allowTrailers: true,
};

const SeriesContract: MediaPresentationContract = {
  type: 'series',
  displayName: 'Série',
  terminology: {
    primaryActionLabel: 'Começar Série',
    continueActionLabel: 'Continuar Série',
    unitLabel: 'episódios',
    itemPluralLabel: 'Séries',
    progressFormat: (item) => (item.episodesCount ? `${item.episodesCount} Episódios` : 'Série'),
  },
  primaryActions: [
    {
      id: 'start-series',
      label: 'Começar Episódio 1',
      iconName: 'PlayCircle',
      isAvailable: () => true,
    },
  ],
  allowedTabs: [
    { id: 'overview', label: 'Visão Geral', isVisible: () => true },
    { id: 'episodes', label: 'Episódios & Temporadas', isVisible: (item) => !!(item.episodesCount || item.seasonsCount) },
    { id: 'videos', label: 'Vídeos & Teasers', isVisible: (item) => !!(item.videos?.length || item.trailerUrl) },
    { id: 'sources', label: 'Onde Assistir', isVisible: (item) => !!item.watchProviders?.length },
    { id: 'details', label: 'Ficha Técnica', isVisible: () => true },
  ],
  hasSeasons: true,
  hasEpisodes: true,
  hasChapters: false,
  hasPages: false,
  hasPlaytimeHours: false,
  hasPlatforms: false,
  allowTrailers: true,
};

const DramaContract: MediaPresentationContract = {
  type: 'drama',
  displayName: 'Dorama',
  terminology: {
    primaryActionLabel: 'Assistir Dorama',
    continueActionLabel: 'Continuar Dorama',
    unitLabel: 'episódios',
    itemPluralLabel: 'Doramas',
    progressFormat: (item) => (item.episodesCount ? `${item.episodesCount} Episódios` : 'Dorama'),
  },
  primaryActions: [
    {
      id: 'watch-drama',
      label: 'Assistir Dorama',
      iconName: 'PlayCircle',
      isAvailable: () => true,
    },
  ],
  allowedTabs: [
    { id: 'overview', label: 'Visão Geral', isVisible: () => true },
    { id: 'episodes', label: 'Episódios', isVisible: (item) => !!item.episodesCount },
    { id: 'videos', label: 'Vídeos & Teasers', isVisible: (item) => !!(item.videos?.length || item.trailerUrl) },
    { id: 'sources', label: 'Onde Assistir', isVisible: (item) => !!item.watchProviders?.length },
    { id: 'details', label: 'Ficha Técnica', isVisible: () => true },
  ],
  hasSeasons: true,
  hasEpisodes: true,
  hasChapters: false,
  hasPages: false,
  hasPlaytimeHours: false,
  hasPlatforms: false,
  allowTrailers: true,
};

const AnimeContract: MediaPresentationContract = {
  type: 'anime',
  displayName: 'Anime',
  terminology: {
    primaryActionLabel: 'Assistir Anime',
    continueActionLabel: 'Continuar Anime',
    unitLabel: 'episódios',
    itemPluralLabel: 'Animes',
    progressFormat: (item) => (item.episodesCount ? `${item.episodesCount} Episódios` : 'Anime'),
  },
  primaryActions: [
    {
      id: 'watch-anime',
      label: 'Assistir Episódio',
      iconName: 'PlayCircle',
      isAvailable: () => true,
    },
  ],
  allowedTabs: [
    { id: 'overview', label: 'Visão Geral', isVisible: () => true },
    { id: 'episodes', label: 'Episódios', isVisible: (item) => !!item.episodesCount },
    { id: 'videos', label: 'Aberturas & Trailers', isVisible: (item) => !!(item.videos?.length || item.trailerUrl) },
    { id: 'relations', label: 'Mangá & Franquia', isVisible: (item) => !!(item.similar?.length || item.sourceId) },
    { id: 'sources', label: 'Onde Assistir', isVisible: (item) => !!item.watchProviders?.length },
    { id: 'details', label: 'Ficha Técnica', isVisible: () => true },
  ],
  hasSeasons: true,
  hasEpisodes: true,
  hasChapters: false,
  hasPages: false,
  hasPlaytimeHours: false,
  hasPlatforms: false,
  allowTrailers: true,
};

const BookContract: MediaPresentationContract = {
  type: 'book',
  displayName: 'Livro',
  terminology: {
    primaryActionLabel: 'Ler Livro',
    continueActionLabel: 'Continuar Leitura',
    unitLabel: 'páginas',
    itemPluralLabel: 'Livros',
    progressFormat: (item) => (item.pages ? `${item.pages} págs` : 'Livro'),
  },
  primaryActions: [
    {
      id: 'read-book',
      label: 'Abrir Leitor',
      iconName: 'BookOpen',
      isAvailable: (item) => !!(item.sourceId || item.externalIds?.openLibrary || item.externalIds?.googleBooks),
    },
  ],
  allowedTabs: [
    { id: 'overview', label: 'Visão Geral', isVisible: () => true },
    { id: 'chapters', label: 'Capítulos / Edição', isVisible: (item) => !!item.pages },
    { id: 'sources', label: 'Fontes & Leitura', isVisible: () => true },
    { id: 'details', label: 'Ficha Técnica', isVisible: () => true },
  ],
  hasSeasons: false,
  hasEpisodes: false,
  hasChapters: true,
  hasPages: true,
  hasPlaytimeHours: false,
  hasPlatforms: false,
  allowTrailers: false,
};

const NovelContract: MediaPresentationContract = {
  type: 'novel',
  displayName: 'Novel',
  terminology: {
    primaryActionLabel: 'Ler Novel',
    continueActionLabel: 'Continuar Leitura',
    unitLabel: 'capítulos',
    itemPluralLabel: 'Novels',
    progressFormat: (item) => (item.chaptersCount ? `${item.chaptersCount} Caps` : 'Novel'),
  },
  primaryActions: [
    {
      id: 'read-novel',
      label: 'Ler Capítulo 1',
      iconName: 'BookOpen',
      isAvailable: () => true,
    },
  ],
  allowedTabs: [
    { id: 'overview', label: 'Visão Geral', isVisible: () => true },
    { id: 'chapters', label: 'Capítulos & Volumes', isVisible: () => true },
    { id: 'relations', label: 'Adaptação Anime/Mangá', isVisible: (item) => !!item.similar?.length },
    { id: 'sources', label: 'Fontes de Tradução', isVisible: () => true },
    { id: 'details', label: 'Ficha Técnica', isVisible: () => true },
  ],
  hasSeasons: false,
  hasEpisodes: false,
  hasChapters: true,
  hasPages: true,
  hasPlaytimeHours: false,
  hasPlatforms: false,
  allowTrailers: false,
};

const MangaContract: MediaPresentationContract = {
  type: 'manga',
  displayName: 'Mangá',
  terminology: {
    primaryActionLabel: 'Ler Mangá',
    continueActionLabel: 'Continuar Capítulo',
    unitLabel: 'capítulos',
    itemPluralLabel: 'Mangás',
    progressFormat: (item) => (item.chaptersCount ? `${item.chaptersCount} Caps` : 'Mangá'),
  },
  primaryActions: [
    {
      id: 'read-manga',
      label: 'Ler Capítulo 1',
      iconName: 'BookOpen',
      isAvailable: () => true,
    },
  ],
  allowedTabs: [
    { id: 'overview', label: 'Visão Geral', isVisible: () => true },
    { id: 'chapters', label: 'Lista de Capítulos', isVisible: () => true },
    { id: 'relations', label: 'Adaptação em Anime', isVisible: (item) => !!item.similar?.length },
    { id: 'sources', label: 'Fontes MangaDex', isVisible: () => true },
    { id: 'details', label: 'Ficha Técnica', isVisible: () => true },
  ],
  hasSeasons: false,
  hasEpisodes: false,
  hasChapters: true,
  hasPages: true,
  hasPlaytimeHours: false,
  hasPlatforms: false,
  allowTrailers: false,
};

const ComicContract: MediaPresentationContract = {
  type: 'comic',
  displayName: 'Quadrinho',
  terminology: {
    primaryActionLabel: 'Ler Quadrinho',
    continueActionLabel: 'Continuar Edição',
    unitLabel: 'edições',
    itemPluralLabel: 'Quadrinhos',
    progressFormat: (item) => (item.chaptersCount ? `Edição #${item.chaptersCount}` : 'Quadrinho'),
  },
  primaryActions: [
    {
      id: 'read-comic',
      label: 'Abrir HQ',
      iconName: 'BookOpen',
      isAvailable: () => true,
    },
  ],
  allowedTabs: [
    { id: 'overview', label: 'Visão Geral', isVisible: () => true },
    { id: 'chapters', label: 'Edições & Arcos', isVisible: () => true },
    { id: 'sources', label: 'Fontes de Leitura', isVisible: () => true },
    { id: 'details', label: 'Ficha Técnica', isVisible: () => true },
  ],
  hasSeasons: false,
  hasEpisodes: false,
  hasChapters: true,
  hasPages: true,
  hasPlaytimeHours: false,
  hasPlatforms: false,
  allowTrailers: false,
};

const GameContract: MediaPresentationContract = {
  type: 'game',
  displayName: 'Jogo',
  terminology: {
    primaryActionLabel: 'Ver Lojas',
    continueActionLabel: 'Atualizar Progresso',
    unitLabel: 'horas',
    itemPluralLabel: 'Jogos',
    progressFormat: (item) => (item.platforms?.length ? item.platforms.slice(0, 2).join(', ') : 'Jogo'),
  },
  primaryActions: [
    {
      id: 'view-stores',
      label: 'Ver Lojas & Links',
      iconName: 'Gamepad2',
      isAvailable: (item) => !!(item.platforms?.length || item.dealID || item.price),
    },
  ],
  allowedTabs: [
    { id: 'overview', label: 'Visão Geral', isVisible: () => true },
    { id: 'videos', label: 'Trailers & Gameplay', isVisible: (item) => !!(item.videos?.length || item.trailerUrl) },
    { id: 'platforms', label: 'Plataformas & Requisitos', isVisible: (item) => !!item.platforms?.length },
    { id: 'stores', label: 'Lojas & Preços BRL', isVisible: () => true },
    { id: 'details', label: 'Ficha Técnica', isVisible: () => true },
  ],
  hasSeasons: false,
  hasEpisodes: false,
  hasChapters: false,
  hasPages: false,
  hasPlaytimeHours: true,
  hasPlatforms: true,
  allowTrailers: true,
};

const registry: Record<string, MediaPresentationContract> = {
  movie: MovieContract,
  tv: SeriesContract,
  series: SeriesContract,
  drama: DramaContract,
  anime: AnimeContract,
  book: BookContract,
  novel: NovelContract,
  manga: MangaContract,
  comic: ComicContract,
  game: GameContract,
};

export function getMediaPresentationContract(mediaType: MediaType | string): MediaPresentationContract {
  const normalizedType = String(mediaType || 'movie').toLowerCase();
  return registry[normalizedType] || MovieContract;
}
