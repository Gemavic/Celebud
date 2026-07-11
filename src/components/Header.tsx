import { Search, Menu, X, Star, User, LogOut, SquarePen as PenSquare, FolderOpen, Users, Video, LayoutDashboard } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SocialLinks } from './SocialLinks';
import { NotificationButton } from './NotificationButton';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import { supabase } from '../lib/supabase';

const NAV_LINKS: { label: string; to: string }[] = [
  { label: 'Home', to: '/' },
  { label: 'News', to: '/?category=news' },
  { label: 'Politics', to: '/?category=politics' },
  { label: 'Society', to: '/?category=society' },
  { label: 'Entertainment', to: '/?category=entertainment' },
  { label: 'Fin-Advisor', to: '/fin-advisor' },
  { label: 'Business', to: '/?category=business' },
  { label: 'Lifestyle', to: '/?category=lifestyle' },
  { label: 'Videos', to: '/?category=videos' },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; title: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('media_content')
        .select('id, title')
        .ilike('title', `%${searchQuery.trim()}%`)
        .limit(5);
      if (data && data.length > 0) {
        setSuggestions(data);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <>
      <a
        href="#main-content"
        className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[100] focus:bg-gray-900 focus:text-white focus:px-4 focus:py-3 focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        {/* Utility bar */}
        <div className="bg-gray-900 py-1.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <SocialLinks />
            <div className="flex items-center space-x-2">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 px-3 py-1 bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">{profile?.username || 'User'}</span>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-[60]">
                      {profile?.is_admin && (
                        <>
                          <Link
                            to="/admin"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 font-semibold"
                          >
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Admin Portal
                          </Link>
                          <div className="border-t border-gray-100 my-1" />
                          <Link
                            to="/editorial"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                          >
                            <PenSquare className="w-4 h-4 mr-2" />
                            Write Article
                          </Link>
                          <Link
                            to="/admin/articles"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                          >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Manage Articles
                          </Link>
                          <Link
                            to="/admin/creators"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Manage Creators
                          </Link>
                          <Link
                            to="/studio"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                          >
                            <Video className="w-4 h-4 mr-2" />
                            Content Studio
                          </Link>
                        </>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => openAuthModal('signin')}
                    className="px-3 py-1 text-gray-200 hover:text-white text-xs font-medium transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold transition-colors"
                  >
                    Subscribe Free
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Masthead */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center gap-6">
            <Link to="/" onClick={scrollToTop} className="flex items-center gap-2.5 flex-shrink-0">
              <span className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center shadow-sm">
                <Star className="w-5 h-5 text-white fill-white" />
              </span>
              <span>
                <span className="block text-2xl font-black leading-none tracking-tight text-gray-900">
                  Celeb<em className="not-italic text-red-600">UD</em>
                </span>
                <span className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-0.5">
                  Magazine Online
                </span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center flex-1 min-w-0" aria-label="Primary">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={item.to === '/' ? scrollToTop : undefined}
                  className="px-2.5 xl:px-3 py-2 text-[13px] font-semibold uppercase tracking-wide text-gray-700 border-b-2 border-transparent hover:text-red-600 hover:border-red-600 transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 ml-auto">
              <NotificationButton />

              <div ref={searchRef} className="hidden md:block relative">
                <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-full px-4 py-2">
                  <Search className="w-4 h-4 text-gray-500 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Search stories…"
                    aria-label="Search site"
                    className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500 w-40 xl:w-48"
                  />
                </form>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
                    {suggestions.map((item) => (
                      <Link
                        key={item.id}
                        to={`/article/${item.id}`}
                        onClick={() => { setShowSuggestions(false); setSearchQuery(''); }}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors border-b border-gray-100 last:border-0 line-clamp-1"
                      >
                        {item.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 max-h-[calc(100vh-6.5rem)] overflow-y-auto">
            <nav className="px-4 py-4 space-y-0.5">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={(e) => {
                    if (item.to === '/') scrollToTop(e);
                    setIsMenuOpen(false);
                  }}
                  className="block text-gray-800 hover:bg-red-50 hover:text-red-600 font-semibold py-3 px-4 uppercase text-sm rounded-lg transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4">
                <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-full px-4 py-2.5">
                  <Search className="w-4 h-4 text-gray-500 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search stories…"
                    className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500 w-full"
                  />
                </form>
              </div>

              <div className="pt-4 space-y-2">
                {user ? (
                  <>
                    <div className="bg-gray-100 rounded-lg px-4 py-3">
                      <p className="text-gray-900 font-semibold">{profile?.username || 'User'}</p>
                    </div>
                    {profile?.is_admin && (
                      <>
                        <Link
                          to="/admin"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center bg-red-600 text-white hover:bg-red-700 font-bold py-3 px-4 rounded-lg"
                        >
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Admin Portal
                        </Link>
                        <Link
                          to="/editorial"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center bg-gray-100 text-gray-900 hover:bg-gray-200 font-bold py-3 px-4 rounded-lg"
                        >
                          <PenSquare className="w-4 h-4 mr-2" />
                          Write Article
                        </Link>
                        <Link
                          to="/admin/articles"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center bg-gray-100 text-gray-900 hover:bg-gray-200 font-bold py-3 px-4 rounded-lg"
                        >
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Manage Articles
                        </Link>
                        <Link
                          to="/admin/creators"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center bg-gray-100 text-gray-900 hover:bg-gray-200 font-bold py-3 px-4 rounded-lg"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Manage Creators
                        </Link>
                        <Link
                          to="/studio"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center bg-gray-100 text-gray-900 hover:bg-gray-200 font-bold py-3 px-4 rounded-lg"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Content Studio
                        </Link>
                      </>
                    )}
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center w-full bg-gray-100 text-gray-900 hover:bg-gray-200 font-bold py-3 px-4 rounded-lg"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        openAuthModal('signin');
                        setIsMenuOpen(false);
                      }}
                      className="w-full bg-gray-100 text-gray-900 hover:bg-gray-200 font-bold py-3 px-4 rounded-lg text-sm"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        openAuthModal('signup');
                        setIsMenuOpen(false);
                      }}
                      className="w-full bg-red-600 text-white hover:bg-red-700 font-bold py-3 px-4 rounded-lg text-sm"
                    >
                      Subscribe Free
                    </button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          mode={authMode}
        />
      </header>
    </>
  );
}
