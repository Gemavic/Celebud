// One row of share buttons used across the election hub, candidate pages
// and the poll. "More apps" opens the phone's own share sheet, which covers
// Instagram, TikTok, Snapchat, SMS and anything else installed.
import { useState } from 'react';
import { Copy, CheckCheck, Mail, MoreHorizontal } from 'lucide-react';

interface Props { url: string; text: string; title?: string; className?: string }

export function ShareButtons({ url, text, title, className = '' }: Props) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const both = encodeURIComponent(`${text}\n${url}`);
  const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const links = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${both}`, cls: 'bg-[#25D366] hover:bg-[#1ebe5a] text-white' },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, cls: 'bg-[#1877F2] hover:bg-[#166fe0] text-white' },
    { name: 'X', href: `https://x.com/intent/post?text=${t}&url=${u}`, cls: 'bg-black hover:bg-gray-800 text-white' },
    { name: 'Threads', href: `https://www.threads.net/intent/post?text=${both}`, cls: 'bg-gray-900 hover:bg-black text-white' },
    { name: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}`, cls: 'bg-[#229ED9] hover:bg-[#1e8fc4] text-white' },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, cls: 'bg-[#0A66C2] hover:bg-[#0959aa] text-white' },
  ];

  const btn = 'inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((l) => (
        <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" className={`${btn} ${l.cls}`} aria-label={`Share on ${l.name}`}>{l.name}</a>
      ))}
      <a href={`mailto:?subject=${encodeURIComponent(title || text.split('\n')[0])}&body=${both}`} className={`${btn} border border-gray-300 text-gray-800 hover:bg-gray-50`}>
        <Mail className="w-4 h-4" /> Email
      </a>
      <button type="button" className={`${btn} border border-gray-300 text-gray-800 hover:bg-gray-50`}
        onClick={() => { navigator.clipboard?.writeText(`${text}\n${url}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
        {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy link'}
      </button>
      {canNative && (
        <button type="button" className={`${btn} border border-gray-300 text-gray-800 hover:bg-gray-50`}
          onClick={() => navigator.share({ title: title || 'CelebUD', text, url }).catch(() => { /* cancelled */ })}>
          <MoreHorizontal className="w-4 h-4" /> More apps
        </button>
      )}
    </div>
  );
}
