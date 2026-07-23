import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Clapperboard } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Skeleton } from '@/components/ui/Skeleton';

interface FranchiseItemCardProps {
  title: string;
  type: 'movie' | 'tv' | 'anime' | 'manga' | 'special' | 'ova';
  searchQuery?: string;
  year?: number;
}

export function FranchiseItemCard({ title, type, searchQuery, year }: FranchiseItemCardProps) {
  const { data: media, isLoading } = useQuery({
    queryKey: ['media-details', searchQuery || title, type, year],
    queryFn: async () => {
      // Use searchByTitle for more accurate and direct fetching
      // Map 'special' and 'ova' to 'anime' or 'movie' depending on context, or just try 'anime' first
      let searchType = type;
      if (type === 'special' || type === 'ova') {
        searchType = 'anime'; // Most specials/ovas are anime in this context
      }
      
      const result = await api.searchByTitle(searchQuery || title, searchType, year);
      
      // If searchByTitle fails, fallback to searchMulti as a last resort
      if (!result) {
        const results = await api.searchMulti(searchQuery || title);
        const normalizedTitle = (searchQuery || title).toLowerCase();
        const match = results.find(item => 
          item.title.toLowerCase().includes(normalizedTitle) && 
          (item.mediaType === type || (item.mediaType === 'tv' && type === 'anime') || (item.mediaType === 'movie' && type === 'movie')) &&
          (!year || (item.releaseDate && item.releaseDate.startsWith(year.toString())))
        );
        return match || results[0] || null;
      }
      
      return result;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  if (isLoading) {
    return (
      <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
    );
  }

  if (!media) {
    return (
      <div className="hub-panel grid aspect-[2/3] w-full place-items-center p-4 text-center">
        <div><Clapperboard className="mx-auto text-[var(--hub-subtle)]" size={24} aria-hidden="true"/><span className="mt-3 block text-xs font-bold text-[var(--hub-muted)]">{title}</span><small className="mt-1 block text-[var(--hub-subtle)]">Dados indisponíveis</small></div>
      </div>
    );
  }

  return (
    <Link to={`/details/${media.id}`} className="group relative block w-full" aria-label={`Ver detalhes de ${media.title}`}>
      <div className="relative mb-2 aspect-[2/3] overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] shadow-[var(--hub-shadow-card)] transition duration-200 group-hover:-translate-y-1 group-hover:border-[var(--hub-border-strong)]">
        {media.posterPath ? (
          <>
            <OptimizedImage
              src={media.posterPath} 
              alt={media.title} 
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/88 via-black/42 to-transparent p-4 pt-12 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="block rounded-full bg-white px-3 py-2 text-center text-xs font-black text-black">
                Ver detalhes
              </span>
            </div>
          </>
        ) : (
          <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_28%,var(--hub-brand-soft),transparent_55%),var(--hub-surface-2)] p-4 text-center">
            <div><Clapperboard className="mx-auto text-[var(--hub-subtle)]" size={28} aria-hidden="true"/><span className="mt-3 block text-xs font-bold text-[var(--hub-muted)]">{media.title}</span><small className="mt-1 block text-[var(--hub-subtle)]">Capa indisponível</small></div>
          </div>
        )}
      </div>
    </Link>
  );
}
