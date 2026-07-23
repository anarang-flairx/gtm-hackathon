import type { Metadata } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: "GTM Outbound Desk",
  description: "CSLB contractor prospecting with Apollo-enriched contacts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${instrument.variable} ${newsreader.variable} antialiased`}>
        <div className="min-h-screen">
          <AppNav />
          <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
