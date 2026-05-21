import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import { bodyFont, monoFont } from '@/lib/fonts';
import QueryProvider from '@/components/shared/QueryProvider';

import './globals.css';

export const metadata: Metadata = {
  title: 'LankaCommerce',
  description: 'SaaS Tenant ERP for modern retail',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${monoFont.variable} antialiased`}>
      <body>
        <a
          href="#main-content"
          className="fixed left-2 top-2 z-[9999] -translate-y-full rounded-lg bg-[#1B2B3A] px-4 py-2 text-sm font-medium text-white transition-transform focus:translate-y-0"
        >
          Skip to main content
        </a>
        <QueryProvider>{children}</QueryProvider>
        {/* Accessible live region wrapper for toast announcements */}
        <div role="status" aria-live="polite" aria-atomic={false}>
          <Toaster
            position="top-right"
            richColors
          />
        </div>
      </body>
    </html>
  );
}
