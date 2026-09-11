import { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[1000px] bg-white rounded-[24px] shadow-sm flex overflow-hidden min-h-[600px] border border-slate-100">
        
        {/* Left Panel - Gradient */}
        <div className="hidden lg:flex w-[45%] p-10 flex-col justify-between relative overflow-hidden bg-indigo-600">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 opacity-90 mix-blend-multiply"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-blue-400 rounded-full mix-blend-screen filter blur-[100px] opacity-70"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[80%] bg-purple-500 rounded-full mix-blend-screen filter blur-[100px] opacity-70"></div>
          
          <div className="relative z-10 flex items-center gap-2">
            <div className="text-white">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor"/>
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Akshaya</span>
          </div>

          <div className="relative z-10 mt-auto">
            <p className="text-indigo-100 font-medium mb-3 text-sm tracking-wide uppercase">You can easily</p>
            <h1 className="text-white text-3xl font-bold leading-tight">
              Get access to your personal hub for clarity and productivity
            </h1>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="w-full lg:w-[55%] flex flex-col justify-center p-8 sm:p-12 lg:p-16 relative">
          <div className="lg:hidden flex items-center gap-2 mb-8">
             <div className="text-indigo-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor"/>
                </svg>
              </div>
              <span className="text-slate-900 font-bold text-lg tracking-tight">Akshaya</span>
          </div>
          <div className="hidden lg:block text-indigo-600 mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor"/>
            </svg>
          </div>
          {children}
        </div>

      </div>
    </div>
  );
}
