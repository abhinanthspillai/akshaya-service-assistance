export interface GaugeProps {
 completed: number;
 inProgress: number;
 needsAttention: number;
 total: number;
}

export function Gauge({ completed, inProgress, needsAttention, total }: GaugeProps) {
 const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
 
 const radius = 60;
 const strokeWidth = 12;
 const normalizedRadius = radius - strokeWidth * 0.5;
 const circumference = normalizedRadius * Math.PI;
 const strokeDashoffset = circumference - (completionRate / 100) * circumference;

 return (
 <div className="bg-white rounded-[16px] shadow-sm p-6 border border-mono-muted/20 flex flex-col sm:flex-row items-center gap-8 h-full">
 <div className="relative flex flex-col items-center justify-center">
 <svg height={radius + strokeWidth} width={radius * 2} className="rotate-180">
 <defs>
 <linearGradient id="gaugeGradient" x1="1" y1="0" x2="0" y2="0">
 <stop offset="0%" stopColor="#10b981" />
 <stop offset="100%" stopColor="#ff6b4a" />
 </linearGradient>
 </defs>
 <path
 stroke="#f6f5fb"
 fill="transparent"
 strokeWidth={strokeWidth}
 strokeLinecap="round"
 d={`M ${strokeWidth/2} ${radius} a ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth} 0`}
 />
 <path
 stroke="url(#gaugeGradient)"
 fill="transparent"
 strokeWidth={strokeWidth}
 strokeLinecap="round"
 strokeDasharray={circumference + ' ' + circumference}
 style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
 d={`M ${strokeWidth/2} ${radius} a ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth} 0`}
 />
 </svg>
 <div className="absolute bottom-1 flex flex-col items-center leading-tight">
 <span className="text-3xl font-bold text-mono-text">{completionRate}%</span>
 <span className="text-xs text-mono-muted font-medium">Completed</span>
 </div>
 </div>

 <div className="flex-1 w-full grid grid-cols-2 gap-4">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <div className="w-2 h-2 rounded-full bg-blue-600/100"></div>
 <span className="text-xs text-mono-muted font-medium uppercase tracking-wide">Completed</span>
 </div>
 <span className="text-xl font-bold text-mono-text">{completed}</span>
 </div>
 <div>
 <div className="flex items-center gap-2 mb-1">
 <div className="w-2 h-2 rounded-full bg-sky-500"></div>
 <span className="text-xs text-mono-muted font-medium uppercase tracking-wide">In Progress</span>
 </div>
 <span className="text-xl font-bold text-mono-text">{inProgress}</span>
 </div>
 <div>
 <div className="flex items-center gap-2 mb-1">
 <div className="w-2 h-2 rounded-full bg-blue-600"></div>
 <span className="text-xs text-mono-muted font-medium uppercase tracking-wide">Action Needed</span>
 </div>
 <span className="text-xl font-bold text-mono-text">{needsAttention}</span>
 </div>
 <div>
 <div className="flex items-center gap-2 mb-1">
 <div className="w-2 h-2 rounded-full bg-ink-200"></div>
 <span className="text-xs text-mono-muted font-medium uppercase tracking-wide">Total</span>
 </div>
 <span className="text-xl font-bold text-mono-text">{total}</span>
 </div>
 </div>
 </div>
 );
}
