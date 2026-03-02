import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from './providers'; // 引入我们刚才写的文件

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "B2B Cross-Border Payment",
  description: "Secure Crypto Payment for SMEs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 包裹 Providers，让整个 App 都能连钱包 */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
