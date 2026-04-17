import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ShelfSwap",
    template: "%s · ShelfSwap",
  },
  description: "Local book marketplace — list, discover, and swap near you.",
  applicationName: "ShelfSwap",
  icons: {
    icon: [{ url: "/brand/icon.png", type: "image/png" }],
    apple: [{ url: "/brand/icon.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#6b4f3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="shelfswap"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-base-100 text-base-content font-sans">
        {children}
      </body>
    </html>
  );
}
