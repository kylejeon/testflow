import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import SEOHead from '../../components/SEOHead';

const differentiators = [
  {
    icon: 'ri-sparkling-2-line',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'AI-Native From Day One',
    desc: "We built with AI at the core. Our test case generator — including the unique Session-to-TestCase mode — is a capability no other platform offers.",
  },
  {
    icon: 'ri-hand-coin-line',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    title: 'Flat-Rate, Team-First Pricing',
    desc: 'One price covers your whole team. Adding a member costs nothing extra. Pricing should encourage collaboration, not penalize it.',
  },
  {
    icon: 'ri-terminal-box-line',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    title: 'Built for Modern QA',
    desc: 'From exploratory sessions to CI/CD pipelines, Testably covers manual and automated workflows with integrations you already use.',
  },
  {
    icon: 'ri-map-2-line',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Transparent & Community-Driven',
    desc: 'Our roadmap is public. Our changelog is detailed. Your feedback shapes every release.',
  },
];

const values = [
  {
    icon: 'ri-heart-line',
    title: 'Quality is for everyone',
    desc: "Great QA tools shouldn't require an enterprise budget.",
  },
  {
    icon: 'ri-lightbulb-line',
    title: 'Simplicity over complexity',
    desc: "Powerful but not complicated. If it takes a manual, we haven't done our job.",
  },
  {
    icon: 'ri-rocket-line',
    title: 'Ship fast, listen faster',
    desc: 'Frequent releases, constant feedback. Our best features come from our users.',
  },
  {
    icon: 'ri-robot-line',
    title: 'AI as a teammate',
    desc: "AI augments human judgment, not replaces it. AI suggests; your team decides.",
  },
];

const stats = [
  { value: '500+', label: 'Teams using Testably' },
  { value: '50k+', label: 'Test cases managed' },
  { value: '4.8/5', label: 'Average rating' },
  { value: '< 5min', label: 'Setup to first test run' },
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="About | Testably — Our Mission and Story"
        description="Learn about Testably — our mission to make great QA tools accessible to every software team, our values, and what makes us different."
        keywords="about testably, QA platform mission, test management company, flat rate QA tools"
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
              <button onClick={() => navigate('/pricing')} className="text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">Pricing</button>
              <button onClick={() => navigate('/auth')} className="text-sm font-semibold px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-all cursor-pointer">Log in</button>
              <button onClick={() => navigate('/auth')} className="text-sm font-semibold px-5 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all cursor-pointer">Get Started</button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="py-24 bg-gray-950 text-center relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-indigo-500/10 blur-[140px]"></div>
          <div className="relative z-10 max-w-3xl mx-auto px-6">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <i className="ri-information-line text-indigo-300 text-sm"></i>
              <span className="text-indigo-200 text-sm font-medium">About Us</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Great QA tools for every team
            </h1>
            <p className="text-white/50 text-lg leading-relaxed">
              We believe every software team deserves great QA tools, not just the ones with enterprise budgets.
            </p>
          </div>
        </header>

        {/* Mission */}
        <section className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-6">
              <i className="ri-focus-3-line text-indigo-600 text-sm"></i>
              <span className="text-indigo-700 text-sm font-medium">Our Mission</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">We're changing how QA teams work</h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              Test management has been dominated by expensive, per-user tools that punish growing teams. We're changing that.
              Testably offers a full-featured platform with AI capabilities at a flat rate that covers your whole team.
            </p>
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
                <i className="ri-award-line text-indigo-600 text-sm"></i>
                <span className="text-indigo-700 text-sm font-medium">What Makes Us Different</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Built different, on purpose</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {differentiators.map((d) => (
                <article key={d.title} className="bg-white rounded-2xl p-7 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${d.iconBg}`}>
                    <i className={`${d.icon} text-2xl ${d.iconColor}`}></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{d.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{d.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
                <i className="ri-compass-3-line text-indigo-600 text-sm"></i>
                <span className="text-indigo-700 text-sm font-medium">Our Values</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">What we believe</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {values.map((v) => (
                <article key={v.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all text-center">
                  <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <i className={`${v.icon} text-indigo-600 text-xl`}></i>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-sm">{v.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{v.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-gray-950">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-3xl font-black text-indigo-400 mb-1">{s.value}</div>
                  <div className="text-sm text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact + CTA */}
        <section className="py-20 bg-indigo-500 text-center">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Get in touch</h2>
            <p className="text-indigo-100 mb-8">
              Have a question, a feature request, or just want to say hi? We'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:hello@testably.app"
                className="px-8 py-3.5 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-50 transition-all cursor-pointer inline-flex items-center gap-2 justify-center"
              >
                <i className="ri-mail-line"></i>
                hello@testably.app
              </a>
              <button
                onClick={() => navigate('/auth')}
                className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all cursor-pointer"
              >
                Start for Free
              </button>
            </div>
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
