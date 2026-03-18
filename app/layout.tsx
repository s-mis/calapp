import type { Metadata, Viewport } from 'next';
import ThemeRegistry from './ThemeRegistry';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'CalApp - Calorie Tracker',
  description: 'Track your daily calorie intake',
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#0D0D0D',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ThemeRegistry>
            {children}
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}
