import { ReactNode } from 'react';
import clsx from 'clsx';

interface EmptyStateProps {
 icon: ReactNode;
 title: string;
 description: string;
 action?: ReactNode;
 className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
 return (
 <div className={clsx("flex flex-col items-center justify-center text-center p-8", className)}>
 <div className="text-mono-muted mb-4 shrink-0">
 {icon}
 </div>
 <h3 className="text-base font-bold text-mono-text mb-1">{title}</h3>
 <p className="text-sm font-medium text-mono-muted max-w-sm mb-6">{description}</p>
 {action && <div>{action}</div>}
 </div>
 );
}
