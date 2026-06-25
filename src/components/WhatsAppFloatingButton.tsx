import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { WHATSAPP_CHANNEL_URL } from './SocialLinks';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function WhatsAppFloatingButton() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('wa_float_dismissed') === 'true'
  );

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000);
    const expandTimer = setTimeout(() => setExpanded(true), 3500);
    const collapseTimer = setTimeout(() => setExpanded(false), 8000);
    return () => {
      clearTimeout(timer);
      clearTimeout(expandTimer);
      clearTimeout(collapseTimer);
    };
  }, []);

  if (dismissed || !visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {expanded && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-w-xs animate-fade-in">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <WhatsAppIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm leading-tight">Celebud Media</p>
                <p className="text-green-600 text-xs">WhatsApp Channel</p>
              </div>
            </div>
            <button
              onClick={() => {
                setExpanded(false);
                localStorage.setItem('wa_float_dismissed', 'true');
                setDismissed(true);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-gray-600 text-xs mb-3 leading-relaxed">
            Get breaking celebrity news delivered straight to WhatsApp. No spam, just headlines.
          </p>
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Follow Channel
          </a>
        </div>
      )}

      <a
        href={WHATSAPP_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setExpanded(!expanded)}
        className="relative w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label="Follow Celebud Media on WhatsApp"
      >
        <WhatsAppIcon className="w-7 h-7 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
      </a>
    </div>
  );
}
