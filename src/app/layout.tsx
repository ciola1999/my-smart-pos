// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // ✅ CSS Global dimuat SATU KALI di sini
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { DbGuard } from "@/components/db-guard";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NexLanding - Portfolio',
  description: 'Showcase of my works',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Kita tambahkan suppressHydrationWarning jaga-jaga jika ada extension browser yang bikin error */}
      <body className={inter.className}>
        {/* Layout ini polos, tidak ada Navbar di sini */}
        <NuqsAdapter>
          <DbGuard>{children}
            </DbGuard>
          </NuqsAdapter>
      </body>
    </html>
  );
}
