import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Category, MediaContentWithRelations } from '../lib/database.types';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { CategoryFilter } from '../components/CategoryFilter';
import { MediaCard } from '../components/MediaCard';
import { TrendingSection } from '../components/TrendingSection';
import { LiveNewsIndicator } from '../components/LiveNewsIndicator';
import { AdBanner } from '../components/AdBanner';
import { SubscriptionPlans } from '../components/SubscriptionPlans';
import { NewsletterSignup } from '../components/NewsletterSignup';
import { Loader2 } from 'lucide-react';

export function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredContent, setFeaturedContent] = useState<MediaContentWithRelations[]>([]);
  const [trendingContent, setTrendingContent] = useState<MediaContentWithRelations[]>([]);
  const [allContent, setAllContent] = useState<MediaContentWithRelations[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [categoriesRes, featuredRes, trendingRes, allContentRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase
          .from('media_content')
          .select('*, categories(*), authors(*)')
          .eq('is_featured', true)
          .order('views_count', { ascending: false })
          .limit(3),
        supabase
          .from('media_content')
          .select('*, categories(*), authors(*)')
          .eq('is_trending', true)
          .order('views_count', { ascending: false })
          .limit(4),
        supabase
          .from('media_content')
          .select('*, categories(*), authors(*)')
          .order('published_at', { ascending: false })
          .limit(20),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (featuredRes.data) setFeaturedContent(featuredRes.data as MediaContentWithRelations[]);
      if (trendingRes.data) setTrendingContent(trendingRes.data as MediaContentWithRelations[]);
      if (allContentRes.data) setAllContent(allContentRes.data as MediaContentWithRelations[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredContent = selectedCategory
    ? allContent.filter((content) => content.categories?.slug === selectedCategory)
    : allContent;

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

      <main className="pt-44">
        <Hero featuredContent={featuredContent} />

        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <TrendingSection trendingContent={trendingContent} />

        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-12">
          <AdBanner placement="header" />
        </div>

        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {selectedCategory
                  ? `${categories.find((c) => c.slug === selectedCategory)?.name} Content`
                  : 'Latest Content'}
              </h2>
              <p className="text-gray-600 mt-1">Discover the freshest stories and updates</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredContent.map((content) => (
              <MediaCard key={content.id} content={content} />
            ))}
          </div>

          {filteredContent.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No content found in this category.</p>
            </div>
          )}
        </section>

        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
          <NewsletterSignup />
        </div>

        <SubscriptionPlans />

        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
          <AdBanner placement="footer" />
        </div>
      </main>

      <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 via-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <h3 className="text-2xl font-bold">CelebUD</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Your premier destination for entertainment news, celebrity interviews, and exclusive content.
                Stay connected with the stories that matter.
              </p>
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
                    Contact
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
