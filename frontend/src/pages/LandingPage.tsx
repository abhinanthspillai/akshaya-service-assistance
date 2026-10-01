import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  FileText,
  Clock,
  ArrowRight,
  CloudUpload,
  CheckCircle2,
  ShieldCheck,
  Users,
  Landmark,
  Component,
  IdCard,
  Home as HomeIcon,
  FileCheck
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] font-sans selection:bg-[#1D1D1F] selection:text-white pb-24">
      {/* 1. Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E5E5EA]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="font-bold text-2xl tracking-tight leading-none">
              SAHAYA
              <div className="text-[10px] text-[#6E6E73] font-medium tracking-wider uppercase mt-1">
                Service Assistance
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1 text-[15px] font-medium text-[#6E6E73]">
            <a href="#" className="bg-[#F5F5F7] text-[#1D1D1F] px-4 py-1.5 rounded-full transition-colors">Home</a>
            <a href="#services" className="px-4 py-1.5 hover:text-[#1D1D1F] transition-colors">Services</a>
            <a href="#how-it-works" className="px-4 py-1.5 hover:text-[#1D1D1F] transition-colors">How it works</a>
            <a href="#about" className="px-4 py-1.5 hover:text-[#1D1D1F] transition-colors">About</a>
            <a href="#help" className="px-4 py-1.5 hover:text-[#1D1D1F] transition-colors">Help</a>
          </div>

          <div className="flex items-center gap-5">
            <button className="text-[#1D1D1F] hover:text-[#6E6E73] transition-colors">
              <Bell size={22} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-[#1D1D1F] text-white px-6 py-2.5 rounded-xl text-[15px] font-medium hover:bg-[#1D1D1F]/90 transition-colors flex items-center gap-2"
            >
              Login <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <main className="relative w-full max-w-[1648px] mx-auto overflow-hidden mb-12 flex items-center justify-center h-[550px] lg:h-[600px] rounded-[2rem]">
        
        {/* Background Image sets exact aspect ratio so overlay percentages are pixel-perfect */}
        <img 
          src="/images/sahaya-hero-new.jpg" 
          alt="SAHAYA Government Services Companion" 
          className="absolute inset-0 w-full h-full block hero-animated-image object-cover opacity-90"
        />

        {/* Overlay Container matching image exact dimensions */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          
          {/* Left Side White Mask - Smoothly hides baked-in text to prevent duplicates */}
          <div className="absolute top-0 left-0 bottom-0 w-[45%] bg-white/95 z-0 hidden lg:block" />
          <div className="absolute top-0 left-[45%] bottom-0 w-[15%] bg-gradient-to-r from-white/95 to-transparent z-0 hidden lg:block pointer-events-none" />

          {/* Left Column Content Overlays */}
          <div className="absolute top-0 left-0 bottom-0 w-full lg:w-[50%] flex flex-col justify-center px-6 lg:pl-[8%] xl:pl-[10%] z-10 pointer-events-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F5F7] text-[#1D1D1F] text-xs font-semibold tracking-wide border-none w-max mb-6">
              <Landmark size={14} />
              Government Services, Made Simple
            </div>
            
            <h1 className="text-[32px] sm:text-[44px] md:text-[52px] lg:text-[56px] font-bold tracking-tight leading-[1.05] mb-6">
              Your Government<br/>Services Companion<br/>
              <span className="text-[44px] sm:text-[52px] md:text-[64px] lg:text-[76px] font-black block mt-2 tracking-tighter">SAHAYA</span>
            </h1>
            
            <p className="text-[#6E6E73] text-[16px] sm:text-[18px] max-w-[440px] leading-relaxed mb-8">
              Explore, apply and track government services available at Akshaya centres, all in one place.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-[-4px] bg-white rounded-xl" />
                <button
                  onClick={() => navigate('/services')}
                  className="relative w-full sm:w-auto bg-[#1D1D1F] text-white px-7 py-3.5 rounded-xl text-[15px] font-medium transition-transform duration-150 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] focus:outline-none cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileText size={18} /> Explore Services <ArrowRight size={16} />
                </button>
              </div>

              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-[-4px] bg-white rounded-xl" />
                <button
                  onClick={() => navigate('/requests')}
                  className="relative w-full sm:w-auto bg-white text-[#1D1D1F] border border-[#E5E5EA] px-7 py-3.5 rounded-xl text-[15px] font-medium transition-transform duration-150 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] focus:outline-none cursor-pointer flex items-center justify-center gap-2"
                >
                  <Search size={18} /> Track Your Request
                </button>
              </div>
            </div>
          </div>

          {/* Right Column Overlays - 4 HTML Cards Stacked Professionally */}
          <div className="absolute top-0 right-0 bottom-0 w-[50%] hidden lg:flex flex-col justify-center items-end pr-[8%] xl:pr-[10%] gap-5 z-10 pointer-events-none">
            
            <div className="relative pointer-events-auto mr-0">
              <div className="absolute inset-[-12px] bg-white/95 backdrop-blur-2xl rounded-3xl" />
              <div onClick={() => navigate('/services')} className="relative bg-white py-2 xl:py-3 px-4 xl:px-5 rounded-2xl border border-[#E5E5EA] flex gap-3 xl:gap-4 items-center w-[210px] xl:w-[260px] cursor-pointer transition-transform duration-150 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] shadow-lg">
                <div className="bg-[#F5F5F7] text-[#1D1D1F] p-2 xl:p-2.5 rounded-full shrink-0"><FileText size={18} strokeWidth={2} /></div>
                <div>
                  <h3 className="font-bold text-[12px] xl:text-[13px] text-[#1D1D1F]">Find a Service</h3>
                  <p className="text-[10px] xl:text-[11px] text-[#6E6E73] leading-tight mt-0.5">Browse services available at Akshaya centres</p>
                </div>
              </div>
            </div>

            <div className="relative pointer-events-auto mr-[35px]">
              <div className="absolute inset-[-12px] bg-white/95 backdrop-blur-2xl rounded-3xl" />
              <div onClick={() => navigate('/register')} className="relative bg-white py-2 xl:py-3 px-4 xl:px-5 rounded-2xl border border-[#E5E5EA] flex gap-3 xl:gap-4 items-center w-[210px] xl:w-[260px] cursor-pointer transition-transform duration-150 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] shadow-lg">
                <div className="bg-blue-50 text-blue-600 p-2 xl:p-2.5 rounded-full shrink-0"><CloudUpload size={18} strokeWidth={2} /></div>
                <div>
                  <h3 className="font-bold text-[12px] xl:text-[13px] text-[#1D1D1F]">Submit Request</h3>
                  <p className="text-[10px] xl:text-[11px] text-[#6E6E73] leading-tight mt-0.5">Provide required details and documents</p>
                </div>
              </div>
            </div>

            <div className="relative pointer-events-auto mr-[35px]">
              <div className="absolute inset-[-12px] bg-white/95 backdrop-blur-2xl rounded-3xl" />
              <div onClick={() => navigate('/login')} className="relative bg-white py-2 xl:py-3 px-4 xl:px-5 rounded-2xl border border-[#E5E5EA] flex gap-3 xl:gap-4 items-center w-[210px] xl:w-[260px] cursor-pointer transition-transform duration-150 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] shadow-lg">
                <div className="bg-indigo-50 text-indigo-600 p-2 xl:p-2.5 rounded-full shrink-0"><Clock size={18} strokeWidth={2} /></div>
                <div>
                  <h3 className="font-bold text-[12px] xl:text-[13px] text-[#1D1D1F]">Track Progress</h3>
                  <p className="text-[10px] xl:text-[11px] text-[#6E6E73] leading-tight mt-0.5">Stay updated in real-time</p>
                </div>
              </div>
            </div>

            <div className="relative pointer-events-auto mr-0">
              <div className="absolute inset-[-12px] bg-white/95 backdrop-blur-2xl rounded-3xl" />
              <div onClick={() => navigate('/register')} className="relative bg-white py-2 xl:py-3 px-4 xl:px-5 rounded-2xl border border-[#E5E5EA] flex gap-3 xl:gap-4 items-center w-[210px] xl:w-[260px] cursor-pointer transition-transform duration-150 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] shadow-lg">
                <div className="bg-emerald-50 text-emerald-600 p-2 xl:p-2.5 rounded-full shrink-0"><CheckCircle2 size={18} strokeWidth={2} /></div>
                <div>
                  <h3 className="font-bold text-[12px] xl:text-[13px] text-[#1D1D1F]">Get It Done</h3>
                  <p className="text-[10px] xl:text-[11px] text-[#6E6E73] leading-tight mt-0.5">Receive your service from Akshaya centre</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* 3. Popular Services Strip */}
      <section id="services" className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-[28px] font-bold tracking-tight text-[#1D1D1F]">Popular Services</h2>
            <p className="text-[#6E6E73] mt-1 text-[16px]">Quick access to commonly used Akshaya services.</p>
          </div>
          <button
            onClick={() => navigate('/services')}
            className="text-[#1D1D1F] font-bold text-[15px] flex items-center gap-1.5 hover:text-[#6E6E73] transition-colors"
          >
            View all services <ArrowRight size={18} />
          </button>
        </div>

        <div className="flex overflow-x-auto gap-5 pb-8 -mx-6 px-6 snap-x hide-scrollbar">
          {[
            { icon: FileText, name: "Birth Certificate", desc: "Apply for birth certificate" },
            { icon: IdCard, name: "Aadhaar Update", desc: "Update Aadhaar details" },
            { icon: Users, name: "Income Certificate", desc: "Apply for income certificate" },
            { icon: FileCheck, name: "Caste Certificate", desc: "Apply for caste certificate" },
            { icon: HomeIcon, name: "Residence Certificate", desc: "Apply for residence certificate" }
          ].map((service, i) => (
            <div key={i} className="min-w-[280px] md:min-w-[300px] snap-start bg-white border border-[#E5E5EA] rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4">
              <div className="bg-[#F5F5F7] w-14 h-14 rounded-xl flex items-center justify-center shrink-0">
                <service.icon size={24} strokeWidth={1.5} className="text-[#1D1D1F]" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[15px] text-[#1D1D1F]">{service.name}</h3>
                <p className="text-[#6E6E73] text-[13px] leading-tight mt-0.5">{service.desc}</p>
              </div>
              <div className="bg-[#F5F5F7] w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[#6E6E73]">
                <ArrowRight size={16} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. How SAHAYA Works */}
      <section id="how-it-works" className="bg-[#F5F5F7]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="mb-12">
            <h2 className="text-[20px] md:text-[24px] font-bold tracking-tight text-[#1D1D1F]">How SAHAYA Works</h2>
            <p className="text-[#6E6E73] mt-1 text-[13px] md:text-[14px]">A simple process to get your services done.</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4 md:gap-2">
            {[
              { icon: Search, num: 1, title: "Search Service", desc: "Find the service you need" },
              { icon: FileText, num: 2, title: "Submit Request", desc: "Provide required details and documents" },
              { icon: Clock, num: 3, title: "Track Progress", desc: "Stay updated on your request status" },
              { icon: CheckCircle2, num: 4, title: "Get It Done", desc: "Receive your service from Akshaya centre" }
            ].map((step, i) => (
              <div key={i} className="flex items-center flex-1 w-full md:w-auto">
                <div className="flex items-center gap-3 md:gap-4 shrink-0">
                  <div className="bg-white border-[1.5px] border-[#1D1D1F] w-[48px] h-[48px] md:w-[56px] md:h-[56px] shrink-0 rounded-full flex items-center justify-center z-10">
                    <step.icon size={22} strokeWidth={1.5} className="text-[#1D1D1F]" />
                  </div>
                  <div className="flex flex-col max-w-[130px] md:max-w-[150px]">
                    <h3 className="font-bold text-[12px] md:text-[13px] text-[#1D1D1F] leading-tight">{step.num}. {step.title}</h3>
                    <p className="text-[#6E6E73] text-[11px] leading-tight mt-1">{step.desc}</p>
                  </div>
                </div>
                {i < 3 && (
                  <div className="hidden md:block flex-1 h-[1px] border-t border-dashed border-[#A1A1AA] mx-2 md:mx-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Stats Bar */}
      <section className="bg-[#F5F5F7] pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 bg-white border border-[#E5E5EA] rounded-[24px] p-8 md:p-10 shadow-sm">
            <div className="flex items-center gap-5">
              <Component size={32} strokeWidth={1.5} className="text-[#1D1D1F] shrink-0" />
              <div>
                <h4 className="font-bold text-xl text-[#1D1D1F]">50+</h4>
                <p className="text-[#6E6E73] text-[13px] mt-0.5">Government services</p>
              </div>
            </div>
            
            <div className="flex items-center gap-5">
              <Landmark size={32} strokeWidth={1.5} className="text-[#1D1D1F] shrink-0" />
              <div>
                <h4 className="font-bold text-xl text-[#1D1D1F]">2,900+</h4>
                <p className="text-[#6E6E73] text-[13px] mt-0.5">Akshaya centres<br/>across Kerala</p>
              </div>
            </div>
            
            <div className="flex items-center gap-5">
              <Users size={32} strokeWidth={1.5} className="text-[#1D1D1F] shrink-0" />
              <div>
                <h4 className="font-bold text-xl text-[#1D1D1F]">1M+</h4>
                <p className="text-[#6E6E73] text-[13px] mt-0.5">Citizens served<br/>and counting</p>
              </div>
            </div>
            
            <div className="flex items-center gap-5">
              <ShieldCheck size={32} strokeWidth={1.5} className="text-[#1D1D1F] shrink-0" />
              <div>
                <h4 className="font-bold text-xl text-[#1D1D1F]">100%</h4>
                <p className="text-[#6E6E73] text-[13px] mt-0.5">Official and secure</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes subtle-float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-10px) scale(1.02); }
        }
        .hero-animated-image {
          animation: subtle-float 6s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
}
