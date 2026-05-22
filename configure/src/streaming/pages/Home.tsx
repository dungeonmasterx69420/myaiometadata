import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { HeroSlider } from '../components/HeroSlider';
import { ContentRow } from '../components/ContentRow';
import { ContinueWatchingRow } from '../components/ContinueWatchingRow';
import { getCatalogsManifest, getCatalog, getTrending, getProgress, removeProgress } from '../lib/api';
import type { ContentItem, CatalogEntry, ProgressItem } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface CatalogRow {
  catalog: CatalogEntry;
  items: ContentItem[];
  loading: boolean;
  error: boolean;
}

export default function Home() {
  const { token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [heroItems, setHeroItems] = useState<ContentItem[]>([]);
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [initializing, setInitializing] = useState(true);
  const fetchedRef = useRef(false);
  const [continueWatching, setContinueWatching] = useState<ProgressItem[]>([]);

  useEffect(() => {
    if (!authLoading && !token) {
      navigate('/app/login', { replace: true });
    }
  }, [token, authLoading, navigate]);

  const fetchContinueWatching = useCallback(() => {
    if (!token) return;
    getProgress()
      .then((data) => {
        // Show in-progress items (1-89%), most recent first
        const active = data.items.filter((i) => i.progressPercent >= 1 && !i.watched);
        setContinueWatching(active);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetchContinueWatching();
  }, [fetchContinueWatching]);

  async function handleDismiss(item: ProgressItem) {
    setContinueWatching((prev) => prev.filter((i) => i.contentId !== item.contentId || i.type !== item.type));
    try { await removeProgress(item.type, item.contentId); } catch {}
  }

  useEffect(() => {
    if (!token || fetchedRef.current) return;
    fetchedRef.current = true;

    async function loadCatalogs() {
      try {
        const manifest = await getCatalogsManifest();
        const catalogs = manifest.catalogs
          .filter((c) => !c.id.toLowerCase().includes('search'))
          .slice(0, 20);

        if (catalogs.length === 0) {
          await loadFallback();
          return;
        }

        // Initialize rows in order with loading state
        setRows(catalogs.map((c) => ({ catalog: c, items: [], loading: true, error: false })));
        setInitializing(false);

        // Load each row independently
        catalogs.forEach((cat, idx) => {
          getCatalog(cat.type, cat.id)
            .then((data) => {
              setRows((prev) => {
                const next = [...prev];
                next[idx] = { ...next[idx], items: data.results, loading: false };
                // Use first row with backdrop items for hero
                if (idx === 0 || heroItems.length === 0) {
                  const withBackdrop = data.results.filter((r) => r.backdrop);
                  if (withBackdrop.length > 0) {
                    setHeroItems(withBackdrop.slice(0, 5));
                  } else if (data.results.length > 0) {
                    setHeroItems(data.results.slice(0, 5));
                  }
                }
                return next;
              });
            })
            .catch(() => {
              setRows((prev) => {
                const next = [...prev];
                next[idx] = { ...next[idx], loading: false, error: true };
                return next;
              });
            });
        });
      } catch {
        await loadFallback();
      }
    }

    async function loadFallback() {
      setInitializing(false);
      const movieCat: CatalogEntry = { id: '__tmdb_movies', type: 'movie', name: 'Trending Movies', extra: [] };
      const seriesCat: CatalogEntry = { id: '__tmdb_series', type: 'series', name: 'Trending TV Shows', extra: [] };
      setRows([
        { catalog: movieCat, items: [], loading: true, error: false },
        { catalog: seriesCat, items: [], loading: true, error: false },
      ]);

      try {
        const [moviesData, seriesData] = await Promise.all([
          getTrending('movie'),
          getTrending('series'),
        ]);
        setHeroItems(moviesData.results.filter((r) => r.backdrop).slice(0, 5));
        setRows([
          { catalog: movieCat, items: moviesData.results, loading: false, error: false },
          { catalog: seriesCat, items: seriesData.results, loading: false, error: false },
        ]);
      } catch {
        setRows((prev) => prev.map((r) => ({ ...r, loading: false, error: true })));
      }
    }

    loadCatalogs();
  }, [token]);

  if (authLoading || (initializing && rows.length === 0)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={40} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="pt-16">
        <HeroSlider items={heroItems} />
      </div>

      <div className="py-8">
        <ContinueWatchingRow items={continueWatching} onDismiss={handleDismiss} />
        {rows.map((row) => (
          <ContentRow
            key={`${row.catalog.type}:${row.catalog.id}`}
            title={row.catalog.name}
            items={row.items}
            isLoading={row.loading}
          />
        ))}
      </div>
    </div>
  );
}
