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
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const WritersDashboard = lazy(() => import('./pages/WritersDashboard').then(module => ({ default: module.WritersDashboard })));
const ArticleRecovery = lazy(() => import('./pages/ArticleRecovery').then(module => ({ default: module.ArticleRecovery })));
const ReporterSignup = lazy(() => import('./pages/ReporterSignup').then(module => ({ default: module.ReporterSignup })));
const ReporterManagement = lazy(() => import('./pages/ReporterManagement').then(module => ({ default: module.ReporterManagement })));
const FinAdvisor = lazy(() => import('./pages/FinAdvisor').then(module => ({ default: module.FinAdvisor })));
const AuthorPage = lazy(() => import('./pages/AuthorPage').then(module => ({ default: module.AuthorPage })));
const AboutPage = lazy(() => import('./pages/TrustPages').then(module => ({ default: module.AboutPage })));
const ContactPage = lazy(() => import('./pages/TrustPages').then(module => ({ default: module.ContactPage })));
const EditorialStandardsPage = lazy(() => import('./pages/TrustPages').then(module => ({ default: module.EditorialStandardsPage })));

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
            <Route path="/article/:id/:slug" element={<ArticleDetail />} />
            <Route path="/editorial" element={<EditorialPage />} />
            <Route path="/editorial/*" element={<EditorialPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/ad-revenue" element={<AdRevenueReport />} />
            <Route path="/admin/articles" element={<ArticleManagement />} />
            <Route path="/admin/recovery" element={<ArticleRecovery />} />
            <Route path="/admin/metrics" element={<MetricsDashboard />} />
            <Route path="/admin/creators" element={<CreatorManagement />} />
            <Route path="/studio" element={<ContentStudio />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/admin/writers" element={<WritersDashboard />} />
            <Route path="/reporters/apply" element={<ReporterSignup />} />
            <Route path="/fin-advisor" element={<FinAdvisor />} />
            <Route path="/author/:id" element={<AuthorPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/editorial-standards" element={<EditorialStandardsPage />} />
            <Route path="/admin/reporters" element={<ReporterManagement />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
