import type { Metadata } from "next";
import { Orbitron, Inter } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monopoly Strategy",
  description: "High-fidelity immersive multiplayer cyberpunk board game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable} h-full antialiased`}>
      <body className="h-full w-full bg-[#0B0E14] text-slate-100 font-sans select-none overflow-hidden">{children}</body>
    </html>
  );
}
