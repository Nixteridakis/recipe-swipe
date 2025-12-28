import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AppShell } from "./AppShell";
import { CartProvider } from "./cart-context";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brasserie",
  description: "Editorial recipe collection and kitchen companion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="default">
      <body
        className={`${plusJakartaSans.variable} ${beVietnamPro.variable} ${geistMono.variable}`}
      >
        <CartProvider>
          <AppShell>{children}</AppShell>
        </CartProvider>
      </body>
    </html>
  );
}
