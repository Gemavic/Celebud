// src/pages/FinAdvisor.tsx
// FIN-ADVISOR: financial & insurance education hub at /fin-advisor.
// Four gradient topic cards each open a full written guide (TopicView),
// alongside live calculators (Investment, Savings Goal, 50/30/20 Budget
// Analyzer), finance-only articles, and quick tips.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { buildArticleUrl } from '../utils/articleUrl';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  BookOpen,
  Calculator,
  CheckCircle,
  Clock,
  Landmark,
  Lightbulb,
  LineChart,
  PiggyBank,
  Shield,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';

// Only these categories may appear on FIN-ADVISOR - financial and
// insurance content exclusively (matches fetch-news financial routing).
const FINANCE_CATEGORY_SLUGS = ['fin-advisor', 'finance-accounting', 'business', 'insurance'];

interface FinanceArticle {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string;
  categories: { name: string; slug: string } | null;
}

type FinTab = 'calculators' | 'articles' | 'tips';

const fmt = (n: number) =>
  '$' + n.toLocaleString(undefined, { maximumFractionDigits: 1 });

/* ---------------- Topic guides: one full lesson per card --------------- */

interface TopicSection {
  heading: string;
  body: string;
  points?: string[];
}

interface Topic {
  key: string;
  icon: typeof Wallet;
  title: string;
  sub: string;
  gradient: string;       // card + hero background
  chipBg: string;         // icon chip on the card
  accentText: string;     // section accents inside the guide
  accentBg: string;
  intro: string;
  sections: TopicSection[];
  calcNote: string;
}

