'use client';

import './globals.css';
import { AuthProvider } from '@/lib/auth-context'
import { useEffect } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove any browser extension attributes on mount
  useEffect(() => {
    const body = document.querySelector('body');
    if (body) {
      body.removeAttribute('cz-shortcut-listen');
    }
  }, []);

  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
