import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "./Nav";

export const metadata: Metadata = {
  title: "맑음",
  description: "셀프 웨딩 준비 OS — 가격이 맑아지는 결혼 준비",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full">
        <main className="mx-auto w-full max-w-lg px-4 pb-24 pt-6">{children}</main>
        <Nav />
      </body>
    </html>
  );
}
