import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Header } from './Header';
import { DollarSign, TrendingUp, MousePointer, Eye, ArrowLeft, AlertTriangle } from 'lucide-react';
import { calculateAdRevenue, calculateCTR, formatCurrency } from '../utils/adRevenue';

interface AdMetrics {
  id: string;
  title: string;
  advertiser_name: string;
  impression_count: number;
  click_count: number;
  cpm_rate: number;
  revenue: number;
  ctr: number;
}

export function AdRevenueReport() {
  const { user, profile, loading: authLoading } = useAuth();
  const { canExecutive, loaded: permsLoaded } = usePermissions();
  const [ads, setAds] = useState<AdMetrics[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.is_admin) return;
    loadAdMetrics();
  }, [profile]);

  async function loadAdMetrics() {
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('advertisements')
        .select('id, title, advertiser_name, impression_count, click_count, cpm_rate')
        .order('impression_count', { ascending: false });

      if (queryError) throw queryError;

      if (data) {
        const metricsWithRevenue = data.map(ad => ({
          ...ad,
          impression_count: ad.impression_count || 0,
          click_count: ad.click_count || 0,
          cpm_rate: ad.cpm_rate || 0,
          revenue: calculateAdRevenue(ad.impression_count || 0, ad.cpm_rate || 0),
          ctr: calculateCTR(ad.click_count || 0, ad.impression_count || 0),
        }));

        setAds(metricsWithRevenue);

        const total = metricsWithRevenue.reduce((sum, ad) => sum + ad.revenue, 0);
        setTotalRevenue(total);
      }
    } catch (err) {
      console.error('Error loading ad metrics:', err);
      setError('Could not load ad revenue data — check your connection and try refreshing the page.');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!user || !profile?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Admin Access Required</h2>
            <p className="text-gray-500 text-sm mb-6">
              {user
                ? 'Your account does not have admin privileges to view ad revenue.'
                : 'Please sign in with an admin account to access the ad revenue report.'}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (permsLoaded && !canExecutive) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Executive Access Required</h2>
            <p className="text-gray-500 text-sm mb-6">
              Ad Revenue reporting is restricted to executive-level roles. Contact the CEO or an
              Admin 1 for access.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading revenue data...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Ad Revenue Dashboard</h1>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Something went wrong</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8" />
            <span className="text-sm font-medium">Total Revenue</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-8 h-8" />
            <span className="text-sm font-medium">Total Impressions</span>
          </div>
          <p className="text-3xl font-bold">
            {ads.reduce((sum, ad) => sum + ad.impression_count, 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <MousePointer className="w-8 h-8" />
            <span className="text-sm font-medium">Total Clicks</span>
          </div>
          <p className="text-3xl font-bold">
            {ads.reduce((sum, ad) => sum + ad.click_count, 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8" />
            <span className="text-sm font-medium">Avg CTR</span>
          </div>
          <p className="text-3xl font-bold">
            {(ads.reduce((sum, ad) => sum + ad.ctr, 0) / ads.length || 0).toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Ad Performance Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ad Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Advertiser
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Impressions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CTR
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPM Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ads.map((ad) => (
                <tr key={ad.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {ad.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ad.advertiser_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {ad.impression_count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {ad.click_count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {ad.ctr.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(ad.cpm_rate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 text-right">
                    {formatCurrency(ad.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 How to Invoice Advertisers</h3>
        <ol className="space-y-2 text-blue-800">
          <li><strong>1. Monthly Billing:</strong> Send invoices at month-end with total impressions delivered</li>
          <li><strong>2. Formula:</strong> Revenue = (Impressions ÷ 1,000) × CPM Rate</li>
          <li><strong>3. Example:</strong> 50,000 impressions at $5 CPM = $250</li>
          <li><strong>4. Include:</strong> Detailed report with impressions, clicks, and CTR data</li>
          <li><strong>5. Payment Terms:</strong> NET-30 (payment due within 30 days)</li>
        </ol>
      </div>
    </div>
  );
}
