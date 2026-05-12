import type { Metadata } from "next";

import { AppProviders } from "@/lib/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "GastroGuide Admin",
  description: "Админ-панель GastroGuide",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
