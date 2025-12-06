import { Facebook, Twitter, Rss } from 'lucide-react';

export function SocialLinks() {
  return (
    <div className="flex items-center space-x-2">
      <a
        href="#"
        className="bg-blue-600 hover:bg-blue-700 p-2 rounded transition-colors"
        aria-label="Facebook"
      >
        <Facebook className="w-5 h-5 text-white" />
      </a>
      <a
        href="#"
        className="bg-sky-500 hover:bg-sky-600 p-2 rounded transition-colors"
        aria-label="Twitter"
      >
        <Twitter className="w-5 h-5 text-white" />
      </a>
      <a
        href="#"
        className="bg-orange-500 hover:bg-orange-600 p-2 rounded transition-colors"
        aria-label="RSS Feed"
      >
        <Rss className="w-5 h-5 text-white" />
      </a>
    </div>
  );
}
