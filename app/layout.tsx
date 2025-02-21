import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: "variable" });

export const metadata: Metadata = {
  title: "Keyboard Event Test Page",
  description: "test page for keyboard events with debugging IME",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Keyboard Event Test Page</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Test behavior of keyboard events in React & your browser & your IME" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
