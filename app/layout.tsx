import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "예산 성향 설문",
  description: "예산 선택에 관한 성향 설문",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
