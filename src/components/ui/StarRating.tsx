import { Star, StarHalf } from 'lucide-react';
import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  onChange: (rating: number) => void;
}

export function StarRating({ rating, onChange }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div 
      className="flex items-center gap-1"
      onMouseLeave={() => setHoverRating(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = displayRating >= star;
        const isHalf = displayRating >= star - 0.5 && displayRating < star;
        
        return (
          <div key={star} className="relative cursor-pointer w-9 h-9 transition-all duration-300 hover:scale-125">
            <div 
              className="absolute left-0 top-0 w-1/2 h-full z-10"
              onMouseEnter={() => setHoverRating(star - 0.5)}
              onClick={() => onChange(star - 0.5)}
            />
            <div 
              className="absolute right-0 top-0 w-1/2 h-full z-10"
              onMouseEnter={() => setHoverRating(star)}
              onClick={() => onChange(star)}
            />
            
            <div className={`absolute inset-0 transition-all duration-300 ${displayRating >= star - 0.5 ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' : 'text-slate-700'}`}>
              {isHalf ? (
                <div className="relative">
                  <Star size={36} className="text-slate-700 absolute" />
                  <StarHalf size={36} fill="currentColor" className="text-yellow-400 absolute" />
                </div>
              ) : (
                <Star size={36} fill={isFull ? 'currentColor' : 'none'} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
