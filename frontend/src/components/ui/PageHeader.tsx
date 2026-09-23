import { ReactNode } from 'react';
import clsx from 'clsx';

interface PageHeaderProps {
 title: string;
 subtitle?: string;
 children?: ReactNode;
 className?: string;
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
 return (
 <div className={clsx("flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8", className)}>
 <div>
 <h1 className="text-[28px] font-bold text-mono-text tracking-tight leading-tight">{title}</h1>
 {subtitle && (
 <p className="text-[15px] font-medium text-mono-muted mt-1">{subtitle}</p>
 )}
 </div>
 {children && (
 <div className="flex items-center gap-4 shrink-0">
 {children}
 </div>
 )}
 </div>
 );
}
