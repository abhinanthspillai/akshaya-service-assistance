import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
 icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
 ({ className, icon, ...props }, ref) => {
 return (
 <div className="relative">
 {icon && (
 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-mono-muted pointer-events-none shrink-0">
 {icon}
 </div>
 )}
 <input
 ref={ref}
 className={clsx(
 "w-full h-11 bg-mono-bg rounded-lg border border-mono-border text-sm font-medium text-mono-text transition-colors",
 "focus:border-mono-text focus:outline-none focus:ring-1 focus:ring-mono-text placeholder:text-mono-muted/70",
 icon ? "pl-10 pr-4" : "px-4",
 className
 )}
 {...props}
 />
 </div>
 );
 }
);

Input.displayName = 'Input';
