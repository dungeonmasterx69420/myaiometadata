import { X, Play, Loader2 } from 'lucide-react';
import type { Stream } from '../lib/api';

interface StreamSelectorProps {
  streams: Stream[];
  onSelect: (url: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function StreamSelector({ streams, onSelect, onClose, isLoading }: StreamSelectorProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:w-[520px] max-h-[80vh] bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-700 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">Choose Stream</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-lg hover:bg-gray-800"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={36} className="text-red-500 animate-spin" />
              <p className="text-gray-400 text-sm">Loading streams...</p>
            </div>
          ) : streams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center">
                <Play size={24} className="text-gray-500" />
              </div>
              <p className="text-gray-400 font-medium">No streams found</p>
              <p className="text-gray-500 text-sm text-center max-w-xs">
                No streaming sources are available for this title right now.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {streams.map((stream, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelect(stream.url)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-red-600/50 transition-all duration-200 text-left group"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-600/20 border border-red-600/30 flex items-center justify-center group-hover:bg-red-600/30 transition-colors">
                    <Play size={16} className="text-red-400 fill-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">
                      {stream.name || `Stream ${idx + 1}`}
                    </p>
                    {stream.title && stream.title !== stream.name && (
                      <p className="text-gray-400 text-xs truncate mt-0.5">{stream.title}</p>
                    )}
                    {stream.behaviorHints?.bingeGroup && (
                      <span className="inline-block mt-1 text-xs bg-gray-700 text-gray-300 rounded px-1.5 py-0.5">
                        {stream.behaviorHints.bingeGroup}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
