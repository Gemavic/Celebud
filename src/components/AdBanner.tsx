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

  return null;
}
