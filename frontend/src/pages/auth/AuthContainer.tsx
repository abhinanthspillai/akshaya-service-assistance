import { useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from '../../components/auth/LoginForm';
import { RegisterForm } from '../../components/auth/RegisterForm';
import clsx from 'clsx';

export function AuthContainer() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8">
      {/* Mobile Layout (Hidden on large screens) */}
      <div className="lg:hidden w-full max-w-[500px] bg-white rounded-[24px] shadow-sm p-6 sm:p-10 border border-slate-100 relative">
        
        {/* Mobile Header & Toggle */}
        <div className="flex items-center gap-2 mb-8 text-indigo-600 justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor"/>
            </svg>
            <span className="text-slate-900 font-bold text-xl tracking-tight">Akshaya</span>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl mb-8 relative max-w-sm mx-auto">
           <button 
             onClick={() => navigate('/login', { replace: true })}
             className={clsx("flex-1 py-2 text-sm font-semibold rounded-lg transition-colors z-10", isLogin ? "text-indigo-700" : "text-slate-500 hover:text-slate-700")}
           >Sign In</button>
           <button 
             onClick={() => navigate('/register', { replace: true })}
             className={clsx("flex-1 py-2 text-sm font-semibold rounded-lg transition-colors z-10", !isLogin ? "text-indigo-700" : "text-slate-500 hover:text-slate-700")}
           >Register</button>
           <div 
             className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-in-out"
             style={{ 
               transform: isLogin ? 'translateX(0)' : 'translateX(100%)', 
               left: isLogin ? '4px' : '0' 
             }}
           />
        </div>

        {/* Mobile Form Content */}
        {isLogin ? <LoginForm /> : <RegisterForm />}
      </div>

      {/* Desktop Layout (Hidden on small screens) */}
      <div className="hidden lg:flex w-full max-w-[1000px] h-[600px] bg-white rounded-[24px] shadow-lg relative overflow-hidden border border-slate-100">
        
        {/* Sign In Form Container */}
        <div 
          className={clsx(
            "absolute top-0 left-0 w-1/2 h-full transition-all duration-[600ms] ease-in-out flex flex-col p-12 overflow-y-auto bg-white",
            isLogin ? "translate-x-0 opacity-100 z-20" : "translate-x-[100%] opacity-0 z-10"
          )}
          aria-hidden={!isLogin}
          style={{ pointerEvents: isLogin ? 'auto' : 'none' }}
        >
           <div className="flex items-center gap-2 mb-6 text-indigo-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor"/>
              </svg>
              <span className="text-slate-900 font-bold text-lg tracking-tight">Akshaya</span>
           </div>
           <LoginForm />
        </div>

        {/* Sign Up Form Container */}
        <div 
          className={clsx(
            "absolute top-0 left-0 w-1/2 h-full transition-all duration-[600ms] ease-in-out flex flex-col p-12 overflow-y-auto bg-white",
            isLogin ? "translate-x-[0%] opacity-0 z-10" : "translate-x-[100%] opacity-100 z-50"
          )}
          aria-hidden={isLogin}
          style={{ pointerEvents: !isLogin ? 'auto' : 'none' }}
        >
           <div className="flex items-center gap-2 mb-6 text-indigo-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor"/>
              </svg>
              <span className="text-slate-900 font-bold text-lg tracking-tight">Akshaya</span>
           </div>
           <RegisterForm />
        </div>

        {/* Overlay Container */}
        <div 
          className={clsx(
            "absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-transform duration-[600ms] ease-in-out z-[100]",
            isLogin ? "translate-x-0" : "-translate-x-[100%]"
          )}
        >
          {/* Overlay Inner */}
          <div 
            className={clsx(
              "relative -left-full h-full w-[200%] bg-indigo-600 transition-transform duration-[600ms] ease-in-out",
              isLogin ? "translate-x-0" : "translate-x-[50%]"
            )}
          >
            {/* Background Graphics */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 opacity-90 mix-blend-multiply z-0"></div>
            <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-blue-400 rounded-full mix-blend-screen filter blur-[100px] opacity-70 z-0"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[80%] bg-purple-500 rounded-full mix-blend-screen filter blur-[100px] opacity-70 z-0"></div>

            {/* Overlay Left Panel (Welcome Back) */}
            <div 
              className={clsx(
                "absolute top-0 left-0 w-1/2 h-full flex flex-col items-center justify-center text-center p-12 transition-transform duration-[600ms] ease-in-out z-10",
                isLogin ? "-translate-x-[20%]" : "translate-x-0"
              )}
            >
              <h2 className="text-3xl font-bold text-white mb-4">Welcome Back!</h2>
              <p className="text-indigo-100 mb-8 max-w-[280px] leading-relaxed">
                Already have an account? Sign in to access your dashboard.
              </p>
              <button 
                onClick={() => navigate('/login')}
                className="px-10 py-3 rounded-xl border-2 border-white/80 text-white font-semibold hover:bg-white hover:text-indigo-600 transition-colors"
                tabIndex={!isLogin ? 0 : -1}
              >
                Sign In
              </button>
            </div>

            {/* Overlay Right Panel (Hello, Welcome) */}
            <div 
              className={clsx(
                "absolute top-0 right-0 w-1/2 h-full flex flex-col items-center justify-center text-center p-12 transition-transform duration-[600ms] ease-in-out z-10",
                isLogin ? "translate-x-0" : "translate-x-[20%]"
              )}
            >
              <h2 className="text-3xl font-bold text-white mb-4">Hello, Welcome!</h2>
              <p className="text-indigo-100 mb-8 max-w-[280px] leading-relaxed">
                New to Akshaya Service Assistance? Create an account to get started.
              </p>
              <button 
                onClick={() => navigate('/register')}
                className="px-10 py-3 rounded-xl border-2 border-white/80 text-white font-semibold hover:bg-white hover:text-indigo-600 transition-colors"
                tabIndex={isLogin ? 0 : -1}
              >
                Register
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
