import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalCallingProvider from "@/components/GlobalCallingProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
