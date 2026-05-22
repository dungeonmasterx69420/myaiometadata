import { useEffect, useState, useCallback, useRef } from 'react';
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
import { getMeta, getAIOMeta, getSeason, getStreams, getItemProgress, saveProgress, removeProgress } from '../lib/api';
import type { ContentMeta, Episode, Stream, AIOVideo } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface PlayingEpisode {
  season: number;
  episode: number;
  streamId: string;
  title: string;
}

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

  const [resumeAt, setResumeAt] = useState<number>(0);
  const [playingEpisode, setPlayingEpisode] = useState<PlayingEpisode | null>(null);

  const isAIOSource = id ? !id.startsWith('tmdb:') : false;
  const tmdbNumericId = id?.startsWith('tmdb:') ? id.slice(5) : null;

  // Keep refs for progress saving (avoids stale closures in callbacks)
  const metaRef = useRef(meta);
  const playingEpisodeRef = useRef(playingEpisode);
  const playerTitleRef = useRef(playerTitle);
  metaRef.current = meta;
  playingEpisodeRef.current = playingEpisode;
  playerTitleRef.current = playerTitle;

  useEffect(() => {
    if (!authLoading && !token) navigate('/app/login', { replace: true });
  }, [token, authLoading, navigate]);

  useEffect(() => {
    if (!type || !id || !token) return;
    setLoadingMeta(true);
    setMetaError(null);

    const fetcher = isAIOSource ? getAIOMeta(type, id) : getMeta(type, tmdbNumericId!);

    fetcher
      .then(async (data) => {
        setMeta(data);
        if (isAIOSource && data.videos && data.videos.length > 0) {
          setAioVideos(data.videos);
          const firstSeason = data.videos[0]?.season ?? 1;
          setSelectedSeason(firstSeason);
        } else if (data.seasons && data.seasons.length > 0) {
          setSelectedSeason(data.seasons[0].number);
        }
        // Load saved progress for resume
        try {
          const prog = await getItemProgress(type, id);
          if (prog && !prog.watched && prog.currentTime > 5) {
            setResumeAt(prog.currentTime);
          }
        } catch {}
      })
      .catch((err) => setMetaError(err instanceof Error ? err.message : 'Failed to load details'))
      .finally(() => setLoadingMeta(false));
  }, [type, id, token]);

  // Load TMDB episodes when season changes
  useEffect(() => {
    if (!meta || meta.type !== 'series' || isAIOSource || !tmdbNumericId) return;
    setLoadingEpisodes(true);
    getSeason(tmdbNumericId, selectedSeason)
      .then((data) => setEpisodes(data.episodes))
      .catch(() => setEpisodes([]))
      .finally(() => setLoadingEpisodes(false));
  }, [selectedSeason, meta, isAIOSource, tmdbNumericId]);

  const aioSeasons = isAIOSource
    ? [...new Set(aioVideos.map((v) => v.season))].filter((s) => s > 0).sort((a, b) => a - b)
    : [];

  const aioEpisodesForSeason = aioVideos.filter((v) => v.season === selectedSeason);

  function contentId(): string {
    return meta?.stremioId || meta?.imdbId || (meta?.tmdbId ? `tmdb:${meta.tmdbId}` : id!);
  }

  function buildStreamId(season: number, episodeNum?: number): string {
    const base = contentId();
    if (meta?.type === 'series' && episodeNum !== undefined) return `${base}:${season}:${episodeNum}`;
    return base;
  }

  async function openStreamSelector(streamId: string, title: string, ep?: PlayingEpisode) {
    setPlayerTitle(title);
    setStreams([]);
    setShowStreamSelector(true);
    setLoadingStreams(true);
    if (ep) setPlayingEpisode(ep);
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

  // Save progress callback — fires every ~10s from VideoPlayer
  const handleProgress = useCallback(async (currentTime: number, duration: number) => {
    const m = metaRef.current;
    if (!m || !type || !id) return;
    const cid = m.stremioId || m.imdbId || (m.tmdbId ? `tmdb:${m.tmdbId}` : id);
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const ep = playingEpisodeRef.current;
    try {
      await saveProgress(type, cid, {
        title: m.title,
        poster: m.poster,
        backdrop: m.backdrop,
        currentTime,
        duration,
        progressPercent,
        watched: progressPercent >= 90,
        ...(ep ? { season: ep.season, episode: ep.episode, episodeTitle: ep.title, streamId: ep.streamId } : {}),
      });
    } catch {}
  }, [type, id]);

  // Mark as fully watched when video ends
  const handleEnded = useCallback(async () => {
    const m = metaRef.current;
    if (!m || !type || !id) return;
    const cid = m.stremioId || m.imdbId || (m.tmdbId ? `tmdb:${m.tmdbId}` : id);
    try {
      await saveProgress(type, cid, { progressPercent: 100, watched: true });
    } catch {}
  }, [type, id]);

  // Calculate the next episode from the one currently playing
  function getNextEpisode(): { streamId: string; title: string; ep: PlayingEpisode } | null {
    if (!meta || meta.type !== 'series' || !playingEpisode) return null;

    if (isAIOSource) {
      const idx = aioVideos.findIndex(
        (v) => v.season === playingEpisode.season && v.episode === playingEpisode.episode
      );
      if (idx < 0 || idx >= aioVideos.length - 1) return null;
      const next = aioVideos[idx + 1];
      const sid = `${contentId()}:${next.season}:${next.episode}`;
      const title = `S${next.season}E${next.episode}: ${next.title}`;
      return { streamId: sid, title, ep: { season: next.season, episode: next.episode, streamId: sid, title } };
    } else {
      const idx = episodes.findIndex((e) => e.number === playingEpisode.episode);
      if (idx >= 0 && idx < episodes.length - 1) {
        const next = episodes[idx + 1];
        const base = meta.imdbId || (meta.tmdbId ? `tmdb:${meta.tmdbId}` : id!);
        const sid = `${base}:${playingEpisode.season}:${next.number}`;
        const title = `S${playingEpisode.season}E${next.number}: ${next.name}`;
        return { streamId: sid, title, ep: { season: playingEpisode.season, episode: next.number, streamId: sid, title } };
      }
      return null;
    }
  }

  async function playNextEpisode() {
    const next = getNextEpisode();
    if (!next) return;
    setPlayingEpisode(next.ep);
    setPlayerTitle(next.title);
    setResumeAt(0);
    try {
      const data = await getStreams(type!, next.streamId);
      if (data.streams.length > 0) setSelectedStreamUrl(data.streams[0].url);
      else { setStreams(data.streams); setShowStreamSelector(true); }
    } catch {}
  }

  const nextEpisodeInfo = getNextEpisode();

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
          onBack={() => { setSelectedStreamUrl(null); setResumeAt(0); }}
          resumeAt={resumeAt}
          onProgress={handleProgress}
          onEnded={handleEnded}
          nextEpisode={nextEpisodeInfo ? { title: nextEpisodeInfo.title, onPlay: playNextEpisode } : undefined}
        />
      </div>
    );
  }

  if (metaError || !meta) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <div className="pt-20 flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <p className="text-emerald-400 text-lg font-semibold">{metaError || 'Content not found'}</p>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />Go back
          </button>
        </div>
      </div>
    );
  }

  const isSeries = meta.type === 'series';
  const hasSeasons = isAIOSource ? aioSeasons.length > 0 : (meta.seasons && meta.seasons.length > 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      {/* Hero backdrop */}
      <div className="relative w-full" style={{ minHeight: '55vh' }}>
        {meta.backdrop ? (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${meta.backdrop})` }} />
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
              <div className="w-full bg-gray-800 flex items-center justify-center" style={{ aspectRatio: '2/3' }}>
                <span className="text-gray-500 text-sm text-center px-2">{meta.title}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">{meta.title}</h1>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              {meta.year && <div className="flex items-center gap-1 text-gray-300 text-sm"><Calendar size={14} />{meta.year}</div>}
              {meta.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-yellow-400 text-sm font-semibold">{meta.rating.toFixed(1)}</span>
                </div>
              )}
              {meta.runtime && <div className="flex items-center gap-1 text-gray-300 text-sm"><Clock size={14} />{meta.runtime} min</div>}
            </div>

            {meta.genres && meta.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {meta.genres.map((g) => (
                  <span key={g} className="text-xs bg-gray-800 border border-gray-600 text-gray-300 rounded-full px-3 py-1">{g}</span>
                ))}
              </div>
            )}

            {meta.overview && (
              <p className="text-gray-300 text-sm leading-relaxed mb-5 max-w-2xl">{meta.overview}</p>
            )}

            <div className="flex flex-wrap gap-3">
              {!isSeries && (
                <button
                  onClick={() => {
                    setResumeAt(0);
                    openStreamSelector(buildStreamId(1), meta.title);
                  }}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition-all duration-200 text-sm shadow-lg"
                >
                  <Play size={16} className="fill-white" />
                  {resumeAt > 5 ? 'Resume' : 'Play Movie'}
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
                  ? aioSeasons.map((s) => <option key={s} value={s}>Season {s}</option>)
                  : meta.seasons!.map((s) => <option key={s.number} value={s.number}>{s.name || `Season ${s.number}`}</option>)
                }
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {loadingEpisodes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="text-emerald-500 animate-spin" />
            </div>
          ) : isAIOSource ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {aioEpisodesForSeason.map((vid) => {
                const sid = buildStreamId(vid.season, vid.episode);
                const epTitle = `S${vid.season}E${vid.episode}: ${vid.title}`;
                return (
                  <button
                    key={vid.id}
                    onClick={() => openStreamSelector(sid, epTitle, { season: vid.season, episode: vid.episode, streamId: sid, title: epTitle })}
                    className="flex gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-emerald-600/40 rounded-xl p-3 text-left transition-all duration-200"
                  >
                    <div className="flex-shrink-0 w-24 rounded-lg overflow-hidden bg-gray-900">
                      {vid.thumbnail ? (
                        <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" style={{ aspectRatio: '16/9' }} loading="lazy" />
                      ) : (
                        <div className="w-full bg-gray-900 flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
                          <Play size={16} className="text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-emerald-500 text-xs font-bold">E{vid.episode}</span>
                        <p className="text-white text-sm font-medium truncate">{vid.title}</p>
                      </div>
                      {vid.overview && <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">{vid.overview}</p>}
                      {vid.released && <p className="text-gray-500 text-xs mt-1">{new Date(vid.released).toLocaleDateString()}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {episodes.map((ep) => {
                const sid = buildStreamId(selectedSeason, ep.number);
                const epTitle = `${meta.title} — S${selectedSeason}:E${ep.number} ${ep.name}`;
                return (
                  <button
                    key={ep.number}
                    onClick={() => openStreamSelector(sid, epTitle, { season: selectedSeason, episode: ep.number, streamId: sid, title: epTitle })}
                    className="flex gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-emerald-600/40 rounded-xl p-3 text-left transition-all duration-200"
                  >
                    <div className="flex-shrink-0 w-24 rounded-lg overflow-hidden bg-gray-900">
                      {ep.still ? (
                        <img src={ep.still} alt={ep.name} className="w-full h-full object-cover" style={{ aspectRatio: '16/9' }} />
                      ) : (
                        <div className="w-full bg-gray-900 flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
                          <Play size={16} className="text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-emerald-500 text-xs font-bold">E{ep.number}</span>
                        <p className="text-white text-sm font-medium truncate">{ep.name}</p>
                      </div>
                      {ep.overview && <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">{ep.overview}</p>}
                      {ep.runtime && <p className="text-gray-500 text-xs mt-1">{ep.runtime} min</p>}
                    </div>
                  </button>
                );
              })}
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
                    <img src={member.photo} alt={member.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-700">
                      <span className="text-xl font-bold text-gray-400">{member.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <p className="text-white text-xs font-medium line-clamp-2 leading-tight">{member.name}</p>
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
