import { useState, useMemo } from 'react';
import clsx from 'clsx';

export interface ActivityChartProps {
 requests: { updated_at: string }[];
}

type TabType = 'Daily' | 'Weekly' | 'Monthly';

export function ActivityChart({ requests }: ActivityChartProps) {
 const [activeTab, setActiveTab] = useState<TabType>('Daily');

 const chartData = useMemo(() => {
 const now = new Date();
 const data: { label: string; count: number }[] = [];
 
 if (activeTab === 'Daily') {
 for (let i = 6; i >= 0; i--) {
 const d = new Date(now);
 d.setDate(d.getDate() - i);
 data.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), count: 0 });
 }
 requests.forEach(req => {
 const reqDate = new Date(req.updated_at);
 const diffDays = Math.floor((now.getTime() - reqDate.getTime()) / (1000 * 60 * 60 * 24));
 if (diffDays >= 0 && diffDays < 7) {
 data[6 - diffDays].count++;
 }
 });
 } else if (activeTab === 'Weekly') {
 for (let i = 3; i >= 0; i--) {
 data.push({ label: `W${4 - i}`, count: 0 });
 }
 requests.forEach(req => {
 const reqDate = new Date(req.updated_at);
 const diffWeeks = Math.floor((now.getTime() - reqDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
 if (diffWeeks >= 0 && diffWeeks < 4) {
 data[3 - diffWeeks].count++;
 }
 });
 } else if (activeTab === 'Monthly') {
 for (let i = 5; i >= 0; i--) {
 const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
 data.push({ label: d.toLocaleDateString(undefined, { month: 'short' }), count: 0 });
 }
 requests.forEach(req => {
 const reqDate = new Date(req.updated_at);
 const diffMonths = (now.getFullYear() - reqDate.getFullYear()) * 12 + now.getMonth() - reqDate.getMonth();
 if (diffMonths >= 0 && diffMonths < 6) {
 data[5 - diffMonths].count++;
 }
 });
 }

 return data;
 }, [requests, activeTab]);

 const maxCount = Math.max(...chartData.map(d => d.count), 5);

 return (
 <div className="flex flex-col h-full w-full min-h-[200px]">
 <div className="flex items-center justify-between mb-6">
 <h3 className="font-semibold text-mono-text">Request Activity</h3>
 <div className="flex bg-mono-bg p-1 rounded-[16px]">
 {(['Daily', 'Weekly', 'Monthly'] as TabType[]).map(tab => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab)}
 className={clsx(
 "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
 activeTab === tab 
 ? "bg-white text-mono-text " 
 : "text-mono-muted hover:text-mono-text"
 )}
 >
 {tab}
 </button>
 ))}
 </div>
 </div>

 <div className="flex-1 flex items-end gap-2 mt-4 min-h-[150px]">
 {chartData.map((d, i) => (
 <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 group h-full">
 <div className="w-full bg-mono-bg rounded-t-sm rounded-b-sm relative flex items-end justify-center overflow-hidden h-full">
 <div 
 className="w-full bg-blue-600 rounded-t-sm rounded-b-sm transition-all duration-500 group-hover:bg-accent-400"
 style={{ height: `${(d.count / maxCount) * 100}%` }}
 ></div>
 </div>
 <span className="text-xs text-mono-muted font-medium">{d.label}</span>
 </div>
 ))}
 </div>
 </div>
 );
}
