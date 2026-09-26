import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RPA 인프라 통합 관제",
  description: "인프라, 네트워크 연결, EOSL 및 운영 관리 포털",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
