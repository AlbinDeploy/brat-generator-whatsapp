import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brat Generator',
  description: 'Clean brat-style generator for static and animated sticker-ready exports.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
