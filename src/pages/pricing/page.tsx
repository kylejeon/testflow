import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MarketingLayout from '../../components/marketing/MarketingLayout';
import { supabase } from '../../lib/supabase';
import { getPaymentProvider, openCheckout } from '../../lib/payment';
import { sendLoopsEvent } from '../../lib/loops';

const plans = [
  {
    name: 'Free',
    tier: 1,
    monthlyPrice: 0,
    annualPrice: 0,
    annualMonthly: 0,
    period: 'forever',
    description: 'Perfect for solo testers getting started',
    members: '2 members',
    ai: '3 AI / month',
    basePlan: null,
    features: [
      '1 project',
      'Up to 2 members',
      'Up to 100 test cases / project',
      'Test case management',
      'Test runs & milestones (10 / month)',
      'TC Versioning',
      'Jira integration (read-only)',
      '3 AI generations / month',
    ],
    cta: 'Get Started',
    highlighted: false,
    icon: 'ri-user-line',
    popular: '',
  },
  {
    name: 'Hobby',
    tier: 2,
    monthlyPrice: 19,
    annualPrice: 194,
    annualMonthly: 16,
    period: '/ month',
    description: 'For individuals and small teams ramping up',
    members: '5 members',
    ai: '15 AI / month',
    basePlan: 'Free',
    features: [
      '3 projects · 5 members',
      'Up to 200 test cases / project',
      'Unlimited test runs',
      'Jira full integration',
      'Export/Import CSV',
      'Requirements & Traceability',
      'Steps Library (10 steps)',
      '15 AI generations / month',
    ],
    cta: 'Get Started',
    highlighted: false,
    icon: 'ri-seedling-line',
    popular: '',
  },
  {
    name: 'Starter',
    tier: 3,
    monthlyPrice: 49,
    annualPrice: 499,
    annualMonthly: 42,
    period: '/ month',
    description: 'For growing teams that need more power',
    members: '5 members',
    ai: '30 AI / month',
    basePlan: 'Hobby',
    features: [
      '10 projects · 5 members',
      'Unlimited test cases',
      'Slack & Teams integration',
      'AI Run Summary',
      'Flaky Detection AI',
      'Coverage Gap Analysis',
      'AI Insights Panel',
      'Requirements & Traceability',
      'Steps Library (20 steps)',
      'Basic reporting · email support',
      '30 AI generations / month',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
    icon: 'ri-star-line',
    popular: '',
  },
  {
    name: 'Professional',
    tier: 4,
    monthlyPrice: 99,
    annualPrice: 1009,
    annualMonthly: 84,
    period: '/ month',
    description: 'Full-featured for professional QA teams',
    members: '20 members',
    ai: '150 AI / month',
    basePlan: 'Starter',
    features: [
      'Unlimited projects · up to 20 members',
      'RTM: Audit Trail + AI Coverage Gap',
      'Steps Library (Unlimited)',
      'CI/CD Integration',
      'Test Automation Framework SDK',
      'Advanced reporting',
      'Priority support',
      '150 AI generations / month',
    ],
    cta: 'Get Started',
    highlighted: true,
    icon: 'ri-vip-crown-line',
    popular: 'Most popular',
  },
];

const enterpriseTiers = [
  {
    name: 'Enterprise S',
    price: '$249',
    period: '/ month',
    description: 'For teams scaling beyond 20 members',
    members: '21–50 members',
    basePlan: 'Professional',
    features: [
      '21–50 team members',
      'Unlimited AI generations',
      'RTM: Audit Trail + Jira sync',
      'Steps Library (Full version history)',
      'Dedicated support',
      'SLA guarantee',
    ],
    cta: 'Get Started',
    icon: 'ri-building-2-line',
  },
  {
    name: 'Enterprise M',
    price: '$499',
    period: '/ month',
    description: 'For mid-size organizations with larger teams',
    members: '51–100 members',
    basePlan: 'Enterprise S',
    features: [
      '51–100 team members',
    ],
    cta: 'Get Started',
    icon: 'ri-building-4-line',
  },
  {
    name: 'Enterprise L',
    price: 'Custom',
    period: '',
    description: 'For large enterprises with 100+ members',
    members: '100+ members',
    basePlan: 'Enterprise M',
    features: [
      '100+ team members',
      'Custom contract & SLA',
      'Dedicated infrastructure',
    ],
    cta: 'Contact Us',
    icon: 'ri-government-line',
  },
];

const comparisonRows = [
  { feature: 'Projects', free: '1', hobby: '3', starter: '10', pro: 'Unlimited', entS: 'Unlimited', entM: 'Unlimited', entL: 'Unlimited' },
  { feature: 'Team members', free: '2', hobby: '5', starter: '5', pro: '20', entS: '21–50', entM: '51–100', entL: '100+' },
  { feature: 'Test cases / project', free: '100', hobby: '200', starter: 'Unlimited', pro: 'Unlimited', entS: 'Unlimited', entM: 'Unlimited', entL: 'Unlimited' },
  { feature: 'AI generations / month', free: '3', hobby: '15', starter: '30', pro: '150', entS: 'Unlimited', entM: 'Unlimited', entL: 'Unlimited' },
  { feature: 'Test runs / month', free: '10', hobby: 'Unlimited', starter: 'Unlimited', pro: 'Unlimited', entS: 'Unlimited', entM: 'Unlimited', entL: 'Unlimited' },
  { feature: 'Run history retention', free: '30 days', hobby: '90 days', starter: '1 year', pro: '2 years', entS: 'Unlimited', entM: 'Unlimited', entL: 'Unlimited' },
  { feature: 'Test case management', free: true, hobby: true, starter: true, pro: true, entS: true, entM: true, entL: true },
  { feature: 'TC Versioning', free: true, hobby: true, starter: true, pro: true, entS: true, entM: true, entL: true },
  { feature: 'Suggest Edge Cases (AI)', free: true, hobby: true, starter: true, pro: true, entS: true, entM: true, entL: true },
  { feature: 'Jira integration', free: 'Read-only', hobby: 'Full', starter: 'Full', pro: 'Full', entS: 'Full', entM: 'Full', entL: 'Full' },
  { feature: 'GitHub integration', free: false, hobby: false, starter: true, pro: true, entS: true, entM: true, entL: true },
  { feature: 'Export/Import CSV', free: false, hobby: true, starter: true, pro: true, entS: true, entM: true, entL: true },
  { feature: 'RTM / Traceability', free: false, hobby: true, starter: true, pro: true, entS: true, entM: true, entL: true },
  { feature: 'Steps Library', free: false, hobby: '10 steps', starter: '20 steps', pro: 'Unlimited', entS: 'Full history', entM: 'Full history', entL: 'Full history' },
  { feature: 'Slack & Teams', free: false, hobby: false, starter: true, pro: true, entS: true, entM: true, entL: true },
  { feature: 'AI Run Summary', free: false, hobby: false, starter: true, pro: true, entS: true, entM: true, entL: true },
  { feature: 'Flaky Detection AI', free: false, hobby: false, starter: true, pro: true, entS: true, entM: true, entL: true },
  { feature: 'Coverage Gap Analysis', free: false, hobby: false, starter: true, pro: true, entS: true, entM: true, entL: true },
  { feature: 'AI Insights Panel', free: false, hobby: false, starter: true, pro: true, entS: true, entM: true, entL: true },
  { feature: 'CI/CD integration', free: false, hobby: false, starter: false, pro: true, entS: true, entM: true, entL: true },
  { feature: 'Test Automation Framework SDK', free: false, hobby: false, starter: false, pro: true, entS: true, entM: true, entL: true },
  { feature: 'Advanced reporting', free: false, hobby: false, starter: false, pro: true, entS: true, entM: true, entL: true },
  { feature: 'Support level', free: 'Community', hobby: 'Email', starter: 'Email', pro: 'Priority', entS: 'Dedicated', entM: 'Dedicated', entL: 'Dedicated' },
  { feature: 'SLA guarantee', free: false, hobby: false, starter: false, pro: false, entS: true, entM: true, entL: true },
  { feature: 'Custom contract & SLA', free: false, hobby: false, starter: false, pro: false, entS: false, entM: false, entL: true },
  { feature: 'Dedicated infrastructure', free: false, hobby: false, starter: false, pro: false, entS: false, entM: false, entL: true },
];

const faqs = [
  {
    q: 'Is the pricing per user?',
    a: 'No. Testably uses flat-rate pricing per workspace. Whether you have 1 member or 20, you pay the same monthly fee. No per-seat charges, ever.',
  },
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes. Upgrade or downgrade at any time. Upgrades take effect immediately. Downgrades apply at the start of your next billing cycle.',
  },
  {
    q: 'What happens when I reach the AI generation limit?',
    a: "You'll see a notification as you approach your monthly limit. To get more AI generations, upgrade to a higher plan.",
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes. All paid plans include a 14-day free trial. Free plan users can also try the Starter plan free for 14 days directly from Settings > Billing. No credit card required.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes! Annual billing is available with a 15% discount on all paid plans. You can switch to annual billing from your account settings at any time.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards (Visa, Mastercard, American Express). Payments are processed securely via Paddle.',
  },
];

