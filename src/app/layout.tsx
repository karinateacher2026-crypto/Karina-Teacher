import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CLIENT_CONFIG } from "@/conf/clientConfig"; // Importamos tu config
import MaintenanceGuard from "./maintenanceguard"; // <--- AGREGADO

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// METADATOS PERSONALIZADOS PARA CEDETALVO
export const metadata: Metadata = {
  title: `${CLIENT_CONFIG.name}`, 
  description: `Sitio oficial de ${CLIENT_CONFIG.name}.`,
  manifest: "/manifest.json", 
  keywords: [],
  icons: {
    icon: [
      { url: CLIENT_CONFIG.logoUrl, sizes: "any" }, // Usamos tu logo dinámico
    ],
    apple: CLIENT_CONFIG.logoUrl,
  },
  openGraph: {
    title: CLIENT_CONFIG.name,
    description: "",
    url: "https://www.cedetalvo.com.ar", // Cambiá esto cuando tengas el dominio
    siteName: CLIENT_CONFIG.name,
    images: [{ url: CLIENT_CONFIG.logoUrl, width: 512, height: 512 }],
    locale: "es_AR",
    type: "website",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* Color de la barra de direcciones en el celular (usamos tu azul) */}
       <meta name="theme-color" content={CLIENT_CONFIG.colors.primary} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* ENVOLVEMOS CON EL GUARD PARA ACTIVAR EL MANTENIMIENTO */}
        <MaintenanceGuard>
          {children}
        </MaintenanceGuard>
      </body>
    </html>
  );
}