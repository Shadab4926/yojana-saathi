import type { Metadata } from "next";
import { Fraunces, Tiro_Devanagari_Hindi, Hind } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "900"],
  variable: "--font-fraunces"
});

const tiro = Tiro_Devanagari_Hindi({
  subsets: ["devanagari", "latin"],
  weight: "400",
  variable: "--font-tiro"
});

const hind = Hind({
  subsets: ["devanagari", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hind"
});

export const metadata: Metadata = {
  title: "YojanaSaathi — योजना साथी",
  description:
    "Speak your language, find your scheme. Live government welfare scheme search for India."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi">
      <body className={`${fraunces.variable} ${tiro.variable} ${hind.variable} font-body`}>
        {children}
      </body>
    </html>
  );
}
