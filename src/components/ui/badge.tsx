import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-700 border-slate-200",
        accent: "bg-blue-50 text-accent border-blue-100",
        success: "bg-green-50 text-green-700 border-green-100",
        warning: "bg-amber-50 text-amber-700 border-amber-100",
        danger: "bg-red-50 text-red-700 border-red-100",
        outline: "bg-transparent text-foreground-secondary border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  const dotColor =
    variant === "success"
      ? "bg-success"
      : variant === "warning"
      ? "bg-warning"
      : variant === "danger"
      ? "bg-danger"
      : variant === "accent"
      ? "bg-accent"
      : "bg-slate-400";
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
