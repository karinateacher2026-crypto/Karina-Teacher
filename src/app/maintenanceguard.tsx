'use client'
import { useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Hammer } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function MaintenanceGuard({ children }: { children: ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState(false)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const checkStatusAndUser = async () => {
      try {
        // 1. Verificamos si el mantenimiento está activo en la base de datos
        const { data: configData } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'maintenance_mode')
          .single()

        // Si no hay mantenimiento, apagamos el loading y dejamos pasar a todos
        if (!configData?.value) {
          setLoading(false)
          return
        }

        // --- A PARTIR DE ACÁ, SABEMOS QUE HAY MANTENIMIENTO ---

        // 2. Vemos si la persona que está mirando la pantalla ya inició sesión
        const { data: { session } } = await supabase.auth.getSession()

        // Si NO inició sesión, lo dejamos pasar (así puede ver la página pública o el Login)
        if (!session) {
          setLoading(false)
          return
        }

        // 3. Si YA inició sesión, vamos a buscar qué rol tiene a la base de datos
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        // Verificamos si el rol incluye 'player'
        const isSocio = userData?.role?.includes('player')

        // Si ES socio, recién ahí le prendemos la pantalla de bloqueo
        if (isSocio) {
          setIsMaintenance(true)
        }

      } catch (err) {
        console.error("Error mantenimiento:", err)
      } finally {
        setLoading(false)
      }
    }
    
    checkStatusAndUser()
  }, [pathname]) // Agregamos 'pathname' para que vuelva a chequear apenas la ruta cambia (ej: cuando terminan de loguearse)

  // Detectamos si estás corriendo la app en tu compu (modo local)
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  // Si sos vos probando en tu compu (localhost) O estás navegando por rutas /admin, te deja pasar siempre
  if (pathname?.startsWith('/admin') || isLocalhost) return <>{children}</>

  // Mientras carga la decisión, muestra la app normal para no parpadear en blanco
  if (loading) return <>{children}</>

  // Si se determinó que es un SOCIO y el mantenimiento está activo, mostramos el cartelazo
  if (isMaintenance) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#00519E] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="space-y-6 max-w-md animate-in fade-in zoom-in duration-300">
          <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
            <Hammer size={40} className="text-white animate-bounce" />
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            Estamos mejorando el sistema
          </h1>
          <div className="h-1.5 w-16 bg-yellow-400 mx-auto"></div>
          <p className="text-blue-100 font-bold text-lg leading-tight">
            El portal de socios de Cedetalvo volverá a estar en línea en unos minutos.
          </p>
          <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] pt-4 opacity-70">
            Mantenimiento Activo • 2026
          </p>
        </div>
      </div>
    )
  }

  // Si no pasó nada de lo anterior, renderiza la app normal
  return <>{children}</>
}