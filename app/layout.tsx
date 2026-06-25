import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "QROAD AI SNS Manager",
  description: "Internal AI-assisted social media operations dashboard",
  icons: {
    icon: "/qroad.png",
    shortcut: "/qroad.png",
    apple: "/qroad.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
