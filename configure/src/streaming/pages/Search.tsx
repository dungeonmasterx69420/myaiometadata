import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Loader2, Film, Tv, LayoutGrid } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { ContentCard } from '../components/ContentCard';
import { searchContent } from '../lib/api';
import type { ContentItem } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type FilterTab = 'all' | 'movie' | 'series';

const TABS: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', icon: <LayoutGrid size={15} /> },
  { id: 'movie', label: 'Movies', icon: <Film size={15} /> },
  { id: 'series', label: 'TV Shows', icon: <Tv size={15} /> },
];

export default function Search() {
  const { token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQ = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as FilterTab) || 'all';

  const [query, setQuery] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<FilterTab>(initialType);
  const [results, setResults] = useState<ContentItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !token) {
      navigate('/app/login', { replace: true });
    }
  }, [token, authLoading, navigate]);

  // Auto-focus
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const typeParam = activeTab !== 'all' ? activeTab : undefined;
        const data = await searchContent(query.trim(), typeParam);
        setResults(data.results);
        setHasSearched(true);
        // Update URL
        const params: Record<string, string> = { q: query.trim() };
        if (activeTab !== 'all') params.type = activeTab;
        setSearchParams(params, { replace: true });
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredResults = results.filter((item) => {
    if (activeTab === 'all') return true;
    return item.type === activeTab;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={40} className="text-red-500 animate-spin" />
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="pt-20 pb-10 px-4 sm:px-6 lg:px-8 max-w-screen-xl mx-auto">
        {/* Search input */}
        <div className="relative mb-6 max-w-2xl mx-auto">
          <SearchIcon
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, TV shows..."
            className="w-full bg-gray-800 border border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl pl-12 pr-5 py-3.5 text-white placeholder-gray-500 outline-none transition-all duration-200 text-base"
          />
          {isSearching && (
            <Loader2
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 animate-spin"
            />
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 max-w-2xl mx-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {!query.trim() && (
          <div className="text-center py-20">
            <SearchIcon size={52} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">Search for anything</p>
            <p className="text-gray-600 text-sm mt-1">Find movies and TV shows</p>
          </div>
        )}

        {hasSearched && !isSearching && filteredResults.length === 0 && query.trim() && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <SearchIcon size={28} className="text-gray-600" />
            </div>
            <p className="text-gray-400 text-lg font-medium">No results found</p>
            <p className="text-gray-600 text-sm mt-1">
              Try different keywords or change the filter
            </p>
          </div>
        )}

        {filteredResults.length > 0 && (
          <>
            <p className="text-gray-400 text-sm mb-4">
              {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} for{' '}
              <span className="text-white font-medium">"{query}"</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredResults.map((item) => (
                <ContentCard key={`${item.type}-${item.tmdbId}`} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
