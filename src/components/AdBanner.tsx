import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ExternalLink } from 'lucide-react';

interface Advertisement {
  id: string;
  title: string;
  ad_type: string;
  placement: string;
  image_url: string;
  link_url: string;
  advertiser_name: string;
}

interface AdBannerProps {
  placement: 'header' | 'sidebar' | 'article' | 'footer';
  className?: string;
}

export function AdBanner({ placement, className = '' }: AdBannerProps) {
  const [ad, setAd] = useState<Advertisement | null>(null);

  useEffect(() => {
    loadAd();
  }, [placement]);

  async function loadAd() {
    const { data } = await supabase
      .from('advertisements')
      .select('*')
      .eq('placement', placement)
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (data) {
      setAd(data as Advertisement);
      trackImpression(data.id);
    }
  }

  async function trackAdEvent(adId: string, event: 'impression' | 'click') {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-ad-event`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ad_id: adId,
          event,
          ad_position: placement,
          ad_type: ad?.ad_type,
          page_url: window.location.pathname,
          referrer: document.referrer || null,
        }),
      });
    } catch (error) {
      console.error(`Error tracking ad ${event}:`, error);
    }
  }

  async function trackImpression(adId: string) {
    await trackAdEvent(adId, 'impression');
  }

  async function handleClick() {
    if (ad) {
      await trackAdEvent(ad.id, 'click');
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    }
  }

  if (!ad) return null;

  return (
    <div className={`relative group ${className}`}>
      <div className="absolute top-2 right-2 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
        Sponsored
      </div>
      <button
        onClick={handleClick}
        className="w-full cursor-pointer hover:opacity-90 transition-opacity"
      >
        <img
          src={ad.image_url}
          alt={ad.title}
          className="w-full h-auto rounded-lg shadow-lg"
        />
      </button>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">Ad by {ad.advertiser_name}</span>
        <ExternalLink className="w-3 h-3 text-gray-400" />
      </div>
    </div>
  );
}
