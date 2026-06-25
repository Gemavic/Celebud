// Central social media configuration for Celebud Media.
// Replace each `url` value with your actual profile link.
export const SOCIAL_LINKS = {
  facebook:  { url: 'https://www.facebook.com/celebudmedia',   label: 'Facebook'  },
  x:         { url: 'https://x.com/celebudmedia',              label: 'X (Twitter)' },
  instagram: { url: 'https://www.instagram.com/celebudmedia',  label: 'Instagram' },
  tiktok:    { url: 'https://www.tiktok.com/@celebudmedia',    label: 'TikTok'    },
  youtube:   { url: 'https://www.youtube.com/@celebudmedia',   label: 'YouTube'   },
  telegram:  { url: 'https://t.me/celebudmedia',               label: 'Telegram'  },
  whatsapp:  { url: 'https://whatsapp.com/channel/0029VbCybN9J93wW55NAtb15', label: 'WhatsApp' },
} as const;

// Keep backward-compatible named export used by existing components
export const WHATSAPP_CHANNEL_URL = SOCIAL_LINKS.whatsapp.url;
