"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtIST } from "@/lib/ist";

export interface TimelineData {
  currentStatus: string;
  history: Array<{
    toStatus: string;
    createdAt: string;
    note: string | null;
    changedByName: string | null;
  }>;
}

const STATUS_LABEL: Record<string, string> = {
  quotation_shared: "Quotation Shared",
  order_received: "Order Received",
  offer_dropped: "Offer Dropped",
  order_lost: "Order Lost",
  supply_service_given: "Supply / Service Given",
  bills_submitted: "Bills Submitted & Work Completed",
  payment_received: "Payment Received",
};

const TERMINAL_NEGATIVE = new Set(["offer_dropped", "order_lost"]);

export function JobCardTimeline({ data }: { data: TimelineData }) {
  const historyMap = new Map(data.history.map((h) => [h.toStatus, h]));

  const mainFlow = [
    "quotation_shared",
    "order_received",
    "supply_service_given",
    "bills_submitted",
    "payment_received",
  ];

  const branchStatuses = ["offer_dropped", "order_lost"].filter((s) => historyMap.has(s));

  const steps = [
    ...mainFlow,
    ...branchStatuses,
  ];

  return (
    <div className="mt-2 pl-1 space-y-0">
      {steps.map((status, i) => {
        const entry = historyMap.get(status);
        const reached = !!entry || status === "quotation_shared";
        const isNegative = TERMINAL_NEGATIVE.has(status);
        const isLast = i === steps.length - 1;

        return (
          <div key={status} className="flex gap-2.5">
            <div className="flex flex-col items-center">
              {isNegative && reached ? (
                <XCircle className="h-3.5 w-3.5 text-danger shrink-0 mt-0.5" />
              ) : reached ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-slate-300 shrink-0 mt-0.5" />
              )}
              {!isLast && (
                <div
                  className={cn(
                    "w-px flex-1 min-h-[16px]",
                    reached
                      ? isNegative
                        ? "bg-danger/30"
                        : "bg-success/40"
                      : "bg-slate-200"
                  )}
                />
              )}
            </div>
            <div className={cn("pb-3 text-xs", reached ? "text-foreground" : "text-slate-300")}>
              <span className="font-medium">{STATUS_LABEL[status] ?? status}</span>
              {entry && (
                <span className="text-foreground-secondary">
                  {" "}— {fmtIST(entry.createdAt)}
                  {entry.changedByName && ` by ${entry.changedByName}`}
                </span>
              )}
              {entry?.note && (
                <p className="mt-0.5 text-foreground-secondary italic">{entry.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
