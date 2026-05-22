import { Heart, Tv } from 'lucide-react';
import type { Channel } from '../lib/api';

interface IPTVChannelCardProps {
  channel: Channel;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

export function IPTVChannelCard({
  channel,
  isFavorite,
  onToggleFavorite,
  onClick,
}: IPTVChannelCardProps) {
  return (
    <div
      className="relative flex flex-col items-center bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-red-600/50 rounded-xl p-4 cursor-pointer transition-all duration-200 group"
      onClick={onClick}
    >
      {/* Favorite toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={`absolute top-2.5 right-2.5 p-1 rounded-full transition-all duration-200 z-10 ${
          isFavorite
            ? 'text-red-500 bg-red-500/10'
            : 'text-gray-500 hover:text-red-400 bg-transparent hover:bg-red-500/10'
        }`}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart size={15} className={isFavorite ? 'fill-red-500' : ''} />
      </button>

      {/* Logo */}
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center mb-3 flex-shrink-0">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const icon = document.createElement('div');
                icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="text-gray-500" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>';
                parent.appendChild(icon);
              }
            }}
          />
        ) : (
          <Tv size={28} className="text-gray-500" />
        )}
      </div>

      {/* Name */}
      <p className="text-white font-medium text-sm text-center line-clamp-2 leading-tight mb-2">
        {channel.name}
      </p>

      {/* Group badge */}
      {channel.group && (
        <span className="text-xs bg-gray-700 group-hover:bg-gray-600 text-gray-400 rounded-full px-2.5 py-0.5 truncate max-w-full transition-colors">
          {channel.group}
        </span>
      )}
    </div>
  );
}
