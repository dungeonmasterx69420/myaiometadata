import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ContentItem } from '../lib/api';

interface HeroSliderProps {
  items: ContentItem[];
}

export function HeroSlider({ items }: HeroSliderProps) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const total = Math.min(items.length, 5);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (isPaused || total === 0) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [isPaused, next, total]);

  if (total === 0) {
    return (
      <div className="w-full bg-gray-900 flex items-center justify-center" style={{ minHeight: '50vh' }}>
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const item = items[current];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ minHeight: '50vh', height: 'clamp(360px, 60vh, 700px)' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Backdrop */}
      {item.backdrop ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${item.backdrop})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gray-800" />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full px-6 sm:px-10 lg:px-16 pb-16 sm:pb-20">
        <div className="max-w-xl">
          {/* Type badge */}
          <span className="inline-block text-xs font-bold tracking-widest text-red-500 uppercase mb-2">
            {item.type === 'series' ? 'TV Show' : 'Movie'}
          </span>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-3 drop-shadow-lg">
            {item.title}
          </h1>

          {/* Meta row */}
          <div className="flex items-center gap-3 mb-3">
            {item.year && (
              <span className="text-gray-300 text-sm font-medium">{item.year}</span>
            )}
            {item.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star size={13} className="text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 text-sm font-semibold">{item.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Overview */}
          {item.overview && (
            <p className="text-gray-200 text-sm sm:text-base leading-relaxed line-clamp-3 mb-5 max-w-lg">
              {item.overview}
            </p>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/app/watch/${item.type}/${item.tmdbId}`)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-lg transition-all duration-200 text-sm shadow-lg hover:shadow-red-900/50"
            >
              <Play size={16} className="fill-white" />
              Play Now
            </button>
            <button
              onClick={() => navigate(`/app/watch/${item.type}/${item.tmdbId}`)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white font-bold px-5 py-2.5 rounded-lg transition-all duration-200 text-sm border border-white/30"
            >
              <Info size={16} />
              More Info
            </button>
          </div>
        </div>
      </div>

      {/* Prev/Next arrows */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-all duration-200"
            aria-label="Previous"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-all duration-200"
            aria-label="Next"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {total > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-6 h-2 bg-red-500'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
