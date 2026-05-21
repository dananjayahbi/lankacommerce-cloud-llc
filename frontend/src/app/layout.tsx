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
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[9999] focus:rounded-lg focus:bg-[#1B2B3A] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
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
