import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "../components/ui/Toast";

export const metadata: Metadata = {
  title: "DOMUS BARBER | Plataforma Operacional Inteligente para Barbearias",
  description: "Gerencie sua barbearia de alta performance com agenda online, financeiro, estoque e inteligência artificial no WhatsApp.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DOMUS BARBER",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B0F19",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased dark">
      <head>
        {/* Preconnect to Google Fonts if used */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="https://api.dicebear.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans overscroll-none">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

