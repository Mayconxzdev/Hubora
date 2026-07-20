import React, { useState } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function OptimizedImage({ src, alt, className, width, height }: OptimizedImageProps) {
  const [error, setError] = useState(false);

  // For TMDB images, we can generate a low-quality placeholder URL
  // Original: https://image.tmdb.org/t/p/w500/...
  // LQIP: https://image.tmdb.org/t/p/w92/...
  const getPlaceholderSrc = (url: string) => {
    if (url.includes('image.tmdb.org/t/p/')) {
      return url.replace(/\/w\d+\//, '/w92/');
    }
    return undefined;
  };

  const placeholderSrc = getPlaceholderSrc(src);

  return (
    <div className={`relative overflow-hidden ${className || ''}`} style={{ width, height }}>
      <LazyLoadImage
        src={error ? '/icons/hubora-512.png' : src}
        alt={alt}
        effect="blur"
        placeholderSrc={placeholderSrc}
        className="w-full h-full object-cover"
        wrapperClassName="w-full h-full"
        onError={() => setError(true)}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
