import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Landmark, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] font-sans selection:bg-[#1D1D1F] selection:text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E5E5EA]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="font-bold text-2xl tracking-tight leading-none">
              SAHAYA
              <div className="text-[10px] text-[#6E6E73] font-medium tracking-wider uppercase mt-1">
                Service Assistance
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-xl text-[14px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={16} /> Home
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-[#1D1D1F] text-white px-5 py-2 rounded-xl text-[14px] font-semibold hover:bg-black transition-colors flex items-center gap-1.5"
            >
              Login <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F5F7] text-[#1D1D1F] text-xs font-semibold tracking-wide mb-6">
          <Landmark size={14} />
          About SAHAYA & Akshaya
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F] mb-6 leading-tight">
          Simplifying Civic & Government Services for Every Citizen
        </h1>

        <p className="text-[#6E6E73] text-lg sm:text-xl leading-relaxed mb-12 max-w-3xl">
          SAHAYA is a unified digital service facilitation platform created to connect citizens directly with certified Akshaya Centres across Kerala, streamlining public service requests, document verification, and status monitoring.
        </p>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-[#F5F5F7] p-8 rounded-2xl border border-[#E5E5EA]">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#1D1D1F] mb-5 shadow-xs">
              <Landmark size={22} />
            </div>
            <h2 className="text-xl font-bold mb-2 text-[#1D1D1F]">Official Akshaya Network</h2>
            <p className="text-[#6E6E73] text-sm leading-relaxed">
              Direct connection with local certified Akshaya centres ensuring government-recognized document processing and transparent verification.
            </p>
          </div>

          <div className="bg-[#F5F5F7] p-8 rounded-2xl border border-[#E5E5EA]">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#1D1D1F] mb-5 shadow-xs">
              <ShieldCheck size={22} />
            </div>
            <h2 className="text-xl font-bold mb-2 text-[#1D1D1F]">Secure & Private</h2>
            <p className="text-[#6E6E73] text-sm leading-relaxed">
              Your personal identity files and sensitive documents are protected with high-level encryption and accessed only by authorized centre staff.
            </p>
          </div>

          <div className="bg-[#F5F5F7] p-8 rounded-2xl border border-[#E5E5EA]">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#1D1D1F] mb-5 shadow-xs">
              <CheckCircle2 size={22} />
            </div>
            <h2 className="text-xl font-bold mb-2 text-[#1D1D1F]">Real-time Tracking</h2>
            <p className="text-[#6E6E73] text-sm leading-relaxed">
              Know the exact status of your application at every milestone—from submission and document review to completion and certificate download.
            </p>
          </div>
        </div>

        {/* Story Section */}
        <div className="border-t border-[#E5E5EA] pt-12 space-y-6">
          <h2 className="text-2xl font-bold text-[#1D1D1F]">Our Mission</h2>
          <p className="text-[#6E6E73] text-base leading-relaxed">
            The Akshaya project was conceived as one of the pioneer digital initiatives in Kerala to bring e-governance and digital literacy to grassroots communities. SAHAYA extends this vision by eliminating long waiting lines and administrative friction through a modern, digital-first application workflow.
          </p>
          <p className="text-[#6E6E73] text-base leading-relaxed">
            Whether applying for birth and residence certificates, income verification, or updating essential records, citizens can submit their documents from anywhere while certified Akshaya staff handle official verification and department hand-offs.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-16 bg-[#1D1D1F] text-white p-10 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Ready to explore services?</h2>
            <p className="text-gray-400 text-sm">Browse our full catalogue of services or track an existing request.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate('/services')}
              className="bg-white text-[#1D1D1F] px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors w-full sm:w-auto text-center"
            >
              Browse Services
            </button>
            <button
              onClick={() => navigate('/login')}
              className="border border-white/20 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-white/10 transition-colors w-full sm:w-auto text-center"
            >
              Sign In
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
