"use client";

import * as React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineData {
  createdAt: string;
  assignedAt: string | null;
  inspectingAt: string | null;
  momLoggedAt: string | null;
  estimateSentAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  closedAt: string | null;
  status: string;
}

function fmt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JobCardTimeline({ data }: { data: TimelineData }) {
  const steps = [
    { label: "Open", time: data.createdAt },
    { label: "Assigned", time: data.assignedAt },
    { label: "Inspecting", time: data.inspectingAt },
    { label: "MOM Logged", time: data.momLoggedAt },
    { label: "Estimate Sent", time: data.estimateSentAt },
    data.rejectedAt
      ? { label: "Rejected by AE", time: data.rejectedAt }
      : { label: "Approved by AE", time: data.approvedAt },
    { label: "Closed", time: data.closedAt },
  ].filter((s) => s.time !== null || s.label === "Open");

  return (
    <div className="mt-2 pl-1">
      {steps.map((step, i) => {
        const reached = !!step.time;
        const isLast = i === steps.length - 1;
        return (
          <div key={step.label} className="flex gap-2.5">
            <div className="flex flex-col items-center">
              {reached ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              )}
              {!isLast && <div className={cn("w-px flex-1 min-h-[14px]", reached ? "bg-success/40" : "bg-slate-200")} />}
            </div>
            <div className={cn("pb-2.5 text-xs", reached ? "text-foreground" : "text-slate-300")}>
              <span className="font-medium">{step.label}</span>
              {step.time && <span className="text-foreground-secondary"> — {fmt(step.time)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
