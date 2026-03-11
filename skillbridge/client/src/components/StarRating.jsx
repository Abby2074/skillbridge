import { Star } from 'lucide-react';

export default function StarRating({ rating = 0, onRate, size = 'md', count = 5 }) {
  const sizeMap = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-6 w-6' };
  const iconSize = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= Math.round(rating);

        return (
          <button
            key={i}
            type="button"
            onClick={() => onRate?.(starValue)}
            disabled={!onRate}
            className={`${onRate ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              className={`${iconSize} ${filled ? 'fill-accent text-accent' : 'fill-none text-gray-300'}`}
            />
          </button>
        );
      })}
    </div>
  );
}
