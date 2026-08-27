import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "TV Ads Manager",
  description: "Gerenciamento de anúncios em telas digitais",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
