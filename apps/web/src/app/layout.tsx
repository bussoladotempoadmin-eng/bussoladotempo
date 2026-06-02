import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getServerSession } from 'next-auth';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { SessionProvider } from '@/components/session-provider';
import { authOptions } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Bússola do Tempo',
  description: 'Sistema de gestão de tempo Frente × Categoria — onde seu tempo realmente foi.',
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
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
