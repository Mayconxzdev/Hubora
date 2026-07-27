import { api } from '@/services/api';

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
  source: string;
  items: FranchiseOrderItem[];
}

export async function buildFranchiseOrder(query: string): Promise<FranchiseOrder | null> {
  const collection = await api.getMovieCollectionByQuery(query);
  if (!collection) return null;

  return {
    franchiseName: collection.name,
    source: 'Coleção cinematográfica relacionada explicitamente pelo TMDB',
    description: collection.overview || 'Lista de filmes que pertencem à mesma coleção no TMDB. A ordem é por lançamento; séries, livros, animes e adaptações fora dessa coleção não são incluídos.',
    items: collection.items.map((item, index) => ({
      title: item.title,
      type: 'movie',
      searchQuery: item.title,
      year: item.releaseDate ? Number(item.releaseDate.slice(0, 4)) || undefined : undefined,
      reason: item.releaseDate
        ? `${index + 1}º filme da coleção, ordenado pela data de lançamento catalogada em ${item.releaseDate}.`
        : 'Filme pertencente à coleção, sem data completa no catálogo; posicionado após os datados.',
    })),
  };
}
