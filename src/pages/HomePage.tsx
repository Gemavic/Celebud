import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { CategoryFilter } from '../components/CategoryFilter';
import { MediaCard } from '../components/MediaCard';
import { TrendingSection } from '../components/TrendingSection';
import { LiveNewsIndicator } from '../components/LiveNewsIndicator';
import { EditorialSection } from '../components/EditorialSection';
import { SubscriptionPlans } from '../components/SubscriptionPlans';
import { NewsletterSignup } from '../components/NewsletterSignup';
import { Pagination } from '../components/Pagination';
import { AdBanner } from '../components/AdBanner';
import { GoogleAd } from '../components/GoogleAd';
import { LiveEvents } from '../components/LiveEvents';
import { CreatorRevShare } from '../components/CreatorRevShare';
import { ContentLicensing } from '../components/ContentLicensing';
import { Loader2 } from 'lucide-react';
import { useFeaturedArticles, useTrendingArticles, useArticles } from '../hooks/useArticles';
import { useCategories, useSearchArticles } from '../hooks/useCategories';

function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryParam = searchParams.get('category');
  const searchParam = searchParams.get('search');
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const currentPage = pageParam > 0 ? pageParam : 1;
  const articlesPerPage = 12;

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: featuredContent = [], isLoading: featuredLoading } = useFeaturedArticles(3);
  const { data: trendingContent = [], isLoading: trendingLoading } = useTrendingArticles(6);

  const {
    data: articlesData,
    isLoading: articlesLoading,
  } = useArticles({
    category: categoryParam || undefined,
    page: currentPage,
    pageSize: articlesPerPage,
  });

  const { data: searchResults = [], isLoading: searchLoading } = useSearchArticles(searchParam || '');

  const loading = categoriesLoading || featuredLoading || trendingLoading || articlesLoading;

  const displayContent = useMemo(() => {
    if (searchParam) {
      return searchResults;
    }
    return articlesData?.articles || [];
  }, [searchParam, searchResults, articlesData]);

  const totalCount = useMemo(() => {
    if (searchParam) {
      return searchResults.length;
    }
    return articlesData?.totalCount || 0;
  }, [searchParam, searchResults, articlesData]);

  const totalPages = useMemo(
    () => Math.ceil(totalCount / articlesPerPage),
    [totalCount, articlesPerPage]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', page.toString());
      setSearchParams(newParams);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [searchParams, setSearchParams]
  );

  const handleCategorySelect = useCallback(
    (category: string | null) => {
      const newParams = new URLSearchParams();
      if (category) {
        newParams.set('category', category);
      }
      setSearchParams(newParams);
    },
    [setSearchParams]
  );

  const selectedCategoryName = useMemo(() => {
    if (!categoryParam) return null;
    return categories.find((c) => c.slug === categoryParam)?.name || null;
  }, [categoryParam, categories]);

  if (loading && !displayContent.length && !featuredContent.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <Header />
        <main className="pt-44">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-6">
              <div className="h-72 bg-gray-200 rounded-xl" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-48 bg-gray-200 rounded-lg" />
                <div className="h-48 bg-gray-200 rounded-lg" />
                <div className="h-48 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Header />
      <LiveNewsIndicator />

      <main className="pt-44" role="main">
        <Hero featuredContent={featuredContent} />

        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-12">
          <AdBanner placement="header" className="max-w-4xl mx-auto" />
        </div>

        <CategoryFilter
          categories={categories}
          selectedCategory={categoryParam}
          onSelectCategory={handleCategorySelect}
        />

        <TrendingSection trendingContent={trendingContent} />

        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-12">
          <AdBanner placement="sidebar" className="max-w-md mx-auto" />
        </div>

        <EditorialSection />

        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16" aria-label="Latest articles">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {searchParam
                  ? `Search Results for "${searchParam}"`
                  : selectedCategoryName || 'Latest Stories'}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {searchParam
                  ? `Found ${totalCount} ${totalCount === 1 ? 'result' : 'results'}`
                  : 'Fresh updates and trending news'}
              </p>
            </div>
          </div>

          {(articlesLoading || searchLoading) ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayContent.map((content) => (
                  <MediaCard key={content.id} content={content} />
                ))}
              </div>

              {displayContent.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-gray-500 text-lg">
                    {searchParam
                      ? `No results found for "${searchParam}". Try different keywords.`
                      : 'No content found in this category.'}
                  </p>
                </div>
              )}

              {!searchParam && totalCount > articlesPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </section>

        <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto mb-12">
          <GoogleAd slot="HOME_FEED_AD_SLOT" format="horizontal" />
        </div>

        <LiveEvents />

        <CreatorRevShare />

        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
          <NewsletterSignup />
        </div>

        <SubscriptionPlans />

        <ContentLicensing />
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
