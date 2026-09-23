import { SelectHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
 icon?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
 ({ className, icon, children, ...props }, ref) => {
 return (
 <div className="relative">
 {icon && (
 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-mono-muted pointer-events-none shrink-0">
 {icon}
 </div>
 )}
 <select
 ref={ref}
 className={clsx(
 "w-full h-11 appearance-none bg-mono-bg rounded-lg border border-mono-border text-sm font-medium text-mono-text transition-colors",
 "focus:border-mono-text focus:outline-none focus:ring-1 focus:ring-mono-text",
 icon ? "pl-10 pr-10" : "px-4 pr-10",
 className
 )}
 {...props}
 >
 {children}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-mono-muted pointer-events-none shrink-0" size={16} />
 </div>
 );
 }
);

Select.displayName = 'Select';
