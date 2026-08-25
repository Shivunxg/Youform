"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  ShieldCheck,
  MapPin,
  ClipboardList,
  Wrench,
  Boxes,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export type Role = "spectrum_admin" | "account_executive";

const VARIANTS = {
  spectrum_admin: {
    heading: "Welcome back",
    subheading: "Sign in to your Spectrum Admin dashboard",
    emailPlaceholder: "admin@ktpclsimms.in",
    panelTitleLine1: "Substation Inventory &",
    panelTitleLine2: "Maintenance Management",
    panelDescription:
      "A single, centralized platform for Spectrum Consultants to track inventory, maintenance, and equipment health across every KTPCL region and substation.",
    features: [
      { icon: MapPin, label: "Region & substation-wide visibility" },
      { icon: ClipboardList, label: "Job cards & preventive maintenance tracking" },
      { icon: ShieldCheck, label: "Role-based, secure access control" },
    ],
    switchHref: "/login/ae",
    switchLabel: "Account Executive? Sign in here",
  },
  account_executive: {
    heading: "Field sign-in",
    subheading: "Sign in to manage your substation",
    emailPlaceholder: "ae.yourname@ktpclsimms.in",
    panelTitleLine1: "Your Substation,",
    panelTitleLine2: "In Your Hands",
    panelDescription:
      "Update inventory, raise job cards, and request service for your assigned substation — visible to Spectrum Consultants in real time.",
    features: [
      { icon: Boxes, label: "Track and update stock at your substation" },
      { icon: Wrench, label: "Raise job cards and service requests" },
      { icon: ShieldCheck, label: "Access limited to your assigned substation" },
    ],
    switchHref: "/login",
    switchLabel: "Spectrum Admin? Sign in here",
  },
} as const;

export function LoginForm({ role }: { role: Role }) {
  const router = useRouter();
  const config = VARIANTS[role];
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      setError(authError?.message ?? "Sign in failed. Check your credentials and try again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      setError("No profile found for this account. Contact your administrator.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (profile.status === "inactive") {
      setError("This account has been disabled. Contact your administrator.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (profile.role !== role && !(role === "account_executive" && profile.role === "service_engineer")) {
      if (profile.role === "spectrum_admin") {
        setError("This account is registered as a Spectrum Admin. Use the Admin sign-in page.");
      } else if (profile.role === "account_executive") {
        setError("This account is registered as an Account Executive. Use the Account Executive sign-in page.");
      } else if (profile.role === "service_engineer") {
        setError("This account is registered as a Service Engineer. Use the Service Engineer sign-in page.");
      } else {
        setError("You are not authorised to access this portal.");
      }
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    const destination =
      profile.role === "spectrum_admin" ? "/admin" :
      profile.role === "service_engineer" ? "/se" : "/ae";
    router.push(destination);
    router.refresh();
  }

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left branded panel */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative flex-col justify-between bg-[#0B1A3D] text-white p-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur border border-white/10">
              <Zap className="h-5 w-5 text-blue-300" strokeWidth={2.25} />
            </div>
            <div className="leading-none">
              <p className="text-sm font-semibold">KTPCL SIMMS</p>
              <p className="text-[11px] text-blue-200/70 mt-0.5">Spectrum Consultants</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-8">
          <div>
            <h1 className="text-3xl xl:text-4xl font-semibold leading-tight tracking-tight">
              {config.panelTitleLine1}
              <br /> {config.panelTitleLine2}
            </h1>
            <p className="text-blue-200/70 text-sm mt-4 max-w-md leading-relaxed">{config.panelDescription}</p>
          </div>

          <div className="space-y-4">
            {config.features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/10">
                  <f.icon className="h-4 w-4 text-blue-300" />
                </div>
                <span className="text-sm text-blue-100/90">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-blue-200/50">© 2026 Spectrum Consultants. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">KTPCL SIMMS</span>
          </div>

          <h2 className="text-2xl font-semibold text-foreground tracking-tight">{config.heading}</h2>
          <p className="text-sm text-foreground-secondary mt-1.5">{config.subheading}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 rounded-[10px] border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder={config.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-xs font-medium text-accent hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground-secondary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground-secondary">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border text-accent focus:ring-accent/40" />
              Keep me signed in for 7 days
            </label>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-foreground-secondary">
            <Link href={config.switchHref} className="font-medium text-accent hover:underline">
              {config.switchLabel}
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-foreground-secondary">
            Trouble signing in? Contact your Spectrum Consultants system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
