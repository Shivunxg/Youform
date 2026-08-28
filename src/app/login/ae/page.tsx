import { redirect } from "next/navigation";

export default function AELoginRedirect() {
  redirect("/login");
}
