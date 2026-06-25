import { Facebook, Youtube, Instagram } from 'lucide-react';
import { SOCIAL_LINKS } from '../config/socialMedia';

export { WHATSAPP_CHANNEL_URL } from '../config/socialMedia';

// --- Custom SVG icons for platforms not in lucide-react ---

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.54V6.79a4.85 4.85 0 01-1.02-.1z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 12 12 12 0 0011.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// Top-bar compact social strip (header)
export function SocialLinks() {
  return (
    <div className="flex items-center space-x-1.5">
      {SOCIAL_LINKS.facebook.active && (
        <a href={SOCIAL_LINKS.facebook.url} target="_blank" rel="noopener noreferrer"
          className="bg-blue-600 hover:bg-blue-700 p-2 rounded transition-colors" aria-label="Facebook">
          <Facebook className="w-4 h-4 text-white" />
        </a>
      )}
      {SOCIAL_LINKS.x.active && (
        <a href={SOCIAL_LINKS.x.url} target="_blank" rel="noopener noreferrer"
          className="bg-black hover:bg-gray-800 p-2 rounded transition-colors" aria-label="X">
          <XIcon className="w-4 h-4 text-white" />
        </a>
      )}
      {SOCIAL_LINKS.instagram.active && (
        <a href={SOCIAL_LINKS.instagram.url} target="_blank" rel="noopener noreferrer"
          className="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 hover:opacity-90 p-2 rounded transition-colors" aria-label="Instagram">
          <Instagram className="w-4 h-4 text-white" />
        </a>
      )}
      {SOCIAL_LINKS.tiktok.active && (
        <a href={SOCIAL_LINKS.tiktok.url} target="_blank" rel="noopener noreferrer"
          className="bg-black hover:bg-gray-800 p-2 rounded transition-colors" aria-label="TikTok">
          <TikTokIcon className="w-4 h-4 text-white" />
        </a>
      )}
      {SOCIAL_LINKS.youtube.active && (
        <a href={SOCIAL_LINKS.youtube.url} target="_blank" rel="noopener noreferrer"
          className="bg-red-600 hover:bg-red-700 p-2 rounded transition-colors" aria-label="YouTube">
          <Youtube className="w-4 h-4 text-white" />
        </a>
      )}
      {SOCIAL_LINKS.telegram.active && (
        <a href={SOCIAL_LINKS.telegram.url} target="_blank" rel="noopener noreferrer"
          className="bg-sky-500 hover:bg-sky-600 p-2 rounded transition-colors" aria-label="Telegram">
          <TelegramIcon className="w-4 h-4 text-white" />
        </a>
      )}
      {SOCIAL_LINKS.whatsapp.active && (
        <a href={SOCIAL_LINKS.whatsapp.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center space-x-1.5 bg-green-600 hover:bg-green-700 px-3 py-2 rounded transition-colors" aria-label="WhatsApp Channel">
          <WhatsAppIcon className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-semibold hidden lg:inline">Follow</span>
        </a>
      )}
    </div>
  );
}

// Full-size social button
interface SocialButtonProps {
  href: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  colorClass: string;
}

export function SocialButton({ href, label, sublabel, icon, colorClass }: SocialButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 ${colorClass} text-white rounded-xl px-4 py-3 hover:opacity-90 active:scale-95 transition-all`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block font-bold text-sm leading-tight">{label}</span>
        {sublabel && <span className="block text-xs opacity-80 leading-tight">{sublabel}</span>}
      </span>
    </a>
  );
}

// Footer grid — only shows platforms that are active
export function SocialMediaGrid() {
  const platforms = [
    {
      key: 'facebook' as const,
      label: 'Facebook',
      sublabel: 'Like our page',
      icon: <Facebook className="w-5 h-5" />,
      colorClass: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      key: 'x' as const,
      label: 'X / Twitter',
      sublabel: 'Follow for live updates',
      icon: <XIcon className="w-5 h-5" />,
      colorClass: 'bg-black hover:bg-gray-800',
    },
    {
      key: 'instagram' as const,
      label: 'Instagram',
      sublabel: 'Behind-the-scenes',
      icon: <Instagram className="w-5 h-5" />,
      colorClass: 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600',
    },
    {
      key: 'tiktok' as const,
      label: 'TikTok',
      sublabel: 'Short clips & trends',
      icon: <TikTokIcon className="w-5 h-5" />,
      colorClass: 'bg-gray-900 hover:bg-black',
    },
    {
      key: 'youtube' as const,
      label: 'YouTube',
      sublabel: 'Subscribe for videos',
      icon: <Youtube className="w-5 h-5" />,
      colorClass: 'bg-red-600 hover:bg-red-700',
    },
    {
      key: 'telegram' as const,
      label: 'Telegram',
      sublabel: 'Join our channel',
      icon: <TelegramIcon className="w-5 h-5" />,
      colorClass: 'bg-sky-500 hover:bg-sky-600',
    },
    {
      key: 'whatsapp' as const,
      label: 'WhatsApp',
      sublabel: 'Breaking news alerts',
      icon: <WhatsAppIcon className="w-5 h-5" />,
      colorClass: 'bg-green-600 hover:bg-green-700',
    },
  ];

  const active = platforms.filter(p => SOCIAL_LINKS[p.key].active);

  if (active.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {active.map(p => (
        <SocialButton
          key={p.key}
          href={SOCIAL_LINKS[p.key].url}
          label={p.label}
          sublabel={p.sublabel}
          icon={p.icon}
          colorClass={p.colorClass}
        />
      ))}
    </div>
  );
}
