import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { getServerSession } from 'next-auth';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { SessionProvider } from '@/components/session-provider';
import { PwaRegister } from '@/components/pwa-register';
import { ToastProvider } from '@/components/toast';
import { BottomNav } from '@/components/bottom-nav';
import { TourHost } from '@/components/tour/tour-host';
import { authOptions } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'https://bussoladotempo.com.br'),
  title: 'Bússola do Tempo',
  description: 'Sistema de gestão de tempo Frente × Categoria — onde seu tempo realmente foi.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Bússola do Tempo',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Bússola' },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>
              {children}
              <BottomNav />
              <TourHost />
            </ToastProvider>
            <PwaRegister />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
