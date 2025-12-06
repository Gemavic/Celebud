import { ExternalLink, TrendingUp } from 'lucide-react';

interface AffiliateProductProps {
  productName: string;
  productUrl: string;
  affiliateUrl: string;
  imageUrl: string;
  description?: string;
}

export function AffiliateProduct({
  productName,
  affiliateUrl,
  imageUrl,
  description,
}: AffiliateProductProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
      <div className="flex items-start space-x-1 mb-2">
        <TrendingUp className="w-4 h-4 text-blue-600" />
        <p className="text-xs font-semibold text-blue-600 uppercase">Featured Product</p>
      </div>

      <div className="flex space-x-4">
        <img
          src={imageUrl}
          alt={productName}
          className="w-24 h-24 object-cover rounded-lg"
        />

        <div className="flex-1">
          <h4 className="font-bold text-gray-900 mb-1">{productName}</h4>
          {description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{description}</p>
          )}

          <a
            href={affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <span>Shop Now</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        This is an affiliate link. We may earn a commission from purchases.
      </p>
    </div>
  );
}
