import { useState } from 'react';
import MarketingLayout from '../../components/marketing/MarketingLayout';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = new URLSearchParams();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      await fetch('https://readdy.ai/api/form/d6nnujlv117fnkj2hmc0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
    } catch {
      // silent fail — form submission best-effort
    }
    setSubmitted(true);
    setLoading(false);
  };

  const isValid = form.name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && form.message.trim().length >= 10;

  const infoCards = [
    {
      icon: 'ri-mail-line',
      title: 'Email Us',
      content: (
        <a href="mailto:hello@testably.app" className="text-indigo-600 hover:text-indigo-700 transition-colors font-medium">
          hello@testably.app
        </a>
      ),
      desc: 'We typically respond within 24 hours.',
    },
    {
      icon: 'ri-discord-line',
      title: 'Join Discord',
      content: (
        <a href="https://discord.gg/testably" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 transition-colors font-medium">
          discord.gg/testably
        </a>
      ),
      desc: 'Chat with the community and the team in real time.',
    },
    {
      icon: 'ri-twitter-x-line',
      title: 'Twitter / X',
      content: (
        <a href="https://x.com/GetTestably" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 transition-colors font-medium">
          @GetTestably
        </a>
      ),
      desc: 'Follow for product updates and announcements.',
    },
  ];

  return (
    <MarketingLayout
      title="Contact Us | Testably"
      description="Get in touch with the Testably team. Questions, feedback, partnership inquiries welcome."
      keywords="contact testably, support, feedback, partnership"
      showCTA={false}
    >
      {/* Hero */}
      <header className="py-24 bg-gray-950 text-center relative overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        <div className="relative z-10 max-w-2xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <i className="ri-mail-line text-indigo-300 text-sm"></i>
            <span className="text-indigo-200 text-sm font-medium">Contact</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">Get in touch</h1>
          <p className="text-white/50 text-lg leading-relaxed">
            Have a question, feedback, or want to explore a partnership? We'd love to hear from you.
          </p>
        </div>
      </header>

      {/* Contact grid */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* Form */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a message</h2>

                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-check-line text-3xl text-indigo-600"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Message sent!</h3>
                    <p className="text-gray-500 text-sm">Thanks for reaching out. We'll get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          placeholder="Jane Smith"
                          required
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Email <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="jane@example.com"
                          required
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
                      <select
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                      >
                        <option value="">Select a topic</option>
                        <option value="question">General Question</option>
                        <option value="feedback">Product Feedback</option>
                        <option value="bug">Bug Report</option>
                        <option value="partnership">Partnership</option>
                        <option value="billing">Billing / Account</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Message <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Tell us how we can help..."
                        required
                        minLength={10}
                        rows={5}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!isValid || loading}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        isValid && !loading
                          ? 'bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {loading ? (
                        <><i className="ri-loader-4-line animate-spin"></i>Sending...</>
                      ) : (
                        'Send Message'
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Info cards */}
            <div className="lg:col-span-2 space-y-4">
              {infoCards.map((card) => (
                <div key={card.title} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:border-indigo-200 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <i className={`${card.icon} text-indigo-600 text-lg`}></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm mb-1">{card.title}</h3>
                      <div className="text-sm mb-1">{card.content}</div>
                      <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
