import { ReactNode } from 'react';
import { AkshayaLogoIcon } from '../../components/common/AkshayaLogoIcon';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[1000px] bg-white rounded-2xl shadow-sm relative overflow-hidden border border-ink-100 flex flex-col lg:flex-row items-stretch lg:min-h-[620px]">
        {/* Form Content */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 z-10 bg-white self-stretch">
          <div className="flex items-center gap-2.5 mb-8 text-ink-900 justify-center lg:justify-start">
            <AkshayaLogoIcon size={28} className="text-ink-900" />
            <span className="text-ink-900 font-bold text-xl tracking-tight">Sahaya</span>
          </div>
          <div className="flex flex-col justify-center w-full max-w-sm mx-auto">{children}</div>
        </div>

        {/* Gradient Panel (Hidden on mobile, connects top-to-bottom on desktop) */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-950 flex-col justify-center items-center text-center p-12 relative self-stretch overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/35 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-600/25 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 w-full flex flex-col items-center justify-center">
            <h2 className="text-3xl font-bold text-white mb-4">Sahaya Services</h2>
            <p className="text-indigo-100 mb-8 max-w-[280px] leading-relaxed">
              Securely access your citizen service portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
