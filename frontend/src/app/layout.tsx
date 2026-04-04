import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Ethio-Chain Logistics",
  description:
    "Trade tools for the Ethiopia to Djibouti corridor. Importers and sellers first, with partners on the same lane.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans antialiased text-ec-text bg-ec-surface">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
