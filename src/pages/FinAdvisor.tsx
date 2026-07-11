// src/pages/FinAdvisor.tsx
// FIN-ADVISOR: a dedicated hub for financial & insurance education at
// /fin-advisor. Modeled on the dates.care Education Center: quick topic
// cards, an Investment Calculator, a Savings Goal Calculator, and a
// 50/30/20 Budget Analyzer - plus articles restricted to the finance and
// insurance categories only.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { buildArticleUrl } from '../utils/articleUrl';
import {
  Banknote,
  BookOpen,
  Calculator,
  Clock,
  Landmark,
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

export function FinAdvisor() {
  const [tab, setTab] = useState<FinTab>('calculators');
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

  const topics = [
    { icon: Wallet, title: 'Smart Budgeting', sub: 'Track income, expenses & the 50/30/20 rule' },
    { icon: LineChart, title: 'Saving & Investing', sub: 'Grow wealth with compound interest' },
    { icon: Shield, title: 'Insurance Basics', sub: 'Protect what matters - health, life, auto & home' },
    { icon: Landmark, title: 'Debt Management', sub: 'Pay down debt without losing momentum' },
  ];

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
              Learn, plan, and build a strong financial foundation - budgeting tools, savings and
              investment calculators, insurance guidance, and the latest finance news in one place.
            </p>
          </div>

          {/* Quick Access */}
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {topics.map((t) => (
              <button
                key={t.title}
                onClick={() => setTab('tips')}
                className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                  <t.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="font-semibold text-gray-900">{t.title}</p>
                <p className="text-sm text-gray-500 mt-1">{t.sub}</p>
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-8">
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

          {tab === 'tips' && <FinanceTips />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Calculators (cloned from the dates.care Education
   Center: same inputs, same results, restyled for CelebUD) ------------- */

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
              ['Needs (50%)', income * 0.5, 'bg-emerald-500'],
              ['Wants (30%)', income * 0.3, 'bg-blue-500'],
              ['Savings (20%)', income * 0.2, 'bg-purple-500'],
            ] as [string, number, string][]).map(([label, value, bar]) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-semibold text-gray-900">{fmt(value)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${bar} rounded-full`} style={{ width: label.startsWith('Needs') ? '50%' : label.startsWith('Wants') ? '30%' : '20%' }} />
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

/* ---------------- Education tips: finance + insurance ------------------ */

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
