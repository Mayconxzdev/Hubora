import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
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

  useEffect(() => setError(false), [src]);

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

  if (error) {
    return (
      <div
        className={`grid place-items-center bg-[radial-gradient(circle_at_50%_28%,color-mix(in_srgb,var(--hub-brand)_18%,transparent),transparent_52%),var(--hub-surface-2)] px-5 text-center ${className || ''}`}
        style={{ width, height }}
        role="img"
        aria-label={`${alt} — imagem indisponível`}
      >
        <div className="flex flex-col items-center gap-3 text-[var(--hub-subtle)]">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-3)] text-[var(--hub-muted)]">
            <ImageOff size={23} aria-hidden="true" />
          </span>
          <span className="text-[0.65rem] font-black uppercase tracking-[0.16em]">Imagem indisponível</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className || ''}`} style={{ width, height }}>
      <LazyLoadImage
        src={src}
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
