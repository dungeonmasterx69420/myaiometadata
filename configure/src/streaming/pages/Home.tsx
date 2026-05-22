import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { HeroSlider } from '../components/HeroSlider';
import { ContentRow } from '../components/ContentRow';
import { getTrending } from '../lib/api';
import type { ContentItem } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [trendingMovies, setTrendingMovies] = useState<ContentItem[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<ContentItem[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !token) {
      navigate('/app/login', { replace: true });
    }
  }, [token, authLoading, navigate]);

  useEffect(() => {
    if (!token) return;

    setLoadingMovies(true);
    getTrending('movie')
      .then((data) => setTrendingMovies(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load movies'))
      .finally(() => setLoadingMovies(false));

    setLoadingSeries(true);
    getTrending('series')
      .then((data) => setTrendingSeries(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load TV shows'))
      .finally(() => setLoadingSeries(false));
  }, [token]);

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

      {/* Hero slider */}
      <div className="pt-16">
        {loadingMovies && trendingMovies.length === 0 ? (
          <div
            className="w-full bg-gray-900 flex items-center justify-center"
            style={{ minHeight: '50vh' }}
          >
            <Loader2 size={40} className="text-red-500 animate-spin" />
          </div>
        ) : (
          <HeroSlider items={trendingMovies.slice(0, 5)} />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-3">
          <div className="bg-red-900/30 border border-red-700/40 rounded-lg px-4 py-2.5 text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Content rows */}
      <div className="py-8">
        <ContentRow
          title="Trending Movies"
          items={trendingMovies}
          isLoading={loadingMovies}
        />
        <ContentRow
          title="Trending TV Shows"
          items={trendingSeries}
          isLoading={loadingSeries}
        />
      </div>
    </div>
  );
}
