import { ExternalLink, Star } from 'lucide-react';

interface AffiliateProductProps {
  productName: string;
  productUrl: string;
  affiliateUrl: string;
  imageUrl: string;
  description?: string;
  price?: string;
  rating?: number;
}

export function AffiliateProduct({
  productName,
  affiliateUrl,
  imageUrl,
  description,
  price,
  rating,
}: AffiliateProductProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={productName}
            className="w-20 h-20 object-cover rounded-md flex-shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1 truncate">
            {productName}
          </h4>
          {description && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">{description}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {price && <span className="text-sm font-bold text-green-700">{price}</span>}
              {rating && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              )}
            </div>
            <a
              href={affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
              onClick={() => trackAffiliateClick(productName)}
            >
              Shop Now <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
      <p className="text-[9px] text-gray-400 mt-2 text-right">Affiliate link</p>
    </div>
  );
}

function trackAffiliateClick(productName: string) {
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'affiliate_click', { product: productName });
    }
  } catch {
    // silent
  }
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
