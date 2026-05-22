import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Tv, Info } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { getIPTVChannels, getEPG } from '../lib/api';
import type { Channel } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Program {
  start: number;
  stop: number;
  title: string;
  desc: string;
  icon: string;
}

type EPGMap = Record<string, Program[]>;

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isNow(start: number, stop: number): boolean {
  const now = Date.now();
  return start <= now && stop > now;
}

export default function EPGGuide() {
  const { token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [epg, setEpg] = useState<EPGMap>({});
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [epgLoading, setEpgLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && !token) navigate('/app/login', { replace: true });
  }, [token, authLoading, navigate]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getIPTVChannels()
      .then((data) => {
        setChannels(data.channels);
        if (data.channels.length > 0) setSelectedChannel(data.channels[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setEpgLoading(true);
    getEPG()
      .then((data) => setEpg(data as EPGMap))
      .catch(() => setEpg({}))
      .finally(() => setEpgLoading(false));
  }, [token]);

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const currentPrograms: Program[] = selectedChannel
    ? (epg[selectedChannel.epgId] || epg[selectedChannel.id] || [])
    : [];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={40} className="text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <div className="flex flex-1 pt-16" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Channel list sidebar */}
        <div className="w-56 sm:w-64 shrink-0 border-r border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm outline-none focus:border-red-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredChannels.map((ch) => {
              const programs = epg[ch.epgId] || epg[ch.id] || [];
              const live = programs.find((p) => isNow(p.start, p.stop));
              const isActive = selectedChannel?.id === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => { setSelectedChannel(ch); setSelectedProgram(null); }}
                  className={`w-full text-left flex items-center gap-3 px-3 py-3 border-b border-gray-800/50 transition-colors ${
                    isActive ? 'bg-red-900/30 border-l-2 border-l-red-500' : 'hover:bg-gray-800/50'
                  }`}
                >
                  {ch.logo ? (
                    <img src={ch.logo} alt={ch.name} className="w-8 h-8 rounded object-contain bg-gray-800 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center shrink-0">
                      <Tv size={14} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                      {ch.name}
                    </p>
                    {live && (
                      <p className="text-xs text-gray-500 truncate">{live.title}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Program guide */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Channel header */}
          {selectedChannel && (
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900/50">
              {selectedChannel.logo ? (
                <img src={selectedChannel.logo} alt={selectedChannel.name} className="w-10 h-10 rounded object-contain bg-gray-800" />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center">
                  <Tv size={18} className="text-gray-400" />
                </div>
              )}
              <div>
                <h2 className="text-white font-bold">{selectedChannel.name}</h2>
                {selectedChannel.group && <p className="text-gray-400 text-xs">{selectedChannel.group}</p>}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            {epgLoading && (
              <div className="flex justify-center py-8">
                <Loader2 size={28} className="text-red-500 animate-spin" />
              </div>
            )}

            {!epgLoading && currentPrograms.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                <Info size={40} className="mx-auto mb-3 text-gray-700" />
                <p className="font-medium">No guide data available</p>
                <p className="text-sm mt-1">EPG data may not be configured or available for this channel.</p>
              </div>
            )}

            {!epgLoading && currentPrograms.map((prog, i) => {
              const live = isNow(prog.start, prog.stop);
              const isSelected = selectedProgram === prog;
              return (
                <div key={i}>
                  <button
                    onClick={() => setSelectedProgram(isSelected ? null : prog)}
                    className={`w-full text-left flex items-start gap-4 rounded-xl p-4 mb-2 transition-all border ${
                      live
                        ? 'bg-red-900/20 border-red-700/40'
                        : isSelected
                        ? 'bg-gray-800 border-gray-600'
                        : 'border-transparent hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="shrink-0 text-right w-20">
                      <p className={`text-sm font-mono ${live ? 'text-red-400' : 'text-gray-400'}`}>
                        {prog.start ? formatTime(prog.start) : ''}
                      </p>
                      {live && (
                        <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">LIVE</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${live ? 'text-white' : 'text-gray-200'}`}>
                        {prog.title}
                      </p>
                      {prog.stop && prog.start && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          Until {formatTime(prog.stop)} · {Math.round((prog.stop - prog.start) / 60000)} min
                        </p>
                      )}
                    </div>
                  </button>

                  {isSelected && prog.desc && (
                    <div className="ml-24 mb-4 bg-gray-800/60 rounded-lg p-3 text-gray-300 text-sm leading-relaxed border border-gray-700/50">
                      {prog.icon && (
                        <img src={prog.icon} alt="" className="float-right w-16 h-12 object-cover rounded ml-3 mb-1" />
                      )}
                      {prog.desc}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
