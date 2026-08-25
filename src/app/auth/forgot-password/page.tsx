// @ts-nocheck
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="h-9 w-9 rounded-xl bg-[#0B1A3D] flex items-center justify-center">
            <span className="text-[#93C5FD] text-base font-bold">⚡</span>
          </div>
          <div>
            <p className="text-sm font-bold text-[#0B1A3D] leading-none">KTPCL SIMMS</p>
            <p className="text-[11px] text-slate-500 leading-none mt-0.5">Spectrum Consultants</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
          {sent ? (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-green-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-[#0F172A]">Check your inbox</p>
                <p className="text-sm text-slate-500 mt-1">
                  If <strong>{email}</strong> is registered, a password reset link has been sent to that address.
                </p>
              </div>
              <Link href="/login" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 mt-2">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Forgot your password?</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Enter your registered email and we'll send a reset link.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
                  {loading ? "Sending…" : <><Mail className="h-4 w-4" /> Send reset link</>}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm font-medium text-blue-600 hover:underline flex items-center justify-center gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