const TOPICS: Topic[] = [
  {
    key: 'budgeting',
    icon: Wallet,
    title: 'Smart Budgeting',
    sub: 'Take control before the month takes it from you',
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    chipBg: 'bg-white/20',
    accentText: 'text-orange-600',
    accentBg: 'bg-orange-50',
    intro:
      'A budget is not a punishment - it is permission. It tells every unit of your income where to go before the month starts, so you spend with intention instead of guilt. Most people who feel "broke" do not have an income problem; they have a visibility problem. This guide fixes the visibility.',
    sections: [
      {
        heading: 'Start by seeing the truth',
        body:
          'Before you set a single limit, track every expense for one full month - every transfer, every airtime top-up, every "small" card swipe. Write nothing off as too minor. Most people discover they underestimate their real spending by 20-30%, and the leaks are almost never the big bills; they are the invisible daily drips.',
        points: [
          'Use your bank/app statement, not your memory - memory flatters you',
          'Group spending into: housing, food, transport, data & subscriptions, family support, fun',
          'Circle the three categories that surprised you most - those are your levers',
        ],
      },
      {
        heading: 'The 50/30/20 rule - your starting skeleton',
        body:
          'Split after-tax income three ways: 50% to needs (rent, food, transport, power), 30% to wants (outings, entertainment, that better phone), and 20% to savings and debt payments beyond minimums. It is a starting point, not a law - in a high-rent city your needs may take 60% for a season. The percentages matter less than the discipline of naming every part of your income.',
        points: [
          'Needs are things with consequences if unpaid; wants are things with disappointment if unpaid',
          'If needs exceed 50%, cut from wants first - never from the savings line',
          'Try our Budget Analyzer below: it grades your split instantly',
        ],
      },
      {
        heading: 'Pay yourself first - automatically',
        body:
          'The single most powerful budgeting move: the day income lands, move your savings percentage out immediately - by automatic transfer if your bank allows it. Money you never see is money you never spend. Budgets fail at the end of the month; automatic savings succeed at the beginning of it.',
      },
      {
        heading: 'Kill the silent subscriptions',
        body:
          'Once a quarter, list every recurring charge: streaming, apps, data bundles, memberships. Cancel anything you have not used in 30 days. Small recurring amounts are the termites of a budget - individually harmless, collectively structural.',
      },
      {
        heading: 'Common budgeting mistakes',
        body: 'Avoid the traps that kill most budgets in their first month:',
        points: [
          'Making it too strict - a budget with zero fun money will be abandoned by week two',
          'Forgetting irregular costs - school fees, festive seasons, car repairs. Divide yearly costs by 12 and save monthly',
          'Budgeting the income you hope for instead of the income you actually receive',
          'Giving up after one bad month - a blown budget is data, not failure. Adjust and continue',
        ],
      },
    ],
    calcNote: 'Test your own numbers in the Budget Analyzer - it grades your budget health and shows your 50/30/20 breakdown instantly.',
  },
  {
    key: 'saving-investing',
    icon: LineChart,
    title: 'Saving & Investing',
    sub: 'Make your money employ itself',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    chipBg: 'bg-white/20',
    accentText: 'text-emerald-600',
    accentBg: 'bg-emerald-50',
    intro:
      'Saving protects you from the past repeating itself; investing pays you for the future arriving. You need both, in that order. This guide walks the ladder: emergency fund first, then goals, then long-term compounding - with a hard word about scams, because where money grows, thieves harvest.',
    sections: [
      {
        heading: 'Rung one: the emergency fund',
        body:
          'Before any investment, build a cash cushion of 3-6 months of essential expenses in a separate, high-interest savings account. This fund is not for opportunities - it is for emergencies only: job loss, medical bills, urgent repairs. Its job is to make sure a bad month never forces you to sell investments at the worst time or borrow at the worst rates.',
        points: [
          'Keep it accessible but not too accessible - a different bank works wonders',
          'If 6 months feels impossible, start with a one-month target. Momentum beats magnitude',
          'Refill it first after every withdrawal - it is your financial immune system',
        ],
      },
      {
        heading: 'Compound interest - the eighth wonder',
        body:
          'Compounding means your returns start earning their own returns. Time is its fuel: invest $200 monthly at 8% annual growth and after 10 years you have put in $24,000 but hold about $36,600. After 30 years you have put in $72,000 - and hold roughly $298,000. The last decade earns more than the first two combined. That is why starting early beats starting big.',
        points: [
          'Run your own numbers in the Investment Calculator below',
          'Consistency multiplies compounding: monthly contributions beat occasional lump sums',
          'Every year you delay costs more than the year itself - the curve is steepest at the end',
        ],
      },
      {
        heading: 'Diversify - never one basket',
        body:
          'Never concentrate your savings in one stock, one business, one plot of land, or one currency. Spread across asset types (equities, bonds, real assets, cash) and across geographies where possible. Diversification is the only free lunch in finance: it lowers your risk without necessarily lowering your return.',
      },
      {
        heading: 'Match investments to time horizons',
        body: 'The right investment depends on when you need the money back:',
        points: [
          'Under 2 years (rent advance, school fees): high-interest savings or money-market only - never stocks',
          '2-5 years (car, wedding, land): balanced mix, lean conservative',
          '5+ years (retirement, children\'s future): growth assets can dominate - time smooths the bumps',
        ],
      },
      {
        heading: 'The scam radar - non-negotiable',
        body:
          'If a scheme promises high guaranteed returns, it is a scam. Guaranteed and high do not coexist in honest finance. Watch for: pressure to recruit others, returns paid from new members\' deposits, unregistered operators, and urgency ("slots closing today!"). When in doubt, the answer is no - a missed opportunity costs you nothing; a Ponzi costs you everything.',
      },
    ],
    calcNote: 'Open the Investment Calculator and the Savings Goal Calculator below - set your own amounts and watch compounding do its work.',
  },
  {
    key: 'insurance',
    icon: Shield,
    title: 'Insurance Basics',
    sub: 'Protect the life you are building',
    gradient: 'from-sky-500 via-blue-600 to-indigo-600',
    chipBg: 'bg-white/20',
    accentText: 'text-blue-600',
    accentBg: 'bg-blue-50',
    intro:
      'Insurance is the part of a financial plan nobody enjoys buying and everybody thanks later. Its logic is simple: you pay a small certain amount (the premium) so that a large uncertain disaster cannot destroy you. This guide covers what to insure first, how policies actually work, and the mistakes that void claims.',
    sections: [
      {
        heading: 'Insure catastrophes first',
        body:
          'The golden rule: insure what you cannot afford to replace, self-insure what you can. A cracked phone screen is an annoyance; a hospital stay, a house fire, or the loss of a family breadwinner is a catastrophe. Priority order for most people: health cover, life cover (if anyone depends on your income), motor (usually legally required), then home/renters and business cover.',
      },
      {
        heading: 'Premiums vs deductibles - the seesaw',
        body:
          'The premium is what you pay regularly; the deductible (or excess) is what you pay out of pocket before the insurer pays anything. They sit on a seesaw: choose a higher deductible and your premium drops. If you have built the emergency fund from our Saving guide, you can comfortably carry a higher deductible - your fund covers small incidents and your (cheaper) policy covers disasters. That pairing is how the two guides work together.',
      },
      {
        heading: 'Life insurance: term beats whole for protection',
        body:
          'Term life insurance covers you for a fixed period (say 20 years) and is dramatically cheaper than whole-life products for the same protection. A common rule of thumb: cover worth about 10x your annual income if others depend on you. Buy term for protection and invest the price difference yourself - most bundled "insurance + investment" products do both jobs poorly.',
        points: [
          'Life cover is cheapest when you are young and healthy - waiting raises the price forever',
          'Name and update your beneficiaries - marriage, children, and separations all change who should receive what',
        ],
      },
      {
        heading: 'How claims get rejected - and how not to be rejected',
        body: 'Most rejected claims fail on paperwork, not on substance:',
        points: [
          'Answer proposal forms honestly - a hidden pre-existing condition can void the entire policy',
          'Photograph valuables and keep receipts before you ever need to claim',
          'Report incidents fast - most policies set strict notification windows',
          'Never let a policy lapse silently: an uncovered week is all a disaster needs',
        ],
      },
      {
        heading: 'Review yearly - your life outgrows your policies',
        body:
          'Set one date each year to review every policy: new spouse, new child, new home, new business, new car - each changes what needs protecting. Shop competing quotes at renewal; loyalty is rarely rewarded in insurance pricing, and switching is easier than it looks.',
      },
    ],
    calcNote: 'Compare Term, Whole Life, and Universal Life side by side in the Life Insurance Illustrator below - then take your real situation to a licensed advisor.',
  },
  {
    key: 'debt',
    icon: Landmark,
    title: 'Debt Management',
    sub: 'Get out, stay out, and make credit serve you',
    gradient: 'from-fuchsia-500 via-purple-600 to-violet-700',
    chipBg: 'bg-white/20',
    accentText: 'text-purple-600',
    accentBg: 'bg-purple-50',
    intro:
      'Debt is a tool that cuts both ways: it can buy assets that grow (a home, an education, a business) or fund lifestyles that vanish. The difference between people whom debt serves and people who serve their debt is a plan. Here is the plan.',
    sections: [
      {
        heading: 'First, face the full list',
        body:
          'Write down every debt: lender, balance, interest rate, minimum payment. Include the informal ones - family loans, shop credit, salary advances. Most people have never seen their complete debt picture on one page, and the relief of clarity usually outweighs the shock of the total.',
      },
      {
        heading: 'Avalanche vs snowball - pick your weapon',
        body:
          'Pay minimums on everything, then aim every spare unit of money at one target debt. Two proven orders: the avalanche (highest interest rate first) saves the most money mathematically; the snowball (smallest balance first) wins psychologically, because each cleared debt fuels momentum. Choose avalanche if you are disciplined by numbers, snowball if you are motivated by wins. Both beat drifting.',
        points: [
          'Example: with a $2,400 card at 24%, a $8,000 loan at 12%, and $600 owed to a friend - avalanche attacks the card first; snowball clears the friend first',
          'Never skip the minimums on the debts you are not targeting - late fees undo everything',
        ],
      },
      {
        heading: 'Escape the minimum-payment trap',
        body:
          'Minimum payments are designed to keep you in debt: on a typical card, paying minimums can stretch a modest balance across a decade and multiply what you repay. Even a small fixed amount above the minimum - the same amount every month rather than the shrinking minimum - collapses the payoff timeline dramatically.',
      },
      {
        heading: 'Consolidation: helpful tool or fresh trap?',
        body:
          'Merging several debts into one lower-rate loan can simplify your life - but only if the new rate is genuinely lower after all fees, and only if you close the old credit lines. The classic failure: consolidate the cards, feel free, and run the cards up again. Consolidation treats the symptom; the budget from our first guide treats the cause.',
      },
      {
        heading: 'Borrow for assets, not appearances',
        body: 'A simple filter before taking on any new debt:',
        points: [
          'Good candidates: education that raises your income, tools for your business, a home within your means',
          'Bad candidates: depreciating luxuries, lifestyle upgrades, borrowing to invest in anything you do not understand',
          'The question to ask: will this purchase still be paying me back when I am still paying it off?',
        ],
      },
    ],
    calcNote: 'See your own debt-free date - and what consolidating at a lower rate could save - in the Debt Payoff & Consolidation Illustrator below.',
  },
];

