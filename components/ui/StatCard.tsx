import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon: LucideIcon;
}

export default function StatCard({ label, value, change, positive = true, icon: Icon }: StatCardProps) {
  return (
    <div className="p-5 rounded-2xl bg-[#111c47] border border-[#1e2d63] hover:border-[#0a7cff]/40 transition-all duration-200 group">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[#7784b5]">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-[#0a7cff]/10 border border-[#0a7cff]/20 flex items-center justify-center group-hover:bg-[#0a7cff]/20 transition-colors">
          <Icon size={15} className="text-[#0a7cff]" />
        </div>
      </div>
      <div className="text-2xl font-bold text-[#e8eaf2] mb-1">{value}</div>
      {change && (
        <div className={`text-xs font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
          {positive ? "↑" : "↓"} {change} vs last month
        </div>
      )}
    </div>
  );
}
