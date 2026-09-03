import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "RBAC Sandbox — Meridian Health Ops",
  description:
    "A hands-on simulator for role-based access control: administer users, groups and roles against live-graded access reviews.",
};

export const viewport: Viewport = {
  themeColor: "#0a0e13",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
