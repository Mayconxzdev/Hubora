import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

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
      <div className="w-full aspect-[2/3] bg-slate-800 rounded-2xl animate-pulse" />
    );
  }

  if (!media) {
    return (
      <div className="w-full aspect-[2/3] bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 text-xs text-center p-2">
        {title}
      </div>
    );
  }

  return (
    <Link to={`/details/${media.id}`} className="group block w-full relative">
      <div className="aspect-[2/3] rounded-2xl overflow-hidden mb-2 bg-slate-900 shadow-lg group-hover:shadow-cyan-500/30 transition-all duration-500 border border-slate-800 group-hover:border-cyan-500/50 relative">
        {media.posterPath ? (
          <>
            <img 
              src={media.posterPath} 
              alt={media.title} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
              referrerPolicy="no-referrer" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4">
              <span className="text-white font-medium text-sm text-center bg-cyan-500/80 backdrop-blur-md py-1.5 px-3 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                Ver Detalhes
              </span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4 bg-gradient-to-br from-slate-800 to-slate-900">
            <span className="mb-2 opacity-50 text-2xl">🎬</span>
            <span className="font-medium">{media.title}</span>
            <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
              <span className="text-cyan-400 font-medium text-sm bg-slate-900/80 py-1 px-3 rounded-full">
                Ver Detalhes
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
