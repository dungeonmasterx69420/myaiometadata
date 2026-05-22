import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ContentCard } from './ContentCard';
import type { ContentItem } from '../lib/api';

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <div
      className="flex-shrink-0 rounded-lg bg-gray-800 animate-pulse"
      style={{ aspectRatio: '2/3', width: '140px' }}
    />
  );
}

export function ContentRow({ title, items, isLoading = false }: ContentRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  function scroll(direction: 'left' | 'right') {
    if (!rowRef.current) return;
    const amount = rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' });
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg sm:text-xl font-bold text-white mb-3 px-4 sm:px-6 lg:px-8">
        {title}
      </h2>

      <div className="relative group/row">
        {/* Left arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-black/80 to-transparent flex items-center justify-start pl-1 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"
          aria-label="Scroll left"
        >
          <div className="w-8 h-8 rounded-full bg-black/80 border border-white/20 flex items-center justify-center hover:bg-black transition-colors">
            <ChevronLeft size={18} className="text-white" />
          </div>
        </button>

        {/* Right arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-black/80 to-transparent flex items-center justify-end pr-1 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"
          aria-label="Scroll right"
        >
          <div className="w-8 h-8 rounded-full bg-black/80 border border-white/20 flex items-center justify-center hover:bg-black transition-colors">
            <ChevronRight size={18} className="text-white" />
          </div>
        </button>

        {/* Scrollable row */}
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto scroll-smooth px-4 sm:px-6 lg:px-8 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : items.map((item) => (
                <div key={item.tmdbId} style={{ width: '140px', flexShrink: 0 }}>
                  <ContentCard item={item} />
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
