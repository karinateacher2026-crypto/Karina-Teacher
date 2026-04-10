import { MetadataRoute } from 'next'
import { CLIENT_CONFIG } from '../conf/clientConfig' // Asegurate de que la ruta sea la correcta

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: CLIENT_CONFIG.name,
    short_name: CLIENT_CONFIG.shortName,
    description: `Sistema de Gestión - ${CLIENT_CONFIG.name}`,
    start_url: '/portal',
    display: 'standalone',
    // Llamamos a los colores desde la configuración
    background_color: CLIENT_CONFIG.colors.primary, 
    theme_color: CLIENT_CONFIG.colors.primary,
    icons: [
      {
        src: CLIENT_CONFIG.logoUrl, 
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: CLIENT_CONFIG.logoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}