import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  ShieldCheck,
  Search,
  User,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { adminGetUsers, adminUpdateUserConfig, adminResetUserConfig } from '../lib/api';
import type { UserProfile, UserConfig } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface EditState {
  aiostreamsUrl: string;
  iptvM3uUrl: string;
  iptvEpgUrl: string;
  notes: string;
}

function toEditState(config: UserConfig): EditState {
  return {
    aiostreamsUrl: config.aiostreamsUrl || '',
    iptvM3uUrl: config.iptvM3uUrl || '',
    iptvEpgUrl: config.iptvEpgUrl || '',
    notes: config.notes || '',
  };
}

function UserRow({ user, onSaved }: { user: UserProfile; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<EditState>(toEditState(user.config));
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  function hasOverrides(cfg: UserConfig) {
    return !!(cfg.aiostreamsUrl || cfg.iptvM3uUrl || cfg.iptvEpgUrl || cfg.notes);
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      await adminUpdateUserConfig(user.id, {
        aiostreamsUrl: edit.aiostreamsUrl.trim() || null,
        iptvM3uUrl: edit.iptvM3uUrl.trim() || null,
        iptvEpgUrl: edit.iptvEpgUrl.trim() || null,
        notes: edit.notes.trim() || undefined,
      });
      setFeedback({ ok: true, msg: 'Saved' });
      onSaved();
    } catch {
      setFeedback({ ok: false, msg: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    setFeedback(null);
    try {
      await adminResetUserConfig(user.id);
      setEdit({ aiostreamsUrl: '', iptvM3uUrl: '', iptvEpgUrl: '', notes: '' });
      setFeedback({ ok: true, msg: 'Config reset to defaults' });
      onSaved();
    } catch {
      setFeedback({ ok: false, msg: 'Failed to reset' });
    } finally {
      setResetting(false);
    }
  }

  const lastLogin = user.lastLogin
    ? new Date(user.lastLogin).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : 'Never';

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 bg-gray-900/50 hover:bg-gray-900 transition-colors duration-150 text-left"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{user.username}</p>
            {hasOverrides(user.config) && (
              <span className="text-xs bg-emerald-900/60 text-emerald-400 border border-emerald-700/40 rounded px-1.5 py-0.5 font-medium">
                custom config
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs truncate">{user.email || '—'} · Last login: {lastLogin}</p>
        </div>
        {open ? (
          <ChevronUp size={18} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded config form */}
      {open && (
        <div className="px-5 py-5 bg-gray-950 border-t border-gray-800 space-y-4">
          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Notes
            </label>
            <textarea
              value={edit.notes}
              onChange={(e) => setEdit((s) => ({ ...s, notes: e.target.value }))}
              rows={2}
              placeholder="Internal notes about this user..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-sm outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* AIOStreams URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              AIOStreams URL Override
            </label>
            <input
              type="url"
              value={edit.aiostreamsUrl}
              onChange={(e) => setEdit((s) => ({ ...s, aiostreamsUrl: e.target.value }))}
              placeholder="https://aiostreams.example.com/config-hash (leave blank to use default)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-sm outline-none focus:border-emerald-500 font-mono"
            />
            <p className="text-gray-600 text-xs mt-1">
              Overrides the shared AIOSTREAMS_URL for this user only.
            </p>
          </div>

          {/* IPTV M3U */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              IPTV M3U URL Override
            </label>
            <input
              type="url"
              value={edit.iptvM3uUrl}
              onChange={(e) => setEdit((s) => ({ ...s, iptvM3uUrl: e.target.value }))}
              placeholder="http://panel.example.com/get.php?username=… (leave blank to use default)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-sm outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* IPTV EPG */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              IPTV EPG URL Override
            </label>
            <input
              type="url"
              value={edit.iptvEpgUrl}
              onChange={(e) => setEdit((s) => ({ ...s, iptvEpgUrl: e.target.value }))}
              placeholder="http://panel.example.com/xmltv.php?username=… (leave blank to use default)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-sm outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Actions + feedback */}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors duration-150"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 text-gray-300 hover:text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors duration-150 border border-gray-700"
            >
              {resetting ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
              Reset to defaults
            </button>
            {feedback && (
              <span className={`flex items-center gap-1.5 text-sm font-medium ${feedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {feedback.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
                {feedback.msg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { token, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && (!token || !isAdmin)) {
      navigate('/app', { replace: true });
    }
  }, [token, authLoading, isAdmin, navigate]);

  const fetchUsers = useCallback(() => {
    if (!token || !isAdmin) return;
    adminGetUsers()
      .then((data) => setUsers(data.users))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={40} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!token || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="pt-24 pb-12 px-4 sm:px-8 lg:px-16 max-w-screen-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck size={28} className="text-emerald-500" />
          <div>
            <h1 className="text-2xl font-black text-white">Admin Panel</h1>
            <p className="text-gray-400 text-sm">
              {users.length} member{users.length !== 1 ? 's' : ''} · Manage per-user stream and IPTV config
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username or email..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-gray-500 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        {/* User list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <User size={40} className="mx-auto mb-3 text-gray-700" />
            <p className="font-medium">
              {search ? 'No users match your search' : 'No members have logged in yet'}
            </p>
            <p className="text-sm mt-1">Users appear here after their first login.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <UserRow key={u.id} user={u} onSaved={fetchUsers} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
