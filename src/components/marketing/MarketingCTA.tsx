import { useNavigate } from 'react-router-dom';

export default function MarketingCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-to-r from-indigo-600 to-violet-600 text-center">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to streamline your QA workflow?
        </h2>
        <p className="text-indigo-100 text-lg mb-8">
          Start for free. No credit card required.
        </p>
        <button
          onClick={() => navigate('/auth')}
          className="px-8 py-3.5 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-50 transition-all hover:scale-[1.02] cursor-pointer inline-flex items-center gap-2 justify-center"
        >
          Get Started Free
        </button>
      </div>
    </section>
  );
}
