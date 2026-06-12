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
      const userIp = await getUserIP();

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
          user_ip: userIp,
        });
      }
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  }

  async function handleClick() {
    if (ad) {
      try {
        const userIp = await getUserIP();

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
            user_ip: userIp,
          });
        }

        await supabase.from('ad_clicks').insert({
          article_id: null,
          ad_position: placement,
          ad_type: ad.ad_type || 'banner',
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          page_url: window.location.pathname,
        });

        window.open(ad.link_url, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error('Error tracking click:', error);
      }
    }
  }

  async function getUserIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting IP:', error);
      return 'unknown';
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
