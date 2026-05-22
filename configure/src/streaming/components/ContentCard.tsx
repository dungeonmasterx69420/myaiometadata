import { useNavigate } from 'react-router-dom';
import { Star, Check } from 'lucide-react';
import type { ContentItem } from '../lib/api';

interface ContentCardProps {
  item: ContentItem;
  onClick?: () => void;
  progressPercent?: number;
  watched?: boolean;
}

export function ContentCard({ item, onClick, progressPercent, watched }: ContentCardProps) {
  const navigate = useNavigate();

  function handleClick() {
    if (onClick) { onClick(); return; }
    if (item.stremioId) {
      navigate(`/app/watch/${item.type}/${encodeURIComponent(item.stremioId)}`);
    } else if (item.tmdbId) {
      navigate(`/app/watch/${item.type}/tmdb:${item.tmdbId}`);
    }
  }

  const showProgress = !watched && progressPercent !== undefined && progressPercent > 0;

  return (
    <div
      onClick={handleClick}
      className="relative flex-shrink-0 cursor-pointer group rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:z-10 hover:shadow-2xl"
      style={{ aspectRatio: '2/3' }}
    >
      {/* Poster image */}
      {item.poster ? (
        <img src={item.poster} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center p-3">
          <span className="text-gray-400 text-xs text-center font-medium leading-tight line-clamp-4">{item.title}</span>
        </div>
      )}

      {/* Progress bar at bottom */}
      {showProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      )}

      {/* Watched checkmark badge */}
      {watched && (
        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-emerald-600/90 backdrop-blur flex items-center justify-center shadow-lg">
          <Check size={12} className="text-white" />
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        <p className="text-white font-semibold text-sm leading-tight line-clamp-2 mb-1">{item.title}</p>
        <div className="flex items-center gap-2">
          {item.year && <span className="text-gray-300 text-xs">{item.year}</span>}
          {item.rating > 0 && (
            <div className="flex items-center gap-0.5">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              <span className="text-yellow-400 text-xs font-medium">{item.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Rating badge (always visible, hidden on hover) */}
      {item.rating > 0 && !watched && (
        <div className="absolute top-2 right-2 bg-black/70 rounded px-1.5 py-0.5 flex items-center gap-0.5 group-hover:opacity-0 transition-opacity duration-300">
          <Star size={9} className="text-yellow-400 fill-yellow-400" />
          <span className="text-yellow-400 text-xs font-medium">{item.rating.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
