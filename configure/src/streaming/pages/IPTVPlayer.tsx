import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Tv } from 'lucide-react';
import { VideoPlayer } from '../components/VideoPlayer';
import { getIPTVChannels } from '../lib/api';
import type { Channel } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function IPTVPlayer() {
  const { channelId } = useParams<{ channelId: string }>();
  const { token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !token) {
      navigate('/app/login', { replace: true });
    }
  }, [token, authLoading, navigate]);

  useEffect(() => {
    if (!token || !channelId) return;

    const decodedId = decodeURIComponent(channelId);
    setLoading(true);
    setError(null);

    getIPTVChannels()
      .then((data) => {
        const found = data.channels.find((ch) => ch.id === decodedId);
        if (found) {
          setChannel(found);
        } else {
          setError(`Channel not found: ${decodedId}`);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load channel');
      })
      .finally(() => setLoading(false));
  }, [token, channelId]);

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 size={40} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!token) return null;

  if (error || !channel) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 px-4">
        <Tv size={48} className="text-gray-600" />
        <p className="text-emerald-400 text-lg font-semibold text-center">
          {error || 'Channel not found'}
        </p>
        <button
          onClick={() => navigate('/app/iptv')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors duration-200 text-sm"
        >
          Back to Channels
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Video player */}
      <VideoPlayer
        url={channel.url}
        title={channel.name}
        onBack={() => navigate('/app/iptv')}
      />

      {/* Channel info overlay (top-right corner, shows briefly) */}
      <div className="absolute top-16 right-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur rounded-xl px-3 py-2 pointer-events-none">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="w-8 h-8 object-contain rounded"
          />
        ) : (
          <Tv size={20} className="text-gray-400" />
        )}
        <div>
          <p className="text-white text-sm font-semibold leading-tight">{channel.name}</p>
          {channel.group && (
            <p className="text-gray-400 text-xs">{channel.group}</p>
          )}
        </div>
      </div>
    </div>
  );
}
