// Central social media configuration for Celebud Media.
//
// STATUS KEY:
//   Real URL  = account exists and is live
//   '#'       = account not yet created — button will be hidden until you add a real URL
//
// HOW TO ACTIVATE A PLATFORM:
//   1. Create the account on that platform
//   2. Replace '#' with your actual profile URL
//   3. The button will automatically appear on the site
//
export const SOCIAL_LINKS = {
  // ACTIVE — real WhatsApp channel confirmed
  whatsapp: {
    url: 'https://whatsapp.com/channel/0029VbCybN9J93wW55NAtb15',
    label: 'WhatsApp',
    active: true,
  },

  // NOT YET SET UP — create these accounts, then replace '#' with your real URL
  facebook: {
    url: '#',           // Create at: https://www.facebook.com/pages/create
    label: 'Facebook',
    active: false,
  },
  x: {
    url: '#',           // Create at: https://x.com/i/flow/signup
    label: 'X (Twitter)',
    active: false,
  },
  instagram: {
    url: '#',           // Create at: https://www.instagram.com/accounts/emailsignup
    label: 'Instagram',
    active: false,
  },
  tiktok: {
    url: '#',           // Create at: https://www.tiktok.com/signup
    label: 'TikTok',
    active: false,
  },
  youtube: {
    url: '#',           // Create at: https://www.youtube.com/channel_creation_flow
    label: 'YouTube',
    active: false,
  },
  telegram: {
    url: '#',           // Create at: https://t.me — open Telegram app, create a channel
    label: 'Telegram',
    active: false,
  },
} as const;

// Keep backward-compatible named export used by existing components
export const WHATSAPP_CHANNEL_URL = SOCIAL_LINKS.whatsapp.url;
