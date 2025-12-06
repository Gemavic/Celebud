import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, Star, Zap, Crown } from 'lucide-react';

interface SubscriptionTier {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  ad_free: boolean;
  early_access: boolean;
  display_order: number;
}

export function SubscriptionPlans() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    loadTiers();
  }, []);

  async function loadTiers() {
    const { data } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (data) {
      setTiers(data.map(tier => ({
        ...tier,
        features: Array.isArray(tier.features) ? tier.features : [],
      })) as SubscriptionTier[]);
    }
  }

  const tierIcons = {
    Free: Star,
    Premium: Zap,
    VIP: Crown,
  };

  const tierColors = {
    Free: 'from-gray-500 to-gray-600',
    Premium: 'from-blue-500 to-blue-600',
    VIP: 'from-purple-500 to-purple-600',
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Unlock premium content and enjoy an ad-free experience
        </p>

        <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              billingPeriod === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Yearly
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {tiers.map((tier) => {
          const Icon = tierIcons[tier.name as keyof typeof tierIcons] || Star;
          const colorClass = tierColors[tier.name as keyof typeof tierColors] || tierColors.Free;
          const price = billingPeriod === 'monthly' ? tier.price_monthly : tier.price_yearly / 12;
          const isPopular = tier.name === 'Premium';

          return (
            <div
              key={tier.id}
              className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition-all ${
                isPopular ? 'ring-4 ring-blue-500' : ''
              }`}
            >
              {isPopular && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-sm font-bold">
                  POPULAR
                </div>
              )}

              <div className={`bg-gradient-to-r ${colorClass} p-6 text-white`}>
                <Icon className="w-12 h-12 mb-4" />
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">${price.toFixed(2)}</span>
                  <span className="ml-2 text-sm opacity-75">/month</span>
                </div>
                {billingPeriod === 'yearly' && (
                  <p className="text-sm mt-1 opacity-75">
                    Billed ${tier.price_yearly.toFixed(2)} yearly
                  </p>
                )}
              </div>

              <div className="p-6">
                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 px-6 rounded-lg font-bold transition-all ${
                    tier.name === 'Free'
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : `bg-gradient-to-r ${colorClass} text-white hover:opacity-90 shadow-lg`
                  }`}
                >
                  {tier.name === 'Free' ? 'Current Plan' : 'Upgrade Now'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center text-gray-600">
        <p className="text-sm">
          All plans include access to our newsletter and basic content.
          Cancel anytime, no questions asked.
        </p>
      </div>
    </section>
  );
}
