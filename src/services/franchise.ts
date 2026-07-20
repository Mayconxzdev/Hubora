import { api } from '@/services/api';
import type { MediaItem } from '@/types';
import { normalizeText } from '@/services/identity';

export interface FranchiseOrderItem {
  title: string;
  type: 'movie' | 'tv' | 'anime' | 'manga' | 'special' | 'ova';
  searchQuery?: string;
  year?: number;
  reason: string;
}

export interface FranchiseOrder {
  franchiseName: string;
  description: string;
  items: FranchiseOrderItem[];
}

function titleMatch(item: MediaItem, query: string): boolean {
  const words = normalizeText(query).split(' ').filter((word) => word.length >= 3);
  const title = normalizeText(`${item.title} ${item.originalTitle || ''}`);
  return words.length === 0 || words.some((word) => title.includes(word));
}

function supportedType(item: MediaItem): FranchiseOrderItem['type'] | null {
  if (item.mediaType === 'movie' || item.mediaType === 'tv' || item.mediaType === 'anime' || item.mediaType === 'manga') return item.mediaType;
  return null;
}

export async function buildFranchiseOrder(query: string): Promise<FranchiseOrder | null> {
  const results = await api.searchMulti(query, 1);
  const unique = Array.from(new Map(results
    .filter((item) => supportedType(item) && titleMatch(item, query))
    .map((item) => [`${item.mediaType}:${normalizeText(item.title)}:${item.releaseDate || ''}`, item])).values());

  const ordered = unique
    .sort((a, b) => {
      const dateA = a.releaseDate ? Date.parse(a.releaseDate) : Number.MAX_SAFE_INTEGER;
      const dateB = b.releaseDate ? Date.parse(b.releaseDate) : Number.MAX_SAFE_INTEGER;
      return dateA - dateB || a.title.localeCompare(b.title);
    })
    .slice(0, 20);

  if (!ordered.length) return null;

  return {
    franchiseName: query.trim(),
    description: 'Ordem por lançamento montada com os títulos retornados pelos catálogos oficiais. Obras sem data ficam ao final; confira adaptações e especiais antes de marcar a lista como definitiva.',
    items: ordered.map((item, index) => ({
      title: item.title,
      type: supportedType(item)!,
      searchQuery: item.title,
      year: item.releaseDate ? Number(item.releaseDate.slice(0, 4)) || undefined : undefined,
      reason: item.releaseDate
        ? `${index + 1}º na ordem por lançamento, com data catalogada em ${item.releaseDate}.`
        : 'Sem data completa no provedor; posicionado após os itens datados.',
    })),
  };
}
