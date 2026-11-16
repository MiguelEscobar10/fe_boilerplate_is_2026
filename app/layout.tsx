import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Encabezado } from "@/components/encabezado";
import { getSession } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SI Boilerplate",
  description: "Boilerplate con login básico",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Mismo chequeo optimista que proxy.ts: hay cookie de sesión.
  const session = await getSession();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {session && <Encabezado />}
        {children}
      </body>
    </html>
  );
}
