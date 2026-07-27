import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  tone?: "default" | "warning" | "danger" | "success";
}

const toneMap = {
  default: "bg-blue-50 text-accent",
  success: "bg-green-50 text-success",
  warning: "bg-amber-50 text-warning",
  danger: "bg-red-50 text-danger",
};

export function StatCard({ label, value, icon: Icon, trend, tone = "default" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition-shadow">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              trend.positive ? "text-success" : "text-danger"
            )}
          >
            {trend.positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-semibold text-foreground tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-foreground-secondary">{label}</p>
    </div>
  );
}
