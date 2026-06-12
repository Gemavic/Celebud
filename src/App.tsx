import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';

const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail').then(module => ({ default: module.ArticleDetail })));
const EditorialPage = lazy(() => import('./pages/EditorialPage'));
const AdRevenueReport = lazy(() => import('./components/AdRevenueReport').then(module => ({ default: module.AdRevenueReport })));
const ArticleManagement = lazy(() => import('./pages/ArticleManagement').then(module => ({ default: module.ArticleManagement })));
const MetricsDashboard = lazy(() => import('./pages/MetricsDashboard').then(module => ({ default: module.MetricsDashboard })));
const CreatorManagement = lazy(() => import('./pages/CreatorManagement').then(module => ({ default: module.CreatorManagement })));
const ContentStudio = lazy(() => import('./pages/ContentStudio').then(module => ({ default: module.ContentStudio })));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/article/:id" element={<ArticleDetail />} />
            <Route path="/editorial" element={<EditorialPage />} />
            <Route path="/editorial/*" element={<EditorialPage />} />
            <Route path="/admin/ad-revenue" element={<AdRevenueReport />} />
            <Route path="/admin/articles" element={<ArticleManagement />} />
            <Route path="/admin/metrics" element={<MetricsDashboard />} />
            <Route path="/admin/creators" element={<CreatorManagement />} />
            <Route path="/studio" element={<ContentStudio />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
