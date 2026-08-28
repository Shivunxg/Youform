// @ts-nocheck
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState("");
  const [sessionReady, setSessionReady] = React.useState(false);
  const [isInvite, setIsInvite] = React.useState(false);

  // Supabase redirects to this page with #access_token=...&type=recovery in the URL hash.
  // We need to exchange that for a session before we can call updateUser.
  React.useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if ((type === "recovery" || type === "invite") && accessToken && refreshToken) {
      if (type === "invite") setIsInvite(true);
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setError("This link is invalid or has expired. Please ask your administrator to resend the invitation.");
          else setSessionReady(true);
        });
    } else {
      // Might be PKCE — check for a code in query params via onAuthStateChange
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") setSessionReady(true);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
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
          {done ? (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-green-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-[#0F172A]">Password updated</p>
                <p className="text-sm text-slate-500 mt-1">Redirecting you to sign in…</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
                  {isInvite ? "Welcome! Set your password" : "Set a new password"}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {isInvite
                    ? "Create a password to activate your KTPCL SIMMS account."
                    : "Choose a strong password for your account."}
                </p>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {!sessionReady && !error && (
                <p className="text-sm text-slate-400 text-center py-6">Verifying reset link…</p>
              )}

              {sessionReady && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">New password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        required
                        className="pr-10"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">Confirm password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      required
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? "Updating…" : "Update password"}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
