import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Archivo_Black, Work_Sans, Space_Mono } from "next/font/google";
import "./globals.css";

/**
 * RawBlock typography (FRONTEND-SPEC A3), self-hosted via next/font.
 * next/font downloads these at build time and serves them from the app's
 * own origin — there is NO runtime request to any font CDN.
 */
const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "spec0",
  description: "Idea → PRD → full documentation package.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${archivoBlack.variable} ${workSans.variable} ${spaceMono.variable} h-full`}
      >
        <body className="min-h-full flex flex-col bg-white font-sans text-black antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