function CheckIcon({ checked }: { checked: boolean }) {
  if (checked) return <i className="ri-check-line text-indigo-500 text-base"></i>;
  return <i className="ri-subtract-line text-gray-300 text-base"></i>;
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [userSession, setUserSession] = useState<{
    id: string;
    email: string;
    payment_provider?: string | null;
    subscription_tier?: number;
    is_trial?: boolean;
    trial_started_at?: string | null;
    trial_ends_at?: string | null;
  } | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('profiles')
        .select('id, payment_provider, subscription_tier, is_trial, trial_started_at, trial_ends_at')
        .eq('id', user.id)
        .maybeSingle();
      setUserSession({
        id: user.id,
        email: user.email || '',
        payment_provider: data?.payment_provider ?? null,
        subscription_tier: data?.subscription_tier ?? 1,
        is_trial: data?.is_trial ?? false,
        trial_started_at: data?.trial_started_at ?? null,
        trial_ends_at: data?.trial_ends_at ?? null,
      });
    });
  }, []);

  const currentTier = userSession?.subscription_tier ?? null;

  // Trial state helpers
  const trialUsed = !!(userSession?.trial_started_at);
  const trialActive = !!(userSession?.is_trial && userSession?.trial_ends_at && new Date(userSession.trial_ends_at) > new Date());
  const trialDaysLeft = trialActive && userSession?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(userSession.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  const startTrial = async () => {
    if (!userSession) { navigate('/auth'); return; }
    if (trialUsed) return; // 1회 제한
    setTrialLoading(true);
    try {
      const now = new Date();
      const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const { error } = await supabase.from('profiles').update({
        subscription_tier: 3,
        is_trial: true,
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
      }).eq('id', userSession.id);
      if (error) throw error;
      // Fire-and-forget Loops event
      if (userSession.email) {
        sendLoopsEvent(userSession.email, 'trial_started', {
          planType: 'trial',
          planName: 'Starter',
          trialStartDate: now.toISOString().split('T')[0],
          trialEndDate: trialEnds.toISOString().split('T')[0],
          trialEndsAt: trialEnds.toISOString(),
          trialDaysLeft: '14',
          trialDaysTotal: '14',
        });
      }
      setUserSession(prev => prev ? {
        ...prev,
        subscription_tier: 3,
        is_trial: true,
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
      } : prev);
    } catch (err) {
      console.error('Failed to start trial:', err);
    } finally {
      setTrialLoading(false);
    }
  };

  const handlePlanCta = async (planName: string) => {
    if (planName === 'Free') { navigate('/auth'); return; }
    if (!userSession) { navigate('/auth'); return; }
    const provider = getPaymentProvider(userSession);
    await openCheckout(planName, billingPeriod, provider, userSession.email, userSession.id);
  };

  return (
    <MarketingLayout
      title="Pricing — Testably | Free, Hobby, Professional, Enterprise Plans"
      description="Simple flat-rate pricing for QA teams. Free plan forever, Hobby $19/mo, Professional $99/mo. No per-seat fees. All paid plans include a 14-day free trial."
      keywords="testably pricing, QA tool pricing, test management cost, flat rate QA software, free QA tool, test management plans"
      showCTA={false}
    >

        {/* Hero */}
        <header className="py-20 bg-gray-950 text-center relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
          <div className="relative z-10 max-w-2xl mx-auto px-6">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <i className="ri-price-tag-3-line text-indigo-300 text-sm"></i>
              <span className="text-indigo-200 text-sm font-medium">Pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">Plans that scale with your team</h1>
            <p className="text-white/50 text-lg mb-8">Flat-rate pricing. No per-seat charges. All paid plans include a 14-day free trial.</p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-1 bg-white/10 border border-white/20 rounded-full p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  billingPeriod === 'monthly' ? 'bg-white text-gray-900' : 'text-white/70 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingPeriod === 'annual' ? 'bg-white text-gray-900' : 'text-white/70 hover:text-white'
                }`}
              >
                Annual
                <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                  Save 15%
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Plan Cards */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            {/* Free / Hobby / Starter / Professional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 items-stretch mb-6">
              {plans.map((plan) => {
                const isCurrentPlan = currentTier === plan.tier;
                const displayPrice = billingPeriod === 'annual' && plan.annualMonthly > 0
                  ? `$${plan.annualMonthly}`
                  : plan.monthlyPrice === 0 ? '$0' : `$${plan.monthlyPrice}`;
                const savingsPerYear = plan.monthlyPrice > 0
                  ? plan.monthlyPrice * 12 - plan.annualPrice
                  : 0;

                return (
                  <article
                    key={plan.name}
                    className={`rounded-2xl p-6 border flex flex-col transition-all relative h-full ${
                      plan.highlighted
                        ? 'bg-indigo-500 border-indigo-500 shadow-2xl shadow-indigo-300'
                        : 'bg-white border-gray-200 hover:border-indigo-200 hover:shadow-md'
                    } ${isCurrentPlan ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}`}
                  >
                    {isCurrentPlan && (
                      <div
                        className="absolute -top-4 left-1/2 -translate-x-1/2 text-white font-bold text-sm px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-1.5 shadow-md"
                        style={{ backgroundColor: '#059669' }}
                      >
                        <i className="ri-checkbox-circle-fill"></i>
                        {trialActive && plan.tier === 3
                          ? `Current Plan · Trial — ${trialDaysLeft}d left`
                          : 'Current Plan'}
                      </div>
                    )}

                    <div className="mb-4">
                      <div className={`w-10 h-10 flex items-center justify-center rounded-xl mb-3 ${plan.highlighted ? 'bg-white/20' : 'bg-indigo-50'}`}>
                        <i className={`${plan.icon} text-xl ${plan.highlighted ? 'text-white' : 'text-indigo-600'}`}></i>
                      </div>
                      {plan.popular && (
                        <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 mb-2 ${plan.highlighted ? 'bg-white/25' : 'bg-indigo-100'}`}>
                          <i className={`ri-star-fill text-xs ${plan.highlighted ? 'text-white' : 'text-indigo-600'}`}></i>
                          <span className={`text-xs font-semibold ${plan.highlighted ? 'text-white' : 'text-indigo-700'}`}>{plan.popular}</span>
                        </div>
                      )}
                      <h3 className={`text-lg font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                      <p className={`text-xs leading-relaxed ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>{plan.description}</p>
                    </div>

                    <div className={`mb-4 pb-4 border-b ${plan.highlighted ? 'border-white/20' : 'border-gray-100'}`}>
                      <span className={`text-3xl font-black ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{displayPrice}</span>
                      {plan.monthlyPrice > 0 && (
                        <span className={`text-xs ml-1.5 ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>
                          {billingPeriod === 'annual' ? '/ mo · billed annually' : '/ month'}
                        </span>
                      )}
                      {plan.monthlyPrice === 0 && (
                        <span className={`text-xs ml-1.5 ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>forever</span>
                      )}
                      {billingPeriod === 'annual' && savingsPerYear > 0 && (
                        <div className={`text-[10px] font-semibold mt-1 ${plan.highlighted ? 'text-emerald-200' : 'text-emerald-600'}`}>
                          Save ${savingsPerYear}/year
                        </div>
                      )}
                    </div>

                    <ul className="space-y-2.5 mb-6 flex-1">
                      {plan.basePlan && (
                        <li className={`text-xs font-semibold mb-1 ${plan.highlighted ? 'text-white/60' : 'text-gray-400'}`}>
                          Everything in {plan.basePlan}, plus:
                        </li>
                      )}
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <div className={`w-4 h-4 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${plan.highlighted ? 'bg-white/25' : 'bg-indigo-100'}`}>
                            <i className={`ri-check-line text-xs ${plan.highlighted ? 'text-white' : 'text-indigo-600'}`}></i>
                          </div>
                          <span className={`text-xs leading-relaxed ${plan.highlighted ? 'text-white/90' : 'text-gray-700'}`}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {(() => {
                      // Starter card (tier 3) — trial-aware CTAs
                      if (plan.tier === 3) {
                        if (isCurrentPlan) {
                          return (
                            <button disabled className="w-full py-2.5 rounded-xl text-sm text-center bg-gray-200 text-gray-700 font-semibold cursor-not-allowed">
                              {trialActive ? `Trial — ${trialDaysLeft}d left` : 'Current Plan'}
                            </button>
                          );
                        }
                        if (!userSession) {
                          return (
                            <button
                              onClick={() => navigate('/auth')}
                              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer bg-indigo-500 text-white hover:bg-indigo-600"
                            >
                              Start Free Trial
                            </button>
                          );
                        }
                        if (currentTier === 1 && !trialUsed) {
                          return (
                            <button
                              onClick={startTrial}
                              disabled={trialLoading}
                              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {trialLoading ? 'Starting…' : 'Start 14-day Free Trial'}
                            </button>
                          );
                        }
                        if (currentTier === 1 && trialUsed) {
                          return (
                            <button
                              onClick={() => handlePlanCta(plan.name)}
                              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer bg-indigo-500 text-white hover:bg-indigo-600"
                            >
                              Upgrade to Starter
                            </button>
                          );
                        }
                      }
                      // Default: current plan or standard CTA
                      if (isCurrentPlan) {
                        return (
                          <button disabled className="w-full py-2.5 rounded-xl text-sm text-center bg-gray-200 text-gray-700 font-semibold cursor-not-allowed">
                            Current Plan
                          </button>
                        );
                      }
                      return (
                        <button
                          onClick={() => handlePlanCta(plan.name)}
                          className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
                            plan.highlighted ? 'bg-white text-indigo-600 hover:bg-gray-50' : 'bg-indigo-500 text-white hover:bg-indigo-600'
                          }`}
                        >
                          {plan.cta}
                        </button>
                      );
                    })()}
                  </article>
                );
              })}
            </div>

            {/* Enterprise Tiers */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                  <i className="ri-building-2-line text-amber-700 text-base"></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Enterprise Plans</h3>
                  <p className="text-xs text-gray-500">For teams of 21 and above — dedicated support, SLA, and unlimited AI</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {enterpriseTiers.map((tier) => (
                  <div key={tier.name} className="bg-white rounded-xl border border-amber-200 p-4 flex flex-col hover:border-amber-400 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className={`${tier.icon} text-amber-700 text-sm`}></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{tier.name}</h4>
                        <p className="text-xs text-gray-500">{tier.members}</p>
                      </div>
                    </div>

                    <div className="mb-4 pb-4 border-b border-gray-100">
                      <span className="text-2xl font-black text-gray-900">{tier.price}</span>
                      {tier.period && <span className="text-xs ml-1.5 text-gray-500">{tier.period}</span>}
                    </div>

                    <ul className="space-y-2 mb-4 flex-1">
                      {tier.basePlan && (
                        <li className="text-xs font-semibold text-amber-500 mb-1">
                          Everything in {tier.basePlan}, plus:
                        </li>
                      )}
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <div className="w-3.5 h-3.5 bg-amber-100 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5">
                            <i className="ri-check-line text-amber-700" style={{ fontSize: '9px' }}></i>
                          </div>
                          <span className="text-xs text-gray-700">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {tier.cta === 'Contact Us' ? (
                      <a
                        href="mailto:hello@testably.app?subject=Enterprise%20Plan%20Inquiry"
                        className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer whitespace-nowrap block text-center border-2 border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-white"
                      >
                        {tier.cta}
                      </a>
                    ) : (
                      <button
                        onClick={() => handlePlanCta(tier.name)}
                        className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer whitespace-nowrap bg-amber-600 text-white hover:bg-amber-700"
                      >
                        {tier.cta}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why flat-rate? */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Why flat-rate pricing?</h2>
            <p className="text-gray-500 text-base mb-10 max-w-2xl mx-auto">
              Test management has been dominated by expensive per-user tools that punish growing teams. We believe pricing should encourage collaboration, not penalize it. One price covers your whole workspace — add a new member and pay nothing extra.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: 'ri-team-line', title: 'Team-first', desc: 'Adding a new team member costs nothing extra. Invite your whole QA team freely.' },
                { icon: 'ri-bar-chart-line', title: 'Predictable costs', desc: 'Know exactly what you pay each month. No surprises as your team grows.' },
                { icon: 'ri-heart-line', title: 'Built for collaboration', desc: 'More people reviewing test results means better software. We price accordingly.' },
              ].map((c) => (
                <div key={c.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <i className={`${c.icon} text-indigo-600 text-xl`}></i>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{c.title}</h3>
                  <p className="text-gray-500 text-sm">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">Full comparison</h2>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-4 font-semibold text-gray-700 w-1/5">Feature</th>
                    <th className="text-center px-4 py-4 font-semibold text-gray-700">Free</th>
                    <th className="text-center px-4 py-4 font-semibold text-emerald-600">
                      <div>Hobby</div>
                      <div className="text-xs font-normal text-emerald-400">$19/mo · $194/yr</div>
                    </th>
                    <th className="text-center px-4 py-4 font-semibold text-gray-700">
                      <div>Starter</div>
                      <div className="text-xs font-normal text-gray-400">$49/mo · $499/yr</div>
                    </th>
                    <th className="text-center px-4 py-4 font-semibold text-indigo-600">
                      <div>Professional</div>
                      <div className="text-xs font-normal text-indigo-400">$99/mo · $1,009/yr</div>
                    </th>
                    <th className="text-center px-4 py-4 font-semibold text-orange-500">
                      <div>Enterprise S</div>
                      <div className="text-xs font-normal text-orange-300">$249/mo · $2,540/yr</div>
                    </th>
                    <th className="text-center px-4 py-4 font-semibold text-red-400">
                      <div>Enterprise M</div>
                      <div className="text-xs font-normal text-red-300">$499/mo · $5,090/yr</div>
                    </th>
                    <th className="text-center px-4 py-4 font-semibold text-gray-500">
                      <div>Enterprise L</div>
                      <div className="text-xs font-normal text-gray-400">Custom · 100+ users</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={row.feature} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-6 py-3.5 text-gray-700 font-medium">{row.feature}</td>
                      {(['free', 'hobby', 'starter', 'pro', 'entS', 'entM', 'entL'] as const).map((col) => {
                        const val = (row as any)[col];
                        return (
                          <td key={col} className={`text-center px-4 py-3.5 ${col === 'pro' ? 'bg-indigo-50/50' : ''}`}>
                            {typeof val === 'boolean' ? (
                              <div className="flex justify-center"><CheckIcon checked={val} /></div>
                            ) : (
                              <span className="text-gray-700 text-xs font-medium">{val}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">Frequently asked questions</h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <article key={i} className={`rounded-2xl border transition-all duration-200 overflow-hidden ${openFaq === i ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-100 bg-white hover:border-indigo-100'}`}>
                  <button
                    className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer group"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className={`text-sm font-semibold pr-4 transition-colors ${openFaq === i ? 'text-indigo-700' : 'text-gray-900 group-hover:text-indigo-700'}`}>{faq.q}</span>
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 transition-all ${openFaq === i ? 'bg-indigo-500 rotate-45' : 'bg-gray-100 group-hover:bg-indigo-100'}`}>
                      <i className={`ri-add-line text-sm ${openFaq === i ? 'text-white' : 'text-gray-500 group-hover:text-indigo-600'}`}></i>
                    </div>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-4">
                      <div className="h-px bg-indigo-100 mb-4"></div>
                      <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Compare Section */}
        <section className="py-16 bg-gray-50 border-t border-gray-200">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">See How We Compare</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Switching from another tool?</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {[
                { label: 'Testably vs TestRail', path: '/compare/testrail' },
                { label: 'Testably vs Zephyr Scale', path: '/compare/zephyr' },
                { label: 'Testably vs Qase', path: '/compare/qase' },
              ].map(({ label, path }) => (
                <Link
                  key={path}
                  to={path}
                  className="flex-1 border border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 font-medium text-sm px-5 py-3 rounded-lg transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-20 bg-gray-950 text-center relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
          <div className="relative z-10 max-w-2xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Start for free today</h2>
            <p className="text-white/50 mb-8">No credit card required. Set up in under 5 minutes. Cancel anytime.</p>
            <button
              onClick={() => navigate('/auth')}
              className="px-10 py-4 bg-indigo-500 text-white rounded-xl font-bold text-lg hover:bg-indigo-400 transition-all cursor-pointer shadow-lg shadow-indigo-500/30"
            >
              Get Started Free
            </button>
          </div>
        </section>

    </MarketingLayout>
  );
}
