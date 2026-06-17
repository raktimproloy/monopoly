import type { Metadata } from "next";
import { Orbitron, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
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
    <html lang="en" className={`${orbitron.variable} ${hanken.variable} h-full antialiased`}>
      <body className="h-full w-full bg-[#151525] text-slate-100 font-sans select-none overflow-hidden">{children}</body>
    </html>
  );
}
