import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Category, MediaContentWithRelations } from '../lib/database.types';
import { Header } from '../components/Header';
import { CategoryFilter } from '../components/CategoryFilter';
import { MediaCard } from '../components/MediaCard';
import { LiveNewsIndicator } from '../components/LiveNewsIndicator';
import { EditorialSection } from '../components/EditorialSection';
import { SubscriptionPlans } from '../components/SubscriptionPlans';
import { NewsletterSignup } from '../components/NewsletterSignup';
import { Pagination } from '../components/Pagination';
import { Loader2 } from 'lucide-react';

function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allContent, setAllContent] = useState<MediaContentWithRelations[]>([]);
  const [searchResults, setSearchResults] = useState<MediaContentWithRelations[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 12;

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');

    if (categoryParam) {
      setSelectedCategory(categoryParam);
      setSearchQuery(null);
    } else if (searchParam) {
      setSearchQuery(searchParam);
      setSelectedCategory(null);
      performSearch(searchParam);
    } else {
      setSelectedCategory(null);
      setSearchQuery(null);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [categoriesRes, allContentRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase
          .from('media_content')
          .select('*, categories(*), authors(*)')
          .order('published_at', { ascending: false })
          .limit(100),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (allContentRes.data) {
        const uniqueContent = allContentRes.data.filter(
          (content, index, self) =>
            index === self.findIndex((c) => c.id === content.id)
        );
        setAllContent(uniqueContent as MediaContentWithRelations[]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function performSearch(query: string) {
    try {
      const { data, error } = await supabase
        .from('media_content')
        .select('*, categories(*), authors(*)')
        .textSearch('fts', query, {
          type: 'websearch',
          config: 'english'
        })
        .order('published_at', { ascending: false })
        .limit(50);

      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('media_content')
          .select('*, categories(*), authors(*)')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .order('published_at', { ascending: false })
          .limit(50);

        if (fallbackError) throw fallbackError;
        setSearchResults(fallbackData as MediaContentWithRelations[]);
      } else {
        setSearchResults(data as MediaContentWithRelations[]);
      }
    } catch (error) {
      console.error('Error performing search:', error);
      setSearchResults([]);
    }
  }

  const filteredContent = searchQuery
    ? searchResults
    : selectedCategory
    ? allContent.filter((content) => content.categories?.slug === selectedCategory)
    : allContent;

  const totalPages = Math.ceil(filteredContent.length / articlesPerPage);
  const startIndex = (currentPage - 1) * articlesPerPage;
  const endIndex = startIndex + articlesPerPage;
  const displayContent = filteredContent.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading CelebUD...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Header />
      <LiveNewsIndicator onNewsUpdated={loadData} />

      <main className="pt-24" role="main">
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <EditorialSection />

        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16" aria-label="Latest articles">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {searchQuery
                  ? `Search Results for "${searchQuery}"`
                  : selectedCategory
                  ? `${categories.find((c) => c.slug === selectedCategory)?.name}`
                  : 'Latest Stories'}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {searchQuery
                  ? `Found ${displayContent.length} ${displayContent.length === 1 ? 'result' : 'results'}`
                  : 'Fresh updates and trending news'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayContent.map((content) => (
              <MediaCard key={content.id} content={content} />
            ))}
          </div>

          {displayContent.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">
                {searchQuery
                  ? `No results found for "${searchQuery}". Try different keywords.`
                  : 'No content found in this category.'}
              </p>
            </div>
          )}

          {filteredContent.length > articlesPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </section>

        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
          <NewsletterSignup />
        </div>

        <SubscriptionPlans />
      </main>

      <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 via-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <h3 className="text-2xl font-bold">CelebUD</h3>
              </div>
              <p className="text-gray-400 mb-4 text-sm">
                Your premier destination for entertainment news, celebrity interviews, and exclusive content.
                Stay connected with the stories that matter.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Contact Us</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="flex flex-col">
                  <span className="text-white text-sm mb-1">Address:</span>
                  <span className="text-sm">300C, Lawrence Ave.</span>
                  <span className="text-sm">Scarborough, M1R 3A3</span>
                  <span className="text-sm">ON, Canada</span>
                </li>
                <li className="flex flex-col mt-3">
                  <span className="text-white text-sm mb-1">SMS/WhatsApp:</span>
                  <a href="tel:+14377888011" className="text-sm hover:text-white transition-colors">
                    +1 (437) 788-8011
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Advertise
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Categories</h4>
              <ul className="space-y-2 text-gray-400">
                {categories.slice(0, 4).map((category) => (
                  <li key={category.id}>
                    <a href="#" className="hover:text-white transition-colors">
                      {category.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2024 CelebUD. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export { HomePage };
