import type { Metadata } from "next";
import { Inter, Unbounded, Montserrat } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter"
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display"
});

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  weight: ["600"]
});

export const metadata: Metadata = {
  title: "Wisery — кабинет клиента",
  description: "SaaS кабинет для салонов красоты и клиник"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} ${unbounded.variable} ${montserrat.variable}`}>{children}</body>
    </html>
  );
}
