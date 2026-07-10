import { Search, Menu, X, Star, User, LogOut, SquarePen as PenSquare, FolderOpen, Users, Video, LayoutDashboard } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SocialLinks } from './SocialLinks';
import { NotificationButton } from './NotificationButton';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import { supabase } from '../lib/supabase';

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
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="bg-gray-800 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <SocialLinks />
          <div className="flex items-center space-x-2">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-white text-gray-800 rounded hover:bg-gray-100 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-semibold">{profile?.username || 'User'}</span>
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
                  className="px-3 py-1.5 text-white border border-white/60 hover:bg-white/10 rounded text-sm font-semibold transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-semibold transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-center mb-4">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
              <Star className="w-7 h-7 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-red-600" style={{ fontFamily: 'Impact, sans-serif', letterSpacing: '0.5px' }}>
                CelebUD
              </h1>
              <p className="text-xs text-gray-600 italic">Magazine Online</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <nav className="hidden lg:flex items-center space-x-1 flex-1">
            <Link to="/" onClick={scrollToTop} className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              HOME
            </Link>
            <Link to="/?category=news" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              NEWS
            </Link>
            <Link to="/?category=politics" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              POLITICS
            </Link>
            <Link to="/?category=society" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              SOCIETY
            </Link>
            <Link to="/?category=entertainment" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              ENTERTAINMENT
            </Link>
            <Link to="/fin-advisor" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              FIN-ADVISOR
            </Link>
            <Link to="/?category=business" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              BUSINESS
            </Link>
            <Link to="/?category=lifestyle" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              LIFESTYLE
            </Link>
            <Link to="/?category=videos" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              VIDEOS
            </Link>
          </nav>

          <NotificationButton />

          <div ref={searchRef} className="hidden md:block relative ml-4">
            <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
              <Search className="w-4 h-4 text-gray-500 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search news..."
                aria-label="Search site"
                className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500 w-48"
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
            className="lg:hidden p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="lg:hidden bg-red-600">
          <nav className="px-4 py-4 space-y-1">
            <Link to="/" onClick={(e) => { scrollToTop(e); setIsMenuOpen(false); }} className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              HOME
            </Link>
            <Link to="/?category=news" onClick={() => setIsMenuOpen(false)} className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              NEWS
            </Link>
            <Link to="/?category=politics" onClick={() => setIsMenuOpen(false)} className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              POLITICS
            </Link>
            <Link to="/?category=society" onClick={() => setIsMenuOpen(false)} className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              SOCIETY
            </Link>
            <Link to="/?category=entertainment" onClick={() => setIsMenuOpen(false)} className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              ENTERTAINMENT
            </Link>
            <Link to="/fin-advisor" onClick={() => setIsMenuOpen(false)} className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              FIN-ADVISOR
            </Link>
            <Link to="/?category=business" onClick={() => setIsMenuOpen(false)} className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              BUSINESS
            </Link>
            <Link to="/?category=lifestyle" onClick={() => setIsMenuOpen(false)} className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              LIFESTYLE
            </Link>
            <Link to="/?category=videos" onClick={() => setIsMenuOpen(false)} className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              VIDEOS
            </Link>
            <div className="pt-4">
              <form onSubmit={handleSearch} className="flex items-center bg-white rounded-lg px-4 py-2">
                <Search className="w-4 h-4 text-gray-500 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search news..."
                  className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500 w-full"
                />
              </form>
            </div>

            <div className="pt-4 space-y-2">
              {user ? (
                <>
                  <div className="bg-white rounded-lg px-4 py-3">
                    <p className="text-gray-900 font-semibold">{profile?.username || 'User'}</p>
                  </div>
                  {profile?.is_admin && (
                    <>
                      <Link
                        to="/admin"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center bg-red-700 text-white hover:bg-red-800 font-bold py-3 px-4 rounded-lg"
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Admin Portal
                      </Link>
                      <Link
                        to="/editorial"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center bg-white text-gray-900 hover:bg-gray-100 font-bold py-3 px-4 rounded-lg"
                      >
                        <PenSquare className="w-4 h-4 mr-2" />
                        Write Article
                      </Link>
                      <Link
                        to="/admin/articles"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center bg-white text-gray-900 hover:bg-gray-100 font-bold py-3 px-4 rounded-lg"
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Manage Articles
                      </Link>
                      <Link
                        to="/admin/creators"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center bg-white text-gray-900 hover:bg-gray-100 font-bold py-3 px-4 rounded-lg"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Manage Creators
                      </Link>
                      <Link
                        to="/studio"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center bg-white text-gray-900 hover:bg-gray-100 font-bold py-3 px-4 rounded-lg"
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
                    className="flex items-center w-full bg-white text-gray-900 hover:bg-gray-100 font-bold py-3 px-4 rounded-lg"
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
                    className="w-full bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-lg text-sm"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      openAuthModal('signup');
                      setIsMenuOpen(false);
                    }}
                    className="w-full bg-blue-600 text-white hover:bg-blue-700 font-bold py-3 px-4 rounded-lg text-sm"
                  >
                    Sign Up
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
