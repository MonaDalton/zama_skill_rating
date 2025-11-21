import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "@/components/Navigation/NavBar";

export const metadata: Metadata = {
  title: "Encrypted Skill Rating Hub",
  description: "Privacy-Preserving, Verifiable Team Assessment Platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <Providers>
          <NavBar />
          <main className="max-w-container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

