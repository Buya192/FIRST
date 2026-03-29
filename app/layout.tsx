import React from 'react';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../src/App.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aplikasi Web Sempurna",
  description: "Aplikasi web dengan tampilan dan kinerja yang optimal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-gray-100 text-gray-800`}>
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </body>
    </html>
  );
}