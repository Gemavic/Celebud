import { Search, Menu, X, Star } from 'lucide-react';
import { useState } from 'react';
import { SocialLinks } from './SocialLinks';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="bg-gray-800 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
          <SocialLinks />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
              <Star className="w-7 h-7 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-red-600" style={{ fontFamily: 'Impact, sans-serif', letterSpacing: '0.5px' }}>
                CelebUD
              </h1>
              <p className="text-xs text-gray-600 italic">Magazine Online</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <nav className="hidden lg:flex items-center space-x-1 flex-1">
            <a href="#" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              HOME
            </a>
            <a href="#news" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              NEWS
            </a>
            <a href="#politics" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              POLITICS
            </a>
            <a href="#society" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              SOCIETY
            </a>
            <a href="#entertainment" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              ENTERTAINMENT
            </a>
            <a href="#interview" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              INTERVIEW
            </a>
            <a href="#business" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              BUSINESS
            </a>
            <a href="#lifestyle" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              LIFESTYLE
            </a>
            <a href="#videos" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 transition-colors uppercase text-sm">
              VIDEOS
            </a>
          </nav>

          <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-4 py-2 ml-4">
            <Search className="w-4 h-4 text-gray-500 mr-2" />
            <input
              type="text"
              placeholder="Search news..."
              className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500 w-48"
            />
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
            <a href="#" className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              HOME
            </a>
            <a href="#news" className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              NEWS
            </a>
            <a href="#politics" className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              POLITICS
            </a>
            <a href="#society" className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              SOCIETY
            </a>
            <a href="#entertainment" className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              ENTERTAINMENT
            </a>
            <a href="#interview" className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              INTERVIEW
            </a>
            <a href="#business" className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              BUSINESS
            </a>
            <a href="#lifestyle" className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              LIFESTYLE
            </a>
            <a href="#videos" className="block text-white hover:bg-red-700 font-bold py-3 px-4 uppercase text-sm">
              VIDEOS
            </a>
            <div className="pt-4">
              <div className="flex items-center bg-white rounded-lg px-4 py-2">
                <Search className="w-4 h-4 text-gray-500 mr-2" />
                <input
                  type="text"
                  placeholder="Search news..."
                  className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500 w-full"
                />
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
