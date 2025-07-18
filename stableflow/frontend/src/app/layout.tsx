import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from '@/components/providers/Providers';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StableFlow - Enterprise Stablecoin Platform",
  description: "Production-grade Tether-scale stablecoin platform built with NestJS microservices",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
