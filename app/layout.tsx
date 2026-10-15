import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")),
  title: "Loja dos Calçados | Rio do Sul, SC",
  description: "Conheça a Loja dos Calçados em Rio do Sul, SC. Explore o catálogo e solicite seu pedido pelo WhatsApp.",
  openGraph: { title: "Loja dos Calçados", description: "Calçados e atendimento próximo em Rio do Sul, SC.", images: ["/banner-editorial.png"], type: "website" },
  icons: {
    icon: "/logo-loja-dos-calcados.png",
    shortcut: "/logo-loja-dos-calcados.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
