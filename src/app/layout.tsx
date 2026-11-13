import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { isAuthEnabled } from "@/lib/auth";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SEO Turtle Tool",
  description: "SEO audits, living strategy, and content generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${geistMono.variable} ${plusJakarta.className} h-full antialiased dark`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        <AppShell authEnabled={isAuthEnabled()}>{children}</AppShell>
      </body>
    </html>
  );
}
