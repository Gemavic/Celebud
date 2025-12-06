import { Tag } from 'lucide-react';

interface SponsoredBadgeProps {
  sponsorName: string;
  sponsorLogo?: string;
  className?: string;
}

export function SponsoredBadge({ sponsorName, sponsorLogo, className = '' }: SponsoredBadgeProps) {
  return (
    <div className={`inline-flex items-center space-x-2 bg-yellow-100 border border-yellow-300 rounded-full px-3 py-1 ${className}`}>
      <Tag className="w-3 h-3 text-yellow-700" />
      <span className="text-xs font-semibold text-yellow-700">Sponsored by {sponsorName}</span>
      {sponsorLogo && (
        <img
          src={sponsorLogo}
          alt={sponsorName}
          className="w-4 h-4 rounded-full object-cover"
        />
      )}
    </div>
  );
}
