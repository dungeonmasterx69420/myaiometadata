import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Star,
  Calendar,
  Clock,
  Youtube,
  ChevronDown,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StreamSelector } from '../components/StreamSelector';
import { VideoPlayer } from '../components/VideoPlayer';
import { getMeta, getAIOMeta, getSeason, getStreams } from '../lib/api';
import type { ContentMeta, Episode, Stream, AIOVideo } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function Detail() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const { token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [meta, setMeta] = useState<ContentMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [aioVideos, setAioVideos] = useState<AIOVideo[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const [showStreamSelector, setShowStreamSelector] = useState(false);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [selectedStreamUrl, setSelectedStreamUrl] = useState<string | null>(null);
  const [playerTitle, setPlayerTitle] = useState('');

  // true when the content came from AIOMetadata (not a plain tmdb: ID)
  const isAIOSource = id ? !id.startsWith('tmdb:') : false;
  // numeric TMDB ID extracted when id is "tmdb:12345"
  const tmdbNumericId = id?.startsWith('tmdb:') ? id.slice(5) : null;

  useEffect(() => {
    if (!authLoading && !token) {
      navigate('/app/login', { replace: true });
    }
  }, [token, authLoading, navigate]);

  useEffect(() => {
    if (!type || !id || !token) return;
    setLoadingMeta(true);
    setMetaError(null);

    const fetcher = isAIOSource
      ? getAIOMeta(type, id)
      : getMeta(type, tmdbNumericId!);

    fetcher
      .then((data) => {
        setMeta(data);
        if (isAIOSource && data.videos && data.videos.length > 0) {
          setAioVideos(data.videos);
          const firstSeason = data.videos[0]?.season ?? 1;
          setSelectedSeason(firstSeason);
        } else if (data.seasons && data.seasons.length > 0) {
          setSelectedSeason(data.seasons[0].number);
        }
      })
      .catch((err) => {
        setMetaError(err instanceof Error ? err.message : 'Failed to load details');
      })
      .finally(() => setLoadingMeta(false));
  }, [type, id, token]);

  // Load TMDB episodes when season changes (only for TMDB-sourced series)
  useEffect(() => {
    if (!meta || meta.type !== 'series' || isAIOSource || !tmdbNumericId) return;
    setLoadingEpisodes(true);
    getSeason(tmdbNumericId, selectedSeason)
      .then((data) => setEpisodes(data.episodes))
      .catch(() => setEpisodes([]))
      .finally(() => setLoadingEpisodes(false));
  }, [selectedSeason, meta, isAIOSource, tmdbNumericId]);

  // Unique seasons from AIO videos
  const aioSeasons = isAIOSource
    ? [...new Set(aioVideos.map((v) => v.season))].filter((s) => s > 0).sort((a, b) => a - b)
    : [];

  const aioEpisodesForSeason = aioVideos.filter((v) => v.season === selectedSeason);

  function buildStreamId(episodeNum?: number): string {
    const base = meta?.stremioId || meta?.imdbId || (meta?.tmdbId ? `tmdb:${meta.tmdbId}` : id!);
    if (meta?.type === 'series' && episodeNum !== undefined) {
      return `${base}:${selectedSeason}:${episodeNum}`;
    }
    return base;
  }

  async function openStreamSelector(streamId: string, title: string) {
    setPlayerTitle(title);
    setStreams([]);
    setShowStreamSelector(true);
    setLoadingStreams(true);
    try {
      const data = await getStreams(type!, streamId);
      setStreams(data.streams);
    } catch {
      setStreams([]);
    } finally {
      setLoadingStreams(false);
    }
  }

  function handleSelectStream(url: string) {
    setSelectedStreamUrl(url);
    setShowStreamSelector(false);
  }

  if (authLoading || loadingMeta) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={40} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!token) return null;

  if (selectedStreamUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <VideoPlayer
          url={selectedStreamUrl}
          title={playerTitle}
          onBack={() => setSelectedStreamUrl(null)}
        />
      </div>
    );
  }

  if (metaError || !meta) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <div className="pt-20 flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <p className="text-emerald-400 text-lg font-semibold">
            {metaError || 'Content not found'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            Go back
          </button>
        </div>
      </div>
    );
  }

  const isSeries = meta.type === 'series';
  const hasSeasons = isAIOSource
    ? aioSeasons.length > 0
    : (meta.seasons && meta.seasons.length > 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      {/* Hero backdrop */}
      <div className="relative w-full" style={{ minHeight: '55vh' }}>
        {meta.backdrop ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${meta.backdrop})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gray-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950/50" />

        <div className="relative z-10 pt-24 pb-10 px-4 sm:px-8 lg:px-16 flex flex-col sm:flex-row gap-8 items-start max-w-screen-xl mx-auto">
          {/* Poster */}
          <div className="flex-shrink-0 w-40 sm:w-52 rounded-xl overflow-hidden shadow-2xl">
            {meta.poster ? (
              <img src={meta.poster} alt={meta.title} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full bg-gray-800 flex items-center justify-center"
                style={{ aspectRatio: '2/3' }}
              >
                <span className="text-gray-500 text-sm text-center px-2">{meta.title}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">{meta.title}</h1>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              {meta.year && (
                <div className="flex items-center gap-1 text-gray-300 text-sm">
                  <Calendar size={14} />
                  {meta.year}
                </div>
              )}
              {meta.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-yellow-400 text-sm font-semibold">
                    {meta.rating.toFixed(1)}
                  </span>
                </div>
              )}
              {meta.runtime && (
                <div className="flex items-center gap-1 text-gray-300 text-sm">
                  <Clock size={14} />
                  {meta.runtime} min
                </div>
              )}
            </div>

            {meta.genres && meta.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {meta.genres.map((g) => (
                  <span
                    key={g}
                    className="text-xs bg-gray-800 border border-gray-600 text-gray-300 rounded-full px-3 py-1"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {meta.overview && (
              <p className="text-gray-300 text-sm leading-relaxed mb-5 max-w-2xl">
                {meta.overview}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {!isSeries && (
                <button
                  onClick={() => openStreamSelector(buildStreamId(), meta.title)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition-all duration-200 text-sm shadow-lg"
                >
                  <Play size={16} className="fill-white" />
                  Play Movie
                </button>
              )}
              {meta.trailer && (
                <a
                  href={meta.trailer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 text-sm"
                >
                  <Youtube size={16} className="text-emerald-500" />
                  Trailer
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Series: Season + Episodes */}
      {isSeries && hasSeasons && (
        <div className="px-4 sm:px-8 lg:px-16 max-w-screen-xl mx-auto pb-8">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="text-xl font-bold text-white">Episodes</h2>

            <div className="relative">
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                className="appearance-none bg-gray-800 border border-gray-600 text-white rounded-xl px-4 py-2 pr-8 text-sm outline-none focus:border-emerald-500 cursor-pointer"
              >
                {isAIOSource
                  ? aioSeasons.map((s) => (
                      <option key={s} value={s}>Season {s}</option>
                    ))
                  : meta.seasons!.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.name || `Season ${s.number}`}
                      </option>
                    ))
                }
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          {loadingEpisodes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="text-emerald-500 animate-spin" />
            </div>
          ) : isAIOSource ? (
            /* AIOMetadata episode list (from meta.videos) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {aioEpisodesForSeason.map((vid) => (
                <button
                  key={vid.id}
                  onClick={() =>
                    openStreamSelector(
                      buildStreamId(vid.episode),
                      `${meta.title} — S${selectedSeason}:E${vid.episode} ${vid.title}`
                    )
                  }
                  className="flex gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-emerald-600/40 rounded-xl p-3 text-left transition-all duration-200"
                >
                  <div className="flex-shrink-0 w-24 rounded-lg overflow-hidden bg-gray-900">
                    {vid.thumbnail ? (
                      <img
                        src={vid.thumbnail}
                        alt={vid.title}
                        className="w-full h-full object-cover"
                        style={{ aspectRatio: '16/9' }}
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full bg-gray-900 flex items-center justify-center"
                        style={{ aspectRatio: '16/9' }}
                      >
                        <Play size={16} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-emerald-500 text-xs font-bold">E{vid.episode}</span>
                      <p className="text-white text-sm font-medium truncate">{vid.title}</p>
                    </div>
                    {vid.overview && (
                      <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                        {vid.overview}
                      </p>
                    )}
                    {vid.released && (
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(vid.released).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* TMDB episode list */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {episodes.map((ep) => (
                <button
                  key={ep.number}
                  onClick={() =>
                    openStreamSelector(
                      buildStreamId(ep.number),
                      `${meta.title} — S${selectedSeason}:E${ep.number} ${ep.name}`
                    )
                  }
                  className="flex gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-emerald-600/40 rounded-xl p-3 text-left transition-all duration-200"
                >
                  <div className="flex-shrink-0 w-24 rounded-lg overflow-hidden bg-gray-900">
                    {ep.still ? (
                      <img
                        src={ep.still}
                        alt={ep.name}
                        className="w-full h-full object-cover"
                        style={{ aspectRatio: '16/9' }}
                      />
                    ) : (
                      <div
                        className="w-full bg-gray-900 flex items-center justify-center"
                        style={{ aspectRatio: '16/9' }}
                      >
                        <Play size={16} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-emerald-500 text-xs font-bold">E{ep.number}</span>
                      <p className="text-white text-sm font-medium truncate">{ep.name}</p>
                    </div>
                    {ep.overview && (
                      <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                        {ep.overview}
                      </p>
                    )}
                    {ep.runtime && (
                      <p className="text-gray-500 text-xs mt-1">{ep.runtime} min</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cast */}
      {meta.cast && meta.cast.length > 0 && (
        <div className="px-4 sm:px-8 lg:px-16 max-w-screen-xl mx-auto pb-12">
          <h2 className="text-xl font-bold text-white mb-4">Cast</h2>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {meta.cast.slice(0, 20).map((member, idx) => (
              <div key={idx} className="flex-shrink-0 w-24 text-center">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-800 mx-auto mb-2">
                  {member.photo ? (
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-700">
                      <span className="text-xl font-bold text-gray-400">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-white text-xs font-medium line-clamp-2 leading-tight">
                  {member.name}
                </p>
                <p className="text-gray-500 text-xs line-clamp-1 mt-0.5">{member.character}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showStreamSelector && (
        <StreamSelector
          streams={streams}
          onSelect={handleSelectStream}
          onClose={() => setShowStreamSelector(false)}
          isLoading={loadingStreams}
        />
      )}
    </div>
  );
}
