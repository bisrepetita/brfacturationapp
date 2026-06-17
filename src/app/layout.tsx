import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Bis Repetita Facturation",
  description: "Application de facturation Bis Repetita",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BR Factures",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A1A18",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen" style={{ backgroundColor: "#F9F8F6" }}>
        <AuthProvider>{children}</AuthProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
