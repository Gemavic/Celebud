import { Search, Menu, X, Star, User, LogOut, PenSquare } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SocialLinks } from './SocialLinks';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

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
      setIsMenuOpen(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="bg-gray-800 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
          <SocialLinks />
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
            <Link to="/?category=interview" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              INTERVIEW
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

          <form onSubmit={handleSearch} className="hidden md:flex items-center bg-gray-100 rounded-lg px-4 py-2 ml-4">
            <Search className="w-4 h-4 text-gray-500 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news..."
              className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500 w-48"
            />
          </form>

          <div className="hidden md:flex items-center ml-4 space-x-2">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{profile?.username || 'User'}</span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-10">
                    {profile?.is_admin && (
                      <Link
                        to="/editorial"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        <PenSquare className="w-4 h-4 mr-2" />
                        Write Article
                      </Link>
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
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Sign Up
                </button>
              </>
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
            <Link to="/?category=interview" onClick={() => setIsMenuOpen(false)} className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              INTERVIEW
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
          </nav>
        </div>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
      />
    </header>
  );
}
