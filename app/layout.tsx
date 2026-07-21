import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "../components/ui/Toast";

export const metadata: Metadata = {
  title: "DOMUS BARBER | Plataforma Operacional Inteligente para Barbearias",
  description: "Gerencie sua barbearia de alta performance com agenda online, financeiro, estoque e inteligência artificial no WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
