import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Heart } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { IPTVChannelCard } from '../components/IPTVChannelCard';
import { getIPTVChannels, getIPTVFavorites, saveIPTVFavorites } from '../lib/api';
import type { Channel } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function IPTVChannels() {
  const { token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('All');

  useEffect(() => {
    if (!authLoading && !token) {
      navigate('/app/login', { replace: true });
    }
  }, [token, authLoading, navigate]);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    Promise.all([getIPTVChannels(), getIPTVFavorites()])
      .then(([channelData, favData]) => {
        setChannels(channelData.channels);
        setGroups(['All', ...channelData.groups]);
        setFavorites(favData.favorites);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load channels');
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Filter channels
  const filtered = channels.filter((ch) => {
    const matchSearch =
      !search.trim() ||
      ch.name.toLowerCase().includes(search.toLowerCase()) ||
      ch.group.toLowerCase().includes(search.toLowerCase());
    const matchGroup = activeGroup === 'All' || ch.group === activeGroup;
    return matchSearch && matchGroup;
  });

  const favoriteChannels = filtered.filter((ch) => favorites.includes(ch.id));
  const nonFavoriteChannels = filtered.filter((ch) => !favorites.includes(ch.id));

  const toggleFavorite = useCallback(
    async (channelId: string) => {
      const newFavs = favorites.includes(channelId)
        ? favorites.filter((id) => id !== channelId)
        : [...favorites, channelId];
      setFavorites(newFavs);
      try {
        await saveIPTVFavorites(newFavs);
      } catch {
        // revert
        setFavorites(favorites);
      }
    },
    [favorites]
  );

  function handleChannelClick(channel: Channel) {
    navigate(`/app/iptv/watch/${encodeURIComponent(channel.id)}`);
  }

  if (authLoading || loading) {
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

      <div className="pt-20 px-4 sm:px-6 lg:px-8 max-w-screen-xl mx-auto pb-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">IPTV Channels</h1>
          <p className="text-gray-400 text-sm">{channels.length} channels available</p>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels..."
            className="w-full bg-gray-800 border border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 outline-none transition-all duration-200 text-sm"
          />
        </div>

        {/* Group filter tabs */}
        {groups.length > 1 && (
          <div
            className="flex gap-2 overflow-x-auto pb-2 mb-6"
            style={{ scrollbarWidth: 'none' }}
          >
            {groups.map((group) => (
              <button
                key={group}
                onClick={() => setActiveGroup(group)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeGroup === group
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/40 rounded-lg px-4 py-2.5 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Favorites section */}
        {favoriteChannels.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Heart size={16} className="text-red-500 fill-red-500" />
              <h2 className="text-lg font-bold text-white">Favorites</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {favoriteChannels.map((ch) => (
                <IPTVChannelCard
                  key={ch.id}
                  channel={ch}
                  isFavorite
                  onToggleFavorite={() => toggleFavorite(ch.id)}
                  onClick={() => handleChannelClick(ch)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All channels */}
        {nonFavoriteChannels.length > 0 ? (
          <div>
            {favoriteChannels.length > 0 && (
              <h2 className="text-lg font-bold text-white mb-3">All Channels</h2>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {nonFavoriteChannels.map((ch) => (
                <IPTVChannelCard
                  key={ch.id}
                  channel={ch}
                  isFavorite={false}
                  onToggleFavorite={() => toggleFavorite(ch.id)}
                  onClick={() => handleChannelClick(ch)}
                />
              ))}
            </div>
          </div>
        ) : (
          filtered.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <Search size={28} className="text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium">No channels found</p>
              <p className="text-gray-600 text-sm mt-1">Try a different search or group filter</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