export function FinAdvisor() {
  const [tab, setTab] = useState<FinTab>('calculators');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [articles, setArticles] = useState<FinanceArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('media_content')
        .select('id, slug, title, description, thumbnail_url, published_at, categories!inner(name, slug)')
        .in('categories.slug', FINANCE_CATEGORY_SLUGS)
        .order('published_at', { ascending: false })
        .limit(24);
      setArticles((data as unknown as FinanceArticle[]) || []);
      setArticlesLoading(false);
    })();
  }, []);

  const openTopic = (key: string) => {
    setActiveTopic(key);
    // Bring the guide into view
    setTimeout(() => {
      document.getElementById('fin-topic-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const goToCalculators = () => {
    setActiveTopic(null);
    setTab('calculators');
    setTimeout(() => {
      document.getElementById('fin-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const topic = TOPICS.find((t) => t.key === activeTopic) || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-8 sm:p-12 text-white mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="w-6 h-6" />
              <span className="text-sm font-bold tracking-widest uppercase opacity-90">Fin-Advisor</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Financial &amp; Insurance Education Center</h1>
            <p className="text-emerald-50 max-w-2xl">
              Learn, plan, and build a strong financial foundation - four in-depth guides, free planning
              calculators, insurance know-how, and the latest finance news in one place.
            </p>
          </div>

          {/* Topic cards */}
          <h2 className="text-lg font-bold text-gray-900 mb-1">Learn the essentials</h2>
          <p className="text-sm text-gray-500 mb-4">Tap any card to open its full guide</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {TOPICS.map((t) => (
              <button
                key={t.key}
                onClick={() => openTopic(t.key)}
                className={`relative text-left rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br ${t.gradient} transition-all hover:shadow-2xl hover:-translate-y-1 ${
                  activeTopic === t.key ? 'ring-4 ring-offset-2 ring-gray-900/20' : ''
                }`}
              >
                <div className={`w-11 h-11 rounded-xl ${t.chipBg} backdrop-blur-sm flex items-center justify-center mb-3`}>
                  <t.icon className="w-5 h-5 text-white" />
                </div>
                <p className="font-bold text-[17px] leading-snug">{t.title}</p>
                <p className="text-sm text-white/85 mt-1 leading-snug">{t.sub}</p>
                <span className="inline-block mt-3 text-[11px] font-bold uppercase tracking-wider bg-white/20 rounded-full px-2.5 py-1">
                  Read the guide →
                </span>
              </button>
            ))}
          </div>

          {/* Topic guide view */}
          {topic && (
            <div id="fin-topic-view" className="mb-12 scroll-mt-28">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className={`bg-gradient-to-br ${topic.gradient} px-6 sm:px-10 py-8 text-white`}>
                  <button
                    onClick={() => setActiveTopic(null)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white mb-4"
                  >
                    <ArrowLeft className="w-4 h-4" /> All topics
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <topic.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold">{topic.title}</h2>
                      <p className="text-white/85 text-sm mt-0.5">{topic.sub}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 sm:px-10 py-8">
                  <p className="text-gray-700 leading-relaxed text-[16.5px] max-w-3xl mb-8">{topic.intro}</p>

                  <div className="space-y-8 max-w-3xl">
                    {topic.sections.map((s, i) => (
                      <div key={s.heading}>
                        <h3 className={`flex items-center gap-2.5 text-lg font-bold text-gray-900 mb-2`}>
                          <span className={`w-7 h-7 shrink-0 rounded-full ${topic.accentBg} ${topic.accentText} text-sm font-black flex items-center justify-center`}>
                            {i + 1}
                          </span>
                          {s.heading}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">{s.body}</p>
                        {s.points && (
                          <ul className="mt-3 space-y-2">
                            {s.points.map((p) => (
                              <li key={p} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
                                <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${topic.accentText}`} />
                                {p}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className={`mt-10 max-w-3xl rounded-2xl ${topic.accentBg} border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
                    <Lightbulb className={`w-6 h-6 shrink-0 ${topic.accentText}`} />
                    <p className="text-sm text-gray-700 flex-1">{topic.calcNote}</p>
                    <button
                      onClick={goToCalculators}
                      className={`shrink-0 px-4 py-2.5 rounded-xl text-white text-sm font-semibold bg-gradient-to-r ${topic.gradient} hover:opacity-90 transition-opacity`}
                    >
                      Open the calculators
                    </button>
                  </div>

                  <div className="mt-6 max-w-3xl">
                    <PageDisclaimer />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div id="fin-tabs" className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-8 scroll-mt-28">
            {([
              ['calculators', 'Calculators', Calculator],
              ['articles', 'Articles', BookOpen],
              ['tips', 'Tips', TrendingUp],
            ] as [FinTab, string, typeof Calculator][]).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === 'calculators' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InvestmentCalculator />
              <SavingsGoalCalculator />
              <div className="lg:col-span-2">
                <BudgetAnalyzer />
              </div>
              <div className="lg:col-span-2">
                <InsuranceIllustrator />
              </div>
              <div className="lg:col-span-2">
                <DebtPayoffCalculator />
              </div>
              <div className="lg:col-span-2">
                <PageDisclaimer />
              </div>
            </div>
          )}

          {tab === 'articles' && (
            <div>
              {articlesLoading && <p className="text-center text-gray-500 py-12">Loading articles...</p>}
              {!articlesLoading && articles.length === 0 && (
                <p className="text-center text-gray-500 py-12">No finance articles yet - check back soon.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {articles.map((a) => (
                  <Link
                    key={a.id}
                    to={buildArticleUrl(a)}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all"
                  >
                    <div className="aspect-video bg-gray-100 overflow-hidden">
                      {a.thumbnail_url ? (
                        <img
                          src={a.thumbnail_url}
                          alt={a.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Banknote className="w-10 h-10 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      {a.categories && (
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                          {a.categories.name}
                        </span>
                      )}
                      <h3 className="font-semibold text-gray-900 line-clamp-2 mt-1 group-hover:text-emerald-700 transition-colors">
                        {a.title}
                      </h3>
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(a.published_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {tab === 'tips' && (
            <div className="space-y-6">
              <FinanceTips />
              <PageDisclaimer />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Calculators ------------------------------------------ */

const inputClass =
  'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900';

function NumField({ label, value, onChange, min = 0 }: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        min={min}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={inputClass}
      />
    </div>
  );
}

function ResultTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${accent ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <p className={`text-xs font-medium ${accent ? 'text-emerald-100' : 'text-gray-500'}`}>{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
    </div>
  );
}

function InvestmentCalculator() {
  const [initial, setInitial] = useState(10000);
  const [years, setYears] = useState(10);
  const [annualReturn, setAnnualReturn] = useState(8);
  const [monthly, setMonthly] = useState(500);

  const r = useMemo(() => {
    const months = Math.max(0, years) * 12;
    const monthlyRate = annualReturn / 100 / 12;
    const growth = Math.pow(1 + monthlyRate, months);
    const futureValue =
      monthlyRate === 0
        ? initial + monthly * months
        : initial * growth + monthly * ((growth - 1) / monthlyRate);
    const invested = initial + monthly * months;
    const gain = futureValue - invested;
    const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
    return { futureValue, invested, gain, gainPct };
  }, [initial, years, annualReturn, monthly]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
          <LineChart className="w-5 h-5 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Investment Calculator</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <NumField label="Initial Investment ($)" value={initial} onChange={setInitial} />
        <NumField label="Years" value={years} onChange={setYears} />
        <NumField label="Annual Return (%)" value={annualReturn} onChange={setAnnualReturn} />
        <NumField label="Monthly Contribution ($)" value={monthly} onChange={setMonthly} />
      </div>
      <p className="text-sm font-semibold text-gray-700 mb-2">Results</p>
      <div className="grid grid-cols-2 gap-3">
        <ResultTile label="Total Value" value={fmt(r.futureValue)} accent />
        <ResultTile label="Total Gain" value={fmt(r.gain)} />
        <ResultTile label="Total Invested" value={fmt(r.invested)} />
        <ResultTile label="Gain %" value={r.gainPct.toFixed(1) + '%'} />
      </div>
    </div>
  );
}

function SavingsGoalCalculator() {
  const [goal, setGoal] = useState(50000);
  const [months, setMonths] = useState(24);
  const [current, setCurrent] = useState(5000);

  const r = useMemo(() => {
    const remaining = Math.max(0, goal - current);
    const monthlyNeeded = months > 0 ? remaining / months : remaining;
    const progress = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
    return { remaining, monthlyNeeded, progress };
  }, [goal, months, current]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Target className="w-5 h-5 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Savings Goal Calculator</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <NumField label="Savings Goal ($)" value={goal} onChange={setGoal} />
        <NumField label="Time Frame (months)" value={months} onChange={setMonths} min={1} />
        <div className="col-span-2">
          <NumField label="Current Savings ($)" value={current} onChange={setCurrent} />
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-700 mb-2">Your Plan</p>
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span className="font-semibold text-emerald-700">{r.progress.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${r.progress}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ResultTile label="Monthly Needed" value={fmt(r.monthlyNeeded)} accent />
        <ResultTile label="Remaining" value={fmt(r.remaining)} />
      </div>
    </div>
  );
}

function BudgetAnalyzer() {
  const [income, setIncome] = useState(5000);
  const [expenses, setExpenses] = useState(3500);

  const r = useMemo(() => {
    const savings = income - expenses;
    const rate = income > 0 ? (savings / income) * 100 : 0;
    const health =
      rate >= 20 ? { label: 'Excellent', cls: 'bg-emerald-100 text-emerald-700' } :
      rate >= 10 ? { label: 'Good', cls: 'bg-blue-100 text-blue-700' } :
      rate >= 0 ? { label: 'Needs Work', cls: 'bg-amber-100 text-amber-700' } :
      { label: 'Over Budget', cls: 'bg-red-100 text-red-700' };
    return { savings, rate, health };
  }, [income, expenses]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
          <PiggyBank className="w-5 h-5 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Budget Analyzer</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <NumField label="Monthly Income ($)" value={income} onChange={setIncome} />
          <NumField label="Monthly Expenses ($)" value={expenses} onChange={setExpenses} />
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-gray-700">Budget Health</p>
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${r.health.cls}`}>{r.health.label}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ResultTile label="Monthly Savings" value={fmt(r.savings)} accent />
            <ResultTile label="Savings Rate" value={r.rate.toFixed(1) + '%'} />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">50/30/20 Rule Breakdown</p>
          <div className="space-y-3">
            {([
              ['Needs (50%)', income * 0.5, 'bg-emerald-500', '50%'],
              ['Wants (30%)', income * 0.3, 'bg-blue-500', '30%'],
              ['Savings (20%)', income * 0.2, 'bg-purple-500', '20%'],
            ] as [string, number, string, string][]).map(([label, value, bar, width]) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-semibold text-gray-900">{fmt(value)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${bar} rounded-full`} style={{ width }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            The 50/30/20 rule suggests spending 50% of income on needs, 30% on wants, and saving 20%.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Advisory disclaimers ---------------------------------- */

function AdvisorDisclaimer({ text }: { text: string }) {
  return (
    <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
      <p className="text-xs text-amber-800 leading-relaxed">
        <strong>Educational illustration only — not advice or a quote.</strong> {text} Always seek
        the guidance of a licensed advisor in your province or country before making decisions.
      </p>
    </div>
  );
}

function PageDisclaimer() {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-gray-100 border border-gray-200 px-5 py-4">
      <Shield className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
      <p className="text-xs text-gray-600 leading-relaxed">
        <strong className="text-gray-800">FIN-ADVISOR disclaimer:</strong> everything on this page —
        guides, calculators, and illustrations — is published for general financial education only.
        It is not financial, insurance, investment, tax, or legal advice, and no calculator here
        produces a real quote. Products, premiums, rates, and regulations vary by individual
        circumstances and by jurisdiction. Before acting on anything you learn here, consult a
        licensed financial or insurance advisor in your province or country — in Canada, for
        example, advisors licensed under their provincial regulator (such as FSRA in Ontario).
      </p>
    </div>
  );
}

/* ---------------- Insurance illustrator: Term vs Whole vs Universal ----- */

function InsuranceIllustrator() {
  const [coverage, setCoverage] = useState(500000);
  const [age, setAge] = useState(35);

  const r = useMemo(() => {
    const safeAge = Math.min(70, Math.max(18, age));
    // Illustrative pricing only: a simple per-$1,000 monthly rate that
    // rises with age. Real premiums depend on health, smoking status,
    // gender, insurer underwriting, and product design.
    const ratePer1000 = 0.045 + Math.max(0, safeAge - 25) * 0.006;
    const term = (coverage / 1000) * ratePer1000;
    const whole = term * 9;
    const universal = term * 6.5;
    const years = 20;
    const wholeCash = whole * 12 * years * 0.55;
    const universalCash = universal * 12 * years * 0.45;
    return { term, whole, universal, wholeCash, universalCash };
  }, [coverage, age]);

  const products = [
    {
      name: 'Term Life',
      badge: 'Lowest cost',
      badgeCls: 'bg-emerald-100 text-emerald-700',
      premium: r.term,
      duration: 'Covers a set period (e.g. 20 years), then ends or renews at a higher rate',
      cash: 'None — pure protection',
      cashValue: 0,
      flexibility: 'Fixed premium for the term; simple and predictable',
      bestFor: 'Income protection during your working and child-raising years — maximum coverage per dollar',
    },
    {
      name: 'Whole Life',
      badge: 'Permanent + guaranteed',
      badgeCls: 'bg-blue-100 text-blue-700',
      premium: r.whole,
      duration: 'Covers your entire life as long as premiums are paid',
      cash: 'Guaranteed cash value that grows on a fixed schedule',
      cashValue: r.wholeCash,
      flexibility: 'Fixed premium; least flexible, most guarantees',
      bestFor: 'Lifelong needs: estate planning, final expenses, guaranteed legacy',
    },
    {
      name: 'Universal Life',
      badge: 'Permanent + flexible',
      badgeCls: 'bg-purple-100 text-purple-700',
      premium: r.universal,
      duration: 'Covers your entire life, with adjustable coverage',
      cash: 'Investment-linked cash value — grows (or shrinks) with market performance',
      cashValue: r.universalCash,
      flexibility: 'Premiums and coverage can be adjusted within limits',
      bestFor: 'Those who want permanent cover plus investment control and have maxed other tax-advantaged room',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Life Insurance Illustrator</h3>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Compare how the three main types of life insurance behave for the same coverage amount.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <NumField label="Coverage Amount ($)" value={coverage} onChange={setCoverage} />
        <NumField label="Your Age" value={age} onChange={setAge} min={18} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.name} className="rounded-2xl border border-gray-200 p-5 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="font-bold text-gray-900">{p.name}</h4>
              <span className={`text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${p.badgeCls}`}>
                {p.badge}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {fmt(p.premium)}<span className="text-sm font-medium text-gray-400">/month*</span>
            </p>
            <dl className="mt-4 space-y-3 text-[13px] flex-1">
              <div>
                <dt className="font-semibold text-gray-700">How long it covers</dt>
                <dd className="text-gray-500">{p.duration}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Cash value</dt>
                <dd className="text-gray-500">{p.cash}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Illustrative cash value after 20 yrs*</dt>
                <dd className="text-gray-900 font-semibold">{p.cashValue > 0 ? fmt(p.cashValue) : '$0'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Flexibility</dt>
                <dd className="text-gray-500">{p.flexibility}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Typically suits</dt>
                <dd className="text-gray-500">{p.bestFor}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <AdvisorDisclaimer text="*Premiums and cash values shown are simplified demonstrations of how these product types compare — they are not quotes. Real pricing depends on your health, smoking status, gender, insurer underwriting, and product design, and universal life cash values vary with market performance and policy charges." />
    </div>
  );
}

/* ---------------- Debt payoff & consolidation calculator ---------------- */

function monthsToPayoff(principal: number, annualRate: number, payment: number): number | null {
  const r = annualRate / 100 / 12;
  if (principal <= 0 || payment <= 0) return null;
  if (r === 0) return Math.ceil(principal / payment);
  if (payment <= principal * r) return null; // payment doesn't cover interest
  return Math.ceil(-Math.log(1 - (r * principal) / payment) / Math.log(1 + r));
}

function DebtPayoffCalculator() {
  const [debt, setDebt] = useState(20000);
  const [rate, setRate] = useState(19);
  const [payment, setPayment] = useState(500);
  const [consolidationRate, setConsolidationRate] = useState(9);

  const r = useMemo(() => {
    const current = monthsToPayoff(debt, rate, payment);
    const consolidated = monthsToPayoff(debt, consolidationRate, payment);
    const currentInterest = current !== null ? payment * current - debt : null;
    const consolidatedInterest = consolidated !== null ? payment * consolidated - debt : null;
    const interestSaved =
      currentInterest !== null && consolidatedInterest !== null
        ? currentInterest - consolidatedInterest
        : null;
    const monthsSaved = current !== null && consolidated !== null ? current - consolidated : null;
    return { current, consolidated, currentInterest, consolidatedInterest, interestSaved, monthsSaved };
  }, [debt, rate, payment, consolidationRate]);

  const fmtMonths = (m: number | null) =>
    m === null ? 'Never — payment too low' : m >= 12 ? `${Math.floor(m / 12)} yr ${m % 12} mo` : `${m} mo`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
          <Landmark className="w-5 h-5 text-purple-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Debt Payoff &amp; Consolidation Illustrator</h3>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        See how long your current path takes — and what consolidating at a lower rate could change.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <NumField label="Total Debt ($)" value={debt} onChange={setDebt} />
        <NumField label="Current Interest Rate (%)" value={rate} onChange={setRate} />
        <NumField label="Monthly Payment ($)" value={payment} onChange={setPayment} />
        <NumField label="Consolidation Rate (%)" value={consolidationRate} onChange={setConsolidationRate} />
      </div>

      {r.current === null && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700 leading-relaxed">
            <strong>The minimum-payment trap, live:</strong> at this rate, your monthly payment does not
            even cover the interest — the balance would grow forever. Increase the payment or lower the
            rate to see a payoff date.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Current path ({rate}%)</p>
          <div className="grid grid-cols-2 gap-3">
            <ResultTile label="Debt-free in" value={fmtMonths(r.current)} />
            <ResultTile label="Total interest paid" value={r.currentInterest !== null ? fmt(r.currentInterest) : '—'} />
          </div>
        </div>
        <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/40 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-purple-500 mb-3">
            Consolidated at {consolidationRate}% (same payment)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ResultTile label="Debt-free in" value={fmtMonths(r.consolidated)} accent />
            <ResultTile label="Total interest paid" value={r.consolidatedInterest !== null ? fmt(r.consolidatedInterest) : '—'} />
          </div>
          {r.interestSaved !== null && r.interestSaved > 0 && r.monthsSaved !== null && (
            <p className="mt-3 text-sm font-semibold text-purple-700">
              Potential saving: {fmt(r.interestSaved)} in interest and {fmtMonths(r.monthsSaved)} sooner to freedom.
            </p>
          )}
        </div>
      </div>

      <AdvisorDisclaimer text="This simplified illustration assumes a single fixed rate and payment with no fees. Real consolidation loans carry arrangement fees, insurance options, and qualification requirements that change the outcome, and debt-relief programs have credit-score consequences. A licensed advisor or accredited credit counsellor can assess your complete situation." />
    </div>
  );
}

/* ---------------- Quick tips tab ---------------------------------------- */

function FinanceTips() {
  const sections = [
    {
      icon: Wallet,
      title: 'Budgeting Fundamentals',
      tips: [
        'Track every expense for one month before setting a budget - most people underestimate spending by 20% or more.',
        'Use the 50/30/20 rule as a starting point: 50% needs, 30% wants, 20% savings - then adjust to your reality.',
        'Automate your savings on payday. Money you never see is money you never spend.',
        'Review subscriptions quarterly - small recurring charges quietly consume budgets.',
      ],
    },
    {
      icon: PiggyBank,
      title: 'Saving & Emergency Funds',
      tips: [
        'Build an emergency fund covering 3-6 months of essential expenses before investing aggressively.',
        'Keep the emergency fund in a separate high-interest savings account - accessible, but not too accessible.',
        'Save for specific goals with deadlines (use the Savings Goal calculator above) - vague goals rarely get funded.',
        'Windfalls (bonuses, gifts, tax refunds) are savings accelerators: bank at least half before lifestyle absorbs it.',
      ],
    },
    {
      icon: LineChart,
      title: 'Investing Wisely',
      tips: [
        'Start early - compound interest rewards time in the market far more than timing the market.',
        'Diversify: never concentrate your savings in one stock, one sector, or one asset class.',
        'Consistent monthly contributions beat sporadic large investments (see the Investment calculator above).',
        'If a return sounds too good to be true, it is. High guaranteed returns are the signature of scams.',
        'Understand every fee - a 2% annual fee can consume a third of your returns over 30 years.',
      ],
    },
    {
      icon: Shield,
      title: 'Insurance Essentials',
      tips: [
        'Insure against catastrophes first: health, life (if anyone depends on your income), and liability cover.',
        'A higher deductible lowers your premium - pair it with your emergency fund to save on cover you rarely use.',
        'Term life insurance is dramatically cheaper than whole-life for pure protection; invest the difference.',
        'Review your policies yearly and after every major life event - marriage, children, a new home or business.',
        'Never let a policy lapse silently: an uncovered week is all it takes.',
      ],
    },
    {
      icon: Landmark,
      title: 'Managing Debt',
      tips: [
        'List all debts with their interest rates. Pay minimums on everything, then attack the highest rate first (avalanche method).',
        'If motivation is the struggle, clear the smallest balance first (snowball method) - momentum matters.',
        'Consolidate high-interest debt only if the new rate is genuinely lower after fees.',
        'Avoid borrowing for depreciating assets when possible; reserve debt capacity for appreciating ones.',
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {sections.map((s) => (
        <div key={s.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <s.icon className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{s.title}</h3>
          </div>
          <ul className="space-y-3">
            {s.tips.map((t, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-600 leading-relaxed">
                <span className="w-5 h-5 shrink-0 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
