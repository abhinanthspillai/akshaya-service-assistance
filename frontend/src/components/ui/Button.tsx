import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
 variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
 size?: 'sm' | 'md' | 'lg';
 isLoading?: boolean;
 icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
 (
 { 
 className, 
 variant = 'primary', 
 size = 'md', 
 isLoading = false, 
 icon,
 children, 
 disabled, 
 ...props 
 },
 ref
 ) => {
 const baseStyles = "inline-flex items-center justify-center font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-mono-border focus:ring-offset-2 shrink-0";
 
 const variants = {
 primary: "bg-mono-text text-mono-bg hover:bg-black",
 secondary: "bg-white text-mono-text border border-mono-border hover:bg-mono-surface",
 ghost: "text-mono-text hover:bg-mono-surface/50",
 destructive: "bg-white border border-red-500/30 text-red-600 hover:bg-red-50",
 };

 const sizes = {
 sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
 md: "h-11 px-5 py-2.5 text-sm rounded-xl gap-2",
 lg: "h-12 px-6 py-3 text-base rounded-xl gap-2",
 };

 return (
 <button
 ref={ref}
 className={clsx(
 baseStyles,
 variants[variant],
 sizes[size],
 (disabled || isLoading) && "opacity-50 cursor-not-allowed",
 className
 )}
 disabled={disabled || isLoading}
 {...props}
 >
 {isLoading ? (
 <Loader2 className="animate-spin shrink-0" size={size === 'sm' ? 14 : 18} />
 ) : icon ? (
 <span className="shrink-0">{icon}</span>
 ) : null}
 {children}
 </button>
 );
 }
);

Button.displayName = 'Button';
