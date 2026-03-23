import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Brat-Inspired Generator', description: 'Create brat-inspired sticker-ready images and animated exports.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
