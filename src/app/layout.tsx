import type { Metadata, Viewport } from 'next';
import { Unbounded, DM_Sans, Space_Mono } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';

const unbounded = Unbounded({
  variable: '--font-unbounded',
  subsets: ['latin'],
  weight: ['700', '800'],
  display: 'swap',
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

const spaceMono = Space_Mono({
  variable: '--font-space-mono',
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#1A1008',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Chop & Drop — Real Naija Food. Right At Your Door.',
    template: '%s | Chop & Drop',
  },
  description:
    'Authentic Nigerian food delivery across Lagos and Abuja. Jollof rice, egusi soup, suya, continental dishes, snacks and more. Order online — fast delivery, guaranteed fresh.',
  keywords: [
    'Nigerian food delivery', 'jollof rice', 'egusi soup', 'suya', 'afang soup',
    'ofada rice', 'Lagos food delivery', 'Abuja food delivery', 'Naija food online',
    'pepper soup delivery', 'pounded yam', 'fried rice Lagos',
  ],
  authors: [{ name: 'Chop & Drop' }],
  creator: 'Chop & Drop',
  publisher: 'Chop & Drop',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    title: 'Chop & Drop — Real Naija Food. Right At Your Door.',
    description: 'Order authentic Nigerian food online. Fast delivery across Lagos and Abuja. Local dishes, continental, snacks, junk food, desserts & drinks.',
    siteName: 'Chop & Drop',
    locale: 'en_NG',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Chop & Drop — Nigerian Food Delivery' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chop & Drop — Real Naija Food. Right At Your Door.',
    description: 'Order authentic Nigerian food online. Fast delivery across Lagos and Abuja.',
    images: ['/og-image.png'],
    creator: '@chopanddrop',
  },
  category: 'food delivery',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${unbounded.variable} ${dmSans.variable} ${spaceMono.variable}`}
    >
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
