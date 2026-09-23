import { HTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
 padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
 ({ className, padding = 'md', children, ...props }, ref) => {
 const paddings = {
 none: '',
 sm: 'p-4',
 md: 'p-6',
 lg: 'p-8',
 };

 return (
 <div
 ref={ref}
 className={clsx(
 'bg-mono-bg rounded-xl border border-mono-border shadow-sm overflow-hidden',
 className
 )}
 {...props}
 >
 <div className={clsx('h-full flex flex-col', paddings[padding])}>
 {children}
 </div>
 </div>
 );
 }
);

Card.displayName = 'Card';
