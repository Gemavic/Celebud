// Homepage entry points for the reader-facing tools, so they are found from
// the top of the site rather than only from footer links.
import { Link } from 'react-router-dom';
import { Heart, LineChart, Send, Vote } from 'lucide-react';
import { daysUntil, PRESIDENTIAL_DAY } from '../utils/election';
import { PartnerCard } from './PartnerCard';

const ITEMS = [
  {
    to: '/tributes/submit',
    icon: Heart,
    title: 'Celebrate someone special',
    text: 'Send us their story and photos — we write the tribute.',
    cta: 'Send a tribute',
    tone: 'text-red-600 bg-red-50',
  },
  {
    to: '/trackers',
    icon: LineChart,
    title: 'Naira & Express Entry trackers',
    text: 'Exchange rates, every Express Entry draw and petrol prices, with sources.',
    cta: 'See the numbers',
    tone: 'text-blue-600 bg-blue-50',
  },
  {
    to: '/trackers#send-money',
    icon: Send,
    title: 'Sending money home?',
    text: 'Compare transfer apps and see the fee hidden in the exchange rate.',
    cta: 'Check the true cost',
    tone: 'text-emerald-600 bg-emerald-50',
  },
];

export function ReaderToolsStrip() {
  return (
    <section aria-label="Reader tools" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-10">
      <Link to="/election-2027"
        className="group mb-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-900 text-white rounded-2xl p-5 hover:bg-black transition">
        <span className="flex items-center gap-3 flex-1">
          <span className="w-11 h-11 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0"><Vote className="w-5 h-5" /></span>
          <span>
            <span className="block text-xs font-bold uppercase tracking-widest text-red-400">Nigeria Decides 2027 · {daysUntil(PRESIDENTIAL_DAY)} days to go</span>
            <span className="block font-bold text-lg">All 18 presidential candidates, where the 103.4m votes are, and who our readers would vote for today</span>
          </span>
        </span>
        <span className="font-semibold text-red-300 group-hover:underline whitespace-nowrap">Open the election hub →</span>
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ITEMS.map(({ to, icon: Icon, title, text, cta, tone }) => (
          <Link key={to} to={to}
            className="group flex items-start gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition">
            <span className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-5 h-5" /></span>
            <span className="min-w-0">
              <span className="block font-bold text-gray-900">{title}</span>
              <span className="block text-sm text-gray-600 mt-0.5">{text}</span>
              <span className="block text-sm font-semibold text-red-600 mt-2 group-hover:underline">{cta} →</span>
            </span>
          </Link>
        ))}
      </div>
      <PartnerCard variant="home" />
    </section>
  );
}
