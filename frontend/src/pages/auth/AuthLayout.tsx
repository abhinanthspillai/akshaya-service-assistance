import { ReactNode } from 'react';
import { AkshayaLogoIcon } from '../../components/common/AkshayaLogoIcon';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[1000px] bg-white rounded-2xl shadow-sm relative overflow-hidden border border-ink-100 flex flex-col lg:flex-row lg:min-h-[600px]">
        {/* Form Content */}
        <div className="w-full lg:w-1/2 h-full flex flex-col p-8 sm:p-12 z-10 bg-white">
          <div className="flex items-center gap-2.5 mb-8 text-ink-900 justify-center lg:justify-start">
            <AkshayaLogoIcon size={28} className="text-ink-900" />
            <span className="text-ink-900 font-bold text-xl tracking-tight">Akshaya</span>
          </div>
          <div className="flex flex-col justify-center h-full w-full max-w-sm mx-auto">{children}</div>
        </div>

        {/* Static Blue Panel (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 h-full bg-ink-900 flex-col justify-center items-center text-center p-12 relative">
          <div className="absolute inset-0 bg-white opacity-90 mix-blend-multiply"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-blue-400 rounded-full mix-blend-screen filter blur-[100px] opacity-70"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[80%] bg-purple-500 rounded-full mix-blend-screen filter blur-[100px] opacity-70"></div>

          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
            <h2 className="text-3xl font-bold text-white mb-4">Akshaya Services</h2>
            <p className="text-indigo-100 mb-8 max-w-[280px] leading-relaxed">
              Securely access your citizen service portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
