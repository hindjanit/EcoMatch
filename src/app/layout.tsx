import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import GlobalCallingProvider from "@/components/GlobalCallingProvider";

const geistSans = localFont({
  src: "./fonts/Geist-Latin.woff2",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Latin.woff2",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "EcoMatch — Circular Material Exchange & AI Waste Intelligence",
  description:
    "Next-generation circular material exchange marketplace powered by AI waste classification, safe exchange protocols and transparent ownership records.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className="min-h-full flex flex-col bg-[#07160f] text-[#f3f4e9]">
        <GlobalCallingProvider>
          {children}
        </GlobalCallingProvider>
      </body>
    </html>
  );
}
