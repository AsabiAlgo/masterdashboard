/**
 * Root Layout
 *
 * Application root layout with fonts and global providers.
 */

import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Master Dashboard',
  description: 'Terminal and browser orchestration platform',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var settings = localStorage.getItem('masterdashboard-settings');
                  if (settings) {
                    var parsed = JSON.parse(settings);
                    var theme = parsed.state && parsed.state.theme;
                    if (theme === 'light') {
                      document.documentElement.classList.remove('dark');
                    } else if (theme === 'system') {
                      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                      document.documentElement.classList.toggle('dark', prefersDark);
                    }
                    // animations-disabled class
                    if (parsed.state && parsed.state.animationsEnabled === false) {
                      document.documentElement.classList.add('animations-disabled');
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        style={{
          backgroundColor: 'rgb(var(--bg-canvas))',
          color: 'rgb(var(--text-primary))',
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
