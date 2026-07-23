import {
  BookOpen,
  Clapperboard,
  Drama,
  Gamepad2,
  Layers3,
  PanelsTopLeft,
  ScrollText,
  Tv,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryNavigationItem {
  id: 'movies' | 'series' | 'doramas' | 'anime' | 'manga' | 'comics' | 'books' | 'novels' | 'games';
  label: string;
  path: string;
  icon: LucideIcon;
  iconKey: string;
  tone: 'orange' | 'blue' | 'pink' | 'violet' | 'green' | 'cyan' | 'yellow' | 'indigo';
  keywords: string;
}

export const CATEGORY_NAVIGATION = [
  { id: 'movies', label: 'Filmes', path: '/movies', icon: Clapperboard, iconKey: 'clapperboard', tone: 'orange', keywords: 'cinema filme' },
  { id: 'series', label: 'Séries', path: '/series', icon: Tv, iconKey: 'tv', tone: 'blue', keywords: 'episódio temporada série' },
  { id: 'doramas', label: 'Doramas', path: '/doramas', icon: Drama, iconKey: 'drama', tone: 'pink', keywords: 'dorama coreano japonês chinês' },
  { id: 'anime', label: 'Animes', path: '/anime', icon: Zap, iconKey: 'zap', tone: 'violet', keywords: 'anime episódio temporada' },
  { id: 'manga', label: 'Mangás', path: '/manga', icon: Layers3, iconKey: 'layers', tone: 'green', keywords: 'manga capítulo volume' },
  { id: 'comics', label: 'Quadrinhos', path: '/comics', icon: PanelsTopLeft, iconKey: 'panels', tone: 'cyan', keywords: 'comic hq edição' },
  { id: 'books', label: 'Livros', path: '/books', icon: BookOpen, iconKey: 'book-open', tone: 'yellow', keywords: 'livro leitura epub pdf' },
  { id: 'novels', label: 'Novels', path: '/novels', icon: ScrollText, iconKey: 'scroll-text', tone: 'pink', keywords: 'novel light novel webnovel capítulos leitura' },
  { id: 'games', label: 'Jogos', path: '/games', icon: Gamepad2, iconKey: 'gamepad', tone: 'indigo', keywords: 'game jogar backlog plataforma' },
] as const satisfies readonly CategoryNavigationItem[];
