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

  async function trackImpression(adId: string) {
    try {
      const { data: currentAd } = await supabase
        .from('advertisements')
        .select('impression_count')
        .eq('id', adId)
        .maybeSingle();

      if (currentAd) {
        await supabase.from('advertisements').update({
          impression_count: (currentAd.impression_count || 0) + 1,
        }).eq('id', adId);

        await supabase.from('ad_impressions').insert({
          ad_id: adId,
          clicked: false,
          user_agent: navigator.userAgent,
        });
      }
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  }

  async function handleClick() {
    if (ad) {
      try {
        const { data: currentAd } = await supabase
          .from('advertisements')
          .select('click_count')
          .eq('id', ad.id)
          .maybeSingle();

        if (currentAd) {
          await supabase.from('advertisements').update({
            click_count: (currentAd.click_count || 0) + 1,
          }).eq('id', ad.id);

          await supabase.from('ad_impressions').insert({
            ad_id: ad.id,
            clicked: true,
            user_agent: navigator.userAgent,
          });
        }
      } catch (error) {
        console.error('Error tracking click:', error);
      }
    }
  }

  if (!ad) return null;

  const isHorizontal = placement === 'header' || placement === 'footer';

  return (
    <div className={`bg-gray-50 rounded-lg overflow-hidden border border-gray-200 ${className}`}>
      <div className="text-xs text-gray-400 px-3 py-1 bg-gray-100 border-b border-gray-200">
        Sponsored
      </div>
      <a
        href={ad.link_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="block group"
      >
        <div className={`relative ${isHorizontal ? 'h-24' : 'h-64'}`}>
          <img
            src={ad.image_url}
            alt={ad.title}
            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
            <div className="text-white">
              <p className="font-semibold text-sm mb-1">{ad.title}</p>
              <div className="flex items-center space-x-1 text-xs opacity-75">
                <span>{ad.advertiser_name}</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}
