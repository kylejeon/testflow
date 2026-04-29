import { Link, useNavigate } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';
import MarketingFooter from '../../components/marketing/MarketingFooter';
import MarketingHeader from '../../components/marketing/MarketingHeader';
import { sortedBlogPosts } from './posts';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'Testably Blog',
  description:
    'Practical guides on QA, test automation, CI/CD integration, and choosing the right test management tools — from the team building Testably.',
  url: 'https://testably.app/blog',
  publisher: {
    '@type': 'Organization',
    name: 'Testably',
    logo: { '@type': 'ImageObject', url: 'https://testably.app/brand/og-dark-1200x630.png' },
  },
};

const formatDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function BlogIndexPage() {
  const navigate = useNavigate();
  const posts = sortedBlogPosts();
  const [featured, ...rest] = posts;

  return (
    <>
      <SEOHead
        title="Testably Blog — Guides on QA, Test Automation, and CI/CD"
        description="Practical guides on QA, test automation, CI/CD integration, and choosing the right test management tools — from the team building Testably."
        keywords="testably blog, qa engineering blog, test automation guides, ci/cd integration, test case management"
        canonical="https://testably.app/blog"
        ogUrl="https://testably.app/blog"
        ogType="website"
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-white" style={{ fontFamily: '"Inter", sans-serif' }}>
        <MarketingHeader />

        {/* Hero */}
        <section className="bg-slate-900 pt-32 pb-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Link to="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Home
              </Link>
              <i className="ri-arrow-right-s-line text-slate-600 text-sm"></i>
              <span className="text-slate-400 text-sm">Blog</span>
            </div>
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <i className="ri-article-line text-indigo-400 text-sm"></i>
              <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                Guides &amp; Engineering Notes
              </span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-black text-white mb-6"
              style={{ lineHeight: 1.15, letterSpacing: '-0.02em' }}
            >
              Testably <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-500">Blog</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
              Practical guides on QA, test automation, CI/CD integration, and the tooling decisions
              that actually move release quality. Written by the team building Testably.
            </p>
          </div>
        </section>

        {/* Featured post */}
        {featured && (
          <section className="py-12 px-4 bg-gray-50 border-b border-gray-100">
            <div className="max-w-5xl mx-auto">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Latest
              </p>
              <button
                onClick={() => navigate(`/blog/${featured.slug}`)}
                className="group block w-full text-left bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all p-6 sm:p-8 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i className={`${featured.icon ?? 'ri-article-line'} text-indigo-600 text-xl`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3 text-xs">
                      <span className="font-bold text-indigo-500 uppercase tracking-wider">
                        {featured.category}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-500 flex items-center gap-1">
                        <i className="ri-calendar-line"></i>
                        {formatDate(featured.publishDate)}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-500 flex items-center gap-1">
                        <i className="ri-time-line"></i>
                        {featured.readTime}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                      {featured.description}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-indigo-600 group-hover:gap-2 transition-all">
                      Read article
                      <i className="ri-arrow-right-line"></i>
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </section>
        )}

        {/* All posts grid */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            {rest.length > 0 && (
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6">
                More posts
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {rest.map((post) => (
                <button
                  key={post.slug}
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  className="group block w-full text-left bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all p-6 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                    <i className={`${post.icon ?? 'ri-article-line'} text-indigo-600`}></i>
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="font-bold text-indigo-500 uppercase tracking-wider">
                      {post.category}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-500">{formatDate(post.publishDate)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                    {post.description}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-gray-500 group-hover:text-indigo-600 group-hover:gap-2 transition-all">
                    {post.readTime}
                    <i className="ri-arrow-right-line"></i>
                  </span>
                </button>
              ))}
            </div>

            {posts.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                <i className="ri-article-line text-4xl mb-4 block"></i>
                <p className="text-sm">No posts yet — check back soon.</p>
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-slate-900">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Try Testably for free
            </h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Modern test case management with AI generation, native Playwright/Cypress reporters,
              and flat-rate pricing. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="px-8 py-4 bg-indigo-500 text-white font-bold rounded-full hover:bg-indigo-400 transition-colors"
              >
                Get Started Free
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="px-8 py-4 text-slate-300 hover:text-white font-semibold transition-colors"
              >
                View Pricing
              </button>
            </div>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
