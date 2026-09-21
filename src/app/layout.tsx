import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RPA Infrastructure Control Center",
  description: "Infrastructure, connectivity, EOSL and operations portal",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
