import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, ChevronDown, Tv, Film, Home, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/app/login');
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/app" className="text-2xl font-black text-emerald-600 tracking-widest select-none">
              DungeonCast
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/app"
                className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                <Home size={15} />
                Home
              </Link>
              <Link
                to="/app/search?type=movie"
                className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                <Film size={15} />
                Movies
              </Link>
              <Link
                to="/app/search?type=series"
                className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                <Tv size={15} />
                TV Shows
              </Link>
              <Link
                to="/app/iptv"
                className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                <Tv size={15} />
                IPTV
              </Link>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Search icon */}
            <Link
              to="/app/search"
              className="p-2 text-gray-300 hover:text-white transition-colors duration-200"
              aria-label="Search"
            >
              <Search size={20} />
            </Link>

            {/* User menu (desktop) */}
            {user && (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200 text-sm font-medium"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-24 truncate">{user.username}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-700">
                        <p className="text-sm font-medium text-white truncate">{user.username}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-150"
                      >
                        <LogOut size={15} />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden p-2 text-gray-300 hover:text-white transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/95">
          <div className="px-4 py-3 space-y-1">
            <Link
              to="/app"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
            >
              <Home size={16} />
              Home
            </Link>
            <Link
              to="/app/search?type=movie"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
            >
              <Film size={16} />
              Movies
            </Link>
            <Link
              to="/app/search?type=series"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
            >
              <Tv size={16} />
              TV Shows
            </Link>
            <Link
              to="/app/iptv"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
            >
              <Tv size={16} />
              IPTV
            </Link>

            {user && (
              <div className="pt-2 border-t border-gray-700 mt-2">
                <div className="flex items-center gap-2 px-3 py-2">
                  <User size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-400 truncate">{user.username}</span>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
