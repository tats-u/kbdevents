import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
