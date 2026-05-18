import type { Metadata } from 'next';

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
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
