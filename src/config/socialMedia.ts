// Central social media configuration for Celebud Media.
// Replace placeholder URLs with your actual profile URLs once accounts are created.
export const SOCIAL_LINKS = {
  whatsapp: {
    url: 'https://whatsapp.com/channel/0029VbCybN9J93wW55NAtb15',
    label: 'WhatsApp',
    active: true,
  },
  facebook: {
    url: 'https://www.facebook.com/celebudmedia',
    label: 'Facebook',
    active: true,
  },
  x: {
    url: 'https://x.com/celebudmedia',
    label: 'X (Twitter)',
    active: true,
  },
  instagram: {
    url: 'https://www.instagram.com/celebudmedia',
    label: 'Instagram',
    active: true,
  },
  tiktok: {
    url: 'https://www.tiktok.com/@celebudmedia',
    label: 'TikTok',
    active: true,
  },
  youtube: {
    url: 'https://www.youtube.com/@celebudmedia',
    label: 'YouTube',
    active: true,
  },
  telegram: {
    url: 'https://t.me/celebudmedia',
    label: 'Telegram',
    active: true,
  },
} as const;

export const WHATSAPP_CHANNEL_URL = SOCIAL_LINKS.whatsapp.url;
