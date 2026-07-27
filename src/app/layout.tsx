import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KTPCL SIMMS | Substation Inventory & Maintenance Management System",
  description: "Enterprise inventory and maintenance management platform for KTPCL substations, operated by Spectrum Consultants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
