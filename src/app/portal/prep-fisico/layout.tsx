'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Timer, LogOut, Menu, X, Shield, User, LayoutGrid } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { CLIENT_CONFIG } from '@/conf/clientConfig'
import { useRouter } from 'next/navigation'

export default function PrepFisicoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [realRoles, setRealRoles] = useState<string[]>([])

  // --- SEGURIDAD Y CARGA DE ROLES ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
      } else {
        // Consultamos los roles para el selector inferior
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (data?.role) {
          const rolesArray = Array.isArray(data.role) 
            ? data.role 
            : data.role.split(',').map((r: string) => r.trim())
          setRealRoles(rolesArray)
        }
        setIsLoading(false)
      }
    }
    checkUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('club_player_id') 
    router.push('/')
  }

  if (isLoading) {
    return <div className="h-screen w-screen bg-gray-50 flex items-center justify-center font-sans text-sm font-bold text-indigo-900">Cargando Panel Técnico...</div>
  }

  const hasAdmin = realRoles.includes('admin')
  const hasTeacher = realRoles.includes('teacher')
  const hasPlayer = realRoles.includes('player')

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* BOTÓN HAMBURGUESA (Móvil) */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-indigo-900 text-white rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* SIDEBAR - Estética idéntica a Admin */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-indigo-900 text-white flex flex-col shadow-xl transition-transform duration-300 transform
        md:relative md:translate-x-0 flex-shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* LOGO CLUB  (Exacto a Admin) */}
        <div className="h-24 flex items-center justify-center border-b border-indigo-800 px-4">
          <div className="flex items-center gap-3 w-full">
            <div className="h-12 w-12 bg-[#1e1b4b] rounded-full flex items-center justify-center border-2 overflow-hidden shadow-md min-w-[3rem]"
  style={{ borderColor: CLIENT_CONFIG.colors.primary }}
>            <img 
                src={CLIENT_CONFIG.logoUrl}
                alt="Club" 
                className="h-full w-full object-cover scale-110" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
        </div>
        <div className="flex flex-col justify-center overflow-hidden">
            <h1 className="font-bold text-sm leading-tight uppercase tracking-tight text-white truncate">
    {CLIENT_CONFIG.name}
              </h1>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN MÓDULOS */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          <Link
            href="/portal/prep-fisico/rendimiento"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
              pathname.includes('/rendimiento')
                ? 'bg-indigo-600 text-white shadow-md transform translate-x-1'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            <Timer className={`mr-3 h-5 w-5 transition-transform group-hover:scale-110 flex-shrink-0 ${pathname.includes('/rendimiento') ? 'text-orange-400' : ''}`} />
            Rendimiento
          </Link>
        </nav>

        {/* SECCIÓN CAMBIO DE PERFIL (Anclada abajo) */}
        {(hasAdmin || hasTeacher || hasPlayer) && (
          <div className="px-3 py-4 border-t border-indigo-800 bg-indigo-950/30 space-y-1">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 ml-4 opacity-50">Cambiar Perfil</p>
            
            {hasAdmin && (
              <button onClick={() => router.push('/admin/dashboard')} className="flex w-full items-center px-4 py-2 text-[11px] font-bold text-indigo-300 hover:bg-indigo-800 rounded-lg transition-colors">
                <Shield className="mr-3 h-4 w-4" /> Ir a Gestión
              </button>
            )}
            {hasTeacher && (
              <button onClick={() => router.push('/portal/teacher/dashboard')} className="flex w-full items-center px-4 py-2 text-[11px] font-bold text-amber-400 hover:bg-amber-900/20 rounded-lg transition-colors">
                <User className="mr-3 h-4 w-4" /> Ir a Panel Profe
              </button>
            )}
            {hasPlayer && (
              <button onClick={() => router.push('/portal/dashboard')} className="flex w-full items-center px-4 py-2 text-[11px] font-bold text-orange-400 hover:bg-orange-900/20 rounded-lg transition-colors">
                <LayoutGrid className="mr-3 h-4 w-4" /> Ir a Panel Socio
              </button>
            )}
          </div>
        )}

        {/* BOTÓN SALIR */}
        <div className="p-4 border-t border-indigo-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-4 py-3 text-sm font-medium text-red-300 hover:bg-red-900/30 hover:text-red-200 rounded-xl transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* OVERLAY MÓVIL */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto bg-gray-50 relative">
        <div className="w-full h-full p-4 md:p-8">
            {children}
        </div>
      </main>
    </div>
  )
}