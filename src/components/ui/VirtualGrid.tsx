import React from 'react';
import { MediaItem } from '@/types';
import { MediaCard } from '@/components/ui/MediaCard';

export function VirtualGrid({ items }: { items: MediaItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:gap-x-4 lg:grid-cols-4 2xl:grid-cols-6">
      {items.map((item, index) => <MediaCard key={`${item.mediaType}-${item.id}-${index}`} item={item} priority={index < 8} />)}
    </div>
  );
}
