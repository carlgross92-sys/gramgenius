import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "GramGenius",
  description: "AI-Powered Instagram Growth Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${sora.variable} ${sora.className}`}>
      <body className="min-h-screen bg-[#0a0a0a] text-white antialiased">
        <Sidebar />
        <main className="ml-0 lg:ml-60 min-h-screen pt-14 lg:pt-0">{children}</main>
      </body>
    </html>
  );
}
