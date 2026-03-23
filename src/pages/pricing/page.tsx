import { useState } from 'react';
import Logo from '../../components/Logo';
import { useNavigate, Link } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for solo testers and small evaluation teams',
    members: '3 members',
    ai: '5 AI / month',
    features: [
      'Up to 3 projects',
      'Up to 3 members',
      'Test case management',
      'Test runs & milestones',
      'Jira integration',
      '5 AI generations / month',
      'Community support',
    ],
    cta: 'Get Started Free',
    highlighted: false,
    icon: 'ri-user-line',
    popular: '',
  },
  {
    name: 'Starter',
    price: '$49',
    period: '/ month',
    description: 'For growing teams that need more power',
    members: '5 members',
    ai: '30 AI / month',
    features: [
      'Up to 10 projects',
      'Up to 5 members',
      'Test case management',
      'Test runs & milestones',
      'Jira integration',
      'Slack & Teams integration',
      '30 AI generations / month',
      'Basic reporting',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
    icon: 'ri-star-line',
    popular: '',
  },
  {
    name: 'Professional',
    price: '$99',
    period: '/ month',
    description: 'Full-featured for professional QA teams',
    members: '20 members',
    ai: '150 AI / month',
    features: [
      'Unlimited projects',
      'Up to 20 members',
      'Test case management',
      'Test runs & milestones',
      'Jira integration',
      'Slack & Teams integration',
      '150 AI generations / month',
      'Advanced reporting',
      'CI/CD Integration',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
    icon: 'ri-vip-crown-line',
    popular: 'Most popular',
  },
  {
    name: 'Enterprise',
    price: '$249',
    period: '/ month',
    description: 'For large organizations with advanced needs',
    members: 'Unlimited members',
    ai: 'Unlimited AI',
    features: [
      'Unlimited projects',
      'Unlimited members',
      'Test case management',
      'Test runs & milestones',
      'Jira integration',
      'Slack & Teams integration',
      'Unlimited AI generations',
      'Advanced reporting',
      'CI/CD Integration',
      'Dedicated support',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    highlighted: false,
    icon: 'ri-building-2-line',
    popular: '',
  },
];

const comparisonRows = [
  { feature: 'Projects', free: '3', starter: '10', pro: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Team members', free: '3', starter: '5', pro: '20', enterprise: 'Unlimited' },
  { feature: 'AI generations / month', free: '5', starter: '30', pro: '150', enterprise: 'Unlimited' },
  { feature: 'Test case management', free: true, starter: true, pro: true, enterprise: true },
  { feature: 'Test runs & milestones', free: true, starter: true, pro: true, enterprise: true },
  { feature: 'Jira integration', free: true, starter: true, pro: true, enterprise: true },
  { feature: 'Slack & Teams', free: false, starter: true, pro: true, enterprise: true },
  { feature: 'CI/CD integration', free: false, starter: false, pro: true, enterprise: true },
  { feature: 'Advanced reporting', free: false, starter: false, pro: true, enterprise: true },
  { feature: 'Dedicated support', free: false, starter: false, pro: false, enterprise: true },
  { feature: 'SLA guarantee', free: false, starter: false, pro: false, enterprise: true },
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
    a: 'Yes. All paid plans include a 14-day free trial with full access to every feature. No credit card required.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Annual billing with a 20% discount is coming soon. Subscribe to our newsletter for updates.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards (Visa, Mastercard, American Express) and process payments securely via Stripe.',
  },
];

function CheckIcon({ checked }: { checked: boolean }) {
  if (checked) return <i className="ri-check-line text-teal-500 text-base"></i>;
  return <i className="ri-subtract-line text-gray-300 text-base"></i>;
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <SEOHead
        title="Pricing | Testably — Flat-Rate QA Test Management"
        description="Testably pricing: Free $0, Starter $49, Professional $99, Enterprise $249. Flat-rate plans — no per-seat charges. 14-day free trial on all paid plans."
        keywords="testably pricing, QA tool pricing, test management cost, flat rate QA software"
      />
      <div className="min-h-screen bg-white" style={{ fontFamily: '"Inter", "Noto Sans KR", sans-serif' }}>
        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="cursor-pointer">
              <Logo variant="light" className="h-9" />
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/features')} className="text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">Features</button>
              <button onClick={() => navigate('/auth')} className="text-sm font-semibold px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-all cursor-pointer">Log in</button>
              <button onClick={() => navigate('/auth')} className="text-sm font-semibold px-5 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all cursor-pointer">Get Started</button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="py-20 bg-gray-950 text-center relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-teal-500/10 blur-[120px]"></div>
          <div className="relative z-10 max-w-2xl mx-auto px-6">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <i className="ri-price-tag-3-line text-teal-300 text-sm"></i>
              <span className="text-teal-200 text-sm font-medium">Pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">Plans that scale with your team</h1>
            <p className="text-white/50 text-lg">Flat-rate pricing. No per-seat charges. All paid plans include a 14-day free trial.</p>
          </div>
        </header>

        {/* Plan Cards */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 items-start">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`rounded-2xl p-6 border flex flex-col transition-all ${
                    plan.highlighted
                      ? 'bg-teal-500 border-teal-500 shadow-xl shadow-teal-200 scale-[1.02]'
                      : 'bg-white border-gray-200 hover:border-teal-200 hover:shadow-md'
                  }`}
                >
                  <div className="mb-5">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl mb-3 ${plan.highlighted ? 'bg-white/20' : 'bg-teal-50'}`}>
                      <i className={`${plan.icon} text-xl ${plan.highlighted ? 'text-white' : 'text-teal-600'}`}></i>
                    </div>
                    {plan.popular && (
                      <div className="inline-flex items-center gap-1 bg-white/25 rounded-full px-3 py-1 mb-2">
                        <i className="ri-star-fill text-white text-xs"></i>
                        <span className="text-white text-xs font-semibold">{plan.popular}</span>
                      </div>
                    )}
                    <h3 className={`text-lg font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                    <p className={`text-xs leading-relaxed ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>{plan.description}</p>
                  </div>

                  <div className={`mb-5 pb-5 border-b ${plan.highlighted ? 'border-white/20' : 'border-gray-100'}`}>
                    <span className={`text-3xl font-black ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                    <span className={`text-xs ml-1.5 ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>{plan.period}</span>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <div className={`w-4 h-4 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${plan.highlighted ? 'bg-white/25' : 'bg-teal-100'}`}>
                          <i className={`ri-check-line text-xs ${plan.highlighted ? 'text-white' : 'text-teal-600'}`}></i>
                        </div>
                        <span className={`text-xs leading-relaxed ${plan.highlighted ? 'text-white/90' : 'text-gray-700'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.cta === 'Contact Sales' ? (
                    <a
                      href="mailto:hello@testably.app?subject=Enterprise%20Plan%20Inquiry"
                      className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer whitespace-nowrap block text-center ${
                        plan.highlighted ? 'bg-white text-teal-600 hover:bg-gray-50' : 'bg-teal-500 text-white hover:bg-teal-600'
                      }`}
                    >
                      {plan.cta}
                    </a>
                  ) : (
                    <button
                      onClick={() => navigate('/auth')}
                      className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
                        plan.highlighted ? 'bg-white text-teal-600 hover:bg-gray-50' : 'bg-teal-500 text-white hover:bg-teal-600'
                      }`}
                    >
                      {plan.cta}
                    </button>
                  )}
                </article>
              ))}
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
                  <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <i className={`${c.icon} text-teal-600 text-xl`}></i>
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
                    <th className="text-left px-6 py-4 font-semibold text-gray-700 w-1/3">Feature</th>
                    <th className="text-center px-4 py-4 font-semibold text-gray-700">Free</th>
                    <th className="text-center px-4 py-4 font-semibold text-gray-700">Starter</th>
                    <th className="text-center px-4 py-4 font-semibold text-teal-600">Professional</th>
                    <th className="text-center px-4 py-4 font-semibold text-gray-700">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={row.feature} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-6 py-3.5 text-gray-700 font-medium">{row.feature}</td>
                      {(['free', 'starter', 'pro', 'enterprise'] as const).map((col) => {
                        const val = row[col];
                        return (
                          <td key={col} className={`text-center px-4 py-3.5 ${col === 'pro' ? 'bg-teal-50/50' : ''}`}>
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
                <article key={i} className={`rounded-2xl border transition-all duration-200 overflow-hidden ${openFaq === i ? 'border-teal-200 bg-teal-50/40' : 'border-gray-100 bg-white hover:border-teal-100'}`}>
                  <button
                    className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer group"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className={`text-sm font-semibold pr-4 transition-colors ${openFaq === i ? 'text-teal-700' : 'text-gray-900 group-hover:text-teal-700'}`}>{faq.q}</span>
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 transition-all ${openFaq === i ? 'bg-teal-500 rotate-45' : 'bg-gray-100 group-hover:bg-teal-100'}`}>
                      <i className={`ri-add-line text-sm ${openFaq === i ? 'text-white' : 'text-gray-500 group-hover:text-teal-600'}`}></i>
                    </div>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5">
                      <div className="h-px bg-teal-100 mb-4"></div>
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
                  className="flex-1 border border-gray-300 hover:border-teal-400 hover:bg-teal-50 text-gray-700 hover:text-teal-700 font-medium text-sm px-5 py-3 rounded-lg transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-20 bg-gray-950 text-center relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[120px]"></div>
          <div className="relative z-10 max-w-2xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Start for free today</h2>
            <p className="text-white/50 mb-8">No credit card required. Set up in under 5 minutes. Cancel anytime.</p>
            <button
              onClick={() => navigate('/auth')}
              className="px-10 py-4 bg-teal-500 text-white rounded-xl font-bold text-lg hover:bg-teal-400 transition-all cursor-pointer shadow-lg shadow-teal-500/30"
            >
              Get Started Free
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-100 py-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo variant="light" className="h-7" />
            <p className="text-gray-400 text-xs">© {new Date().getFullYear()} Testably. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
