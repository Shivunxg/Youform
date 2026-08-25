import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "KPTCL Sign In — KTPCL SIMMS" };

export default function KPTCLLoginPage() {
  return <LoginForm role="kptcl_engineer" />;
}
