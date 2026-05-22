import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ArrowLeft,
  Loader2,
  SkipForward,
  X,
} from 'lucide-react';

interface NextEpisodeInfo {
  title: string;
  onPlay: () => void;
}

interface VideoPlayerProps {
  url: string;
  title?: string;
  onBack?: () => void;
  resumeAt?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  nextEpisode?: NextEpisodeInfo;
}

function formatTime(secs: number): string {
  if (!isFinite(secs) || isNaN(secs)) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoPlayer({ url, title, onBack, resumeAt, onProgress, onEnded, nextEpisode }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastProgressSaveRef = useRef(0);

  // Use refs for callbacks to avoid stale closures in event handlers
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  onProgressRef.current = onProgress;
  onEndedRef.current = onEnded;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Setup HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    setError(null);
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setShowNextOverlay(false);
    lastProgressSaveRef.current = 0;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const applyResume = (vid: HTMLVideoElement) => {
      if (resumeAt && resumeAt > 5) vid.currentTime = resumeAt;
    };

    const isHLS = url.includes('.m3u8') || url.includes('hls');

    if (Hls.isSupported() && isHLS) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 90 });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        applyResume(video);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setError(`Stream error: ${data.details}`);
          setIsLoading(false);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        applyResume(video);
        video.play().catch(() => {});
      }, { once: true });
    } else {
      video.src = url;
      video.addEventListener('loadedmetadata', () => applyResume(video), { once: true });
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [url]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const onCanPlay = () => setIsLoading(false);
    const onDurationChange = () => setDuration(video.duration);
    const onVolumeChange = () => { setVolume(video.volume); setIsMuted(video.muted); };
    const onError = () => { setError('Failed to load video stream.'); setIsLoading(false); };

    const onTimeUpdate = () => {
      const t = video.currentTime;
      const d = video.duration;
      setCurrentTime(t);
      // Debounced progress callback every 10s
      if (onProgressRef.current && d > 0) {
        const now = Date.now();
        if (now - lastProgressSaveRef.current >= 10000) {
          lastProgressSaveRef.current = now;
          onProgressRef.current(t, d);
        }
      }
    };

    const onVideoEnded = () => {
      setIsPlaying(false);
      onEndedRef.current?.();
      if (nextEpisode) setShowNextOverlay(true);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('error', onError);
    video.addEventListener('ended', onVideoEnded);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('error', onError);
      video.removeEventListener('ended', onVideoEnded);
    };
  }, [nextEpisode]);

  // Show next episode overlay 30s before end
  useEffect(() => {
    if (!nextEpisode || duration === 0) return;
    const timeLeft = duration - currentTime;
    if (timeLeft > 0 && timeLeft <= 30 && !showNextOverlay) {
      setShowNextOverlay(true);
      setCountdown(10);
    }
  }, [currentTime, duration, nextEpisode, showNextOverlay]);

  // Countdown timer for auto-next
  useEffect(() => {
    if (!showNextOverlay || !nextEpisode) return;
    countdownTimerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          nextEpisode.onPlay();
          setShowNextOverlay(false);
          return 10;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [showNextOverlay, nextEpisode]);

  const dismissNextOverlay = useCallback(() => {
    setShowNextOverlay(false);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {}); else video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const v = parseFloat(e.target.value);
    video.volume = v;
    video.muted = v === 0;
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) video.currentTime = parseFloat(e.target.value);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) container.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black flex items-center justify-center select-none"
      onMouseMove={resetControlsTimer}
      onMouseEnter={resetControlsTimer}
      onClick={togglePlay}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      <video ref={videoRef} className="w-full h-full object-contain" playsInline />

      {/* Loading spinner */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 size={52} className="text-emerald-500 animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center px-6">
            <p className="text-emerald-400 text-lg font-semibold mb-2">Playback Error</p>
            <p className="text-gray-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Next episode overlay */}
      {showNextOverlay && nextEpisode && (
        <div
          className="absolute bottom-24 right-4 z-30 bg-gray-900/95 border border-gray-700 rounded-xl p-4 w-72 shadow-2xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Next Episode</p>
            <button onClick={dismissNextOverlay} className="text-gray-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
          <p className="text-white font-semibold text-sm mb-3 line-clamp-2">{nextEpisode.title}</p>
          <button
            onClick={() => { nextEpisode.onPlay(); setShowNextOverlay(false); }}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <SkipForward size={15} />
            Play Now ({countdown}s)
          </button>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 pt-4 bg-gradient-to-b from-black/70 to-transparent">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white hover:text-emerald-400 transition-colors duration-200 text-sm font-medium"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          )}
          {title && <span className="text-white font-semibold text-sm truncate">{title}</span>}
        </div>

        {/* Bottom controls */}
        <div className="px-4 pb-4 bg-gradient-to-t from-black/80 to-transparent" onClick={(e) => e.stopPropagation()}>
          {/* Seek bar */}
          <div className="mb-3">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              step={0.1}
              onChange={handleSeek}
              className="w-full h-1 appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 accent-emerald-500"
              style={{ background: `linear-gradient(to right, #10b981 ${progress}%, rgba(255,255,255,0.3) ${progress}%)` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button onClick={togglePlay} className="text-white hover:text-emerald-400 transition-colors duration-200" aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={22} /> : <Play size={22} className="fill-white" />}
              </button>

              {/* Skip forward 10s */}
              <button
                onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.currentTime + 10, v.duration); }}
                className="text-white hover:text-emerald-400 transition-colors duration-200"
                aria-label="Skip 10 seconds"
              >
                <SkipForward size={18} />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-white hover:text-emerald-400 transition-colors duration-200" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Time */}
              <span className="text-white text-xs tabular-nums">
                {formatTime(currentTime)}{duration > 0 && ` / ${formatTime(duration)}`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Next episode button */}
              {nextEpisode && (
                <button
                  onClick={() => nextEpisode.onPlay()}
                  className="flex items-center gap-1.5 text-gray-300 hover:text-emerald-400 transition-colors duration-200 text-xs font-medium"
                  aria-label="Next episode"
                >
                  <SkipForward size={16} />
                  <span className="hidden sm:inline">Next</span>
                </button>
              )}

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="text-white hover:text-emerald-400 transition-colors duration-200" aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
