import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, DollarSign, Shield, Globe } from 'lucide-react';

interface ContentLicense {
  id: string;
  article_id: string;
  license_type: string;
  pricing_model: string;
  flat_fee: number | null;
  cpm_rate: number | null;
  revenue_share_pct: number | null;
  is_available: boolean;
  media_content?: {
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    categories: { name: string } | null;
  };
}

export function ContentLicensing() {
  const [licenses, setLicenses] = useState<ContentLicense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLicenses();
  }, []);

  async function loadLicenses() {
    const { data } = await supabase
      .from('content_licenses')
      .select('*, media_content(title, description, thumbnail_url, categories(name))')
      .eq('is_available', true)
      .limit(6);

    if (data) setLicenses(data as ContentLicense[]);
    setLoading(false);
  }

  function formatPrice(license: ContentLicense) {
    if (license.pricing_model === 'flat_fee' && license.flat_fee) {
      return `$${license.flat_fee.toFixed(0)}`;
    }
    if (license.pricing_model === 'cpm' && license.cpm_rate) {
      return `$${license.cpm_rate.toFixed(2)} CPM`;
    }
    if (license.pricing_model === 'revenue_share' && license.revenue_share_pct) {
      return `${license.revenue_share_pct}% rev share`;
    }
    return 'Contact us';
  }

  function getLicenseTypeLabel(type: string) {
    switch (type) {
      case 'standard': return 'Standard License';
      case 'exclusive': return 'Exclusive License';
      case 'syndication': return 'Syndication Rights';
      default: return type;
    }
  }

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-red-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Content Licensing</h2>
        </div>
        <p className="text-gray-500 text-sm max-w-lg mx-auto">
          License our premium content for your publication, app, or platform. Flat fees or CPM-based pricing available.
        </p>
      </div>

      {!loading && licenses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {licenses.map((license) => (
            <div key={license.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              {license.media_content?.thumbnail_url && (
                <img
                  src={license.media_content.thumbnail_url}
                  alt={license.media_content.title}
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
              )}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  {getLicenseTypeLabel(license.license_type)}
                </span>
                {license.media_content?.categories?.name && (
                  <span className="text-[10px] text-gray-500">{license.media_content.categories.name}</span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                {license.media_content?.title || 'Content Package'}
              </h3>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className="text-lg font-bold text-gray-900">{formatPrice(license)}</span>
                <button
                  onClick={() => handleLicenseInquiry(license)}
                  className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                >
                  Inquire
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Globe className="w-5 h-5 text-red-600" />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">Syndication</h4>
            <p className="text-xs text-gray-500">Republish our articles on your platform with full attribution.</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">Flexible Pricing</h4>
            <p className="text-xs text-gray-500">Flat fee for single articles or CPM-based for ongoing syndication.</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">Exclusive Rights</h4>
            <p className="text-xs text-gray-500">Need exclusive access? Premium licensing available for partners.</p>
          </div>
        </div>
        <div className="text-center mt-6">
          <a
            href="mailto:licensing@celebud.com?subject=Content Licensing Inquiry"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Contact Licensing Team
          </a>
        </div>
      </div>
    </section>
  );
}

function handleLicenseInquiry(license: ContentLicense) {
  const title = license.media_content?.title || 'content';
  const subject = encodeURIComponent(`License Inquiry: ${title}`);
  const body = encodeURIComponent(`Hi,\n\nI'm interested in licensing "${title}" (${license.license_type} license).\n\nPlease send me details on pricing and terms.\n\nThank you!`);
  window.open(`mailto:licensing@celebud.com?subject=${subject}&body=${body}`, '_blank');
}
