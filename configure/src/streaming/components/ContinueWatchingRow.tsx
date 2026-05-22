import { useNavigate } from 'react-router-dom';
import { X, Play, Tv, Film } from 'lucide-react';
import type { ProgressItem } from '../lib/api';

interface ContinueWatchingRowProps {
  items: ProgressItem[];
  onDismiss: (item: ProgressItem) => void;
}

export function ContinueWatchingRow({ items, onDismiss }: ContinueWatchingRowProps) {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-white mb-3 px-6 sm:px-10 lg:px-16">Continue Watching</h2>
      <div
        className="flex gap-3 overflow-x-auto px-6 sm:px-10 lg:px-16 pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item) => (
          <div
            key={`${item.type}:${item.contentId}`}
            className="flex-shrink-0 relative group cursor-pointer"
            style={{ width: '160px' }}
            onClick={() => navigate(`/app/watch/${item.type}/${encodeURIComponent(item.contentId)}`)}
          >
            {/* Poster */}
            <div className="relative rounded-lg overflow-hidden bg-gray-800" style={{ aspectRatio: '2/3' }}>
              {item.poster ? (
                <img src={item.poster} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {item.type === 'series'
                    ? <Tv size={28} className="text-gray-600" />
                    : <Film size={28} className="text-gray-600" />
                  }
                </div>
              )}

              {/* Play overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-600/90 flex items-center justify-center">
                  <Play size={20} className="fill-white text-white ml-1" />
                </div>
              </div>

              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.min(item.progressPercent, 100)}%` }}
                />
              </div>

              {/* Dismiss button */}
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss(item); }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 z-10"
                aria-label="Remove from continue watching"
              >
                <X size={11} className="text-white" />
              </button>
            </div>

            {/* Label */}
            <div className="mt-1.5 px-0.5">
              <p className="text-white text-xs font-semibold truncate">{item.title}</p>
              {item.season !== undefined && item.episode !== undefined ? (
                <p className="text-gray-500 text-xs">S{item.season}E{item.episode}</p>
              ) : (
                <p className="text-gray-500 text-xs">{Math.round(item.progressPercent)}% watched</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
