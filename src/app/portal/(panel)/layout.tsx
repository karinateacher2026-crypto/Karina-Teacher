'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { CLIENT_CONFIG } from '@/conf/clientConfig';
import { 
  LayoutDashboard, User, LogOut, Menu, Loader2, 
  Upload, Calendar, Timer, Shield, X, Trophy
} from 'lucide-react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname(); // Para saber qué pestaña está activa
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [realRoles, setRealRoles] = useState<string[]>([]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const checkUserAndRoles = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/portal');
          return;
        }

        const storedId = session.user.id;
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', storedId)
          .single();

        if (userError || !userData) {
          throw new Error('No se encontró el perfil del usuario');
        }

        setUser(userData);
        setRealRoles(Array.isArray(userData.role) ? userData.role : [userData.role]);

      } catch (error) {
        console.error(error);
        router.replace('/portal');
      } finally {
        setLoading(false);
      }
    };

    checkUserAndRoles();
  }, []);

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    localStorage.clear(); 
    router.replace('/portal');
  };

  const closeSidebarMobile = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e1b4b]">
        <Loader2 className="animate-spin text-white" size={40}/>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans relative text-left">
      {/* ---------------- BARRA LATERAL (ASIDE) ---------------- */}
      <aside className={`bg-[#1e1b4b] text-white transition-all duration-300 ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'} fixed h-full z-30 flex flex-col shadow-xl overflow-hidden text-left`}>
        <div className="p-6 flex items-center justify-between border-b border-white/10 min-w-[256px] lg:min-w-0 text-left">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 text-left">
              <div className="h-12 w-12 bg-[#1e1b4b] rounded-full flex items-center justify-center overflow-hidden shadow-md min-w-[3rem]"
              >
                <img 
                  src={CLIENT_CONFIG.logoUrl}
                  alt={CLIENT_CONFIG.name} 
                  className="h-full w-full object-cover scale-110" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div className="flex flex-col justify-center overflow-hidden">
                <h1 className="font-bold text-sm leading-tight uppercase tracking-tight text-white truncate">
                  {CLIENT_CONFIG.acortadoname}
                </h1>
              </div>
            </div>
          ) : (
            <div className="h-10 w-10 mx-auto bg-[#1e1b4b] rounded-full flex items-center justify-center  overflow-hidden shrink-0">
              <img src={CLIENT_CONFIG.logoUrl} className="h-full w-full object-cover scale-125" alt="Logo mini"/>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white lg:hidden text-left">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-6 min-w-[256px] lg:min-w-0 text-left">
  {/* BOTONES CONVERTIDOS A LINKS */}
  <Link href="/portal/estado-cuenta" onClick={closeSidebarMobile} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${pathname === '/portal/estado-cuenta' ? 'bg-[#4f46e5] text-white font-bold shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
    <LayoutDashboard size={20} /> {sidebarOpen && <span>Estado de cuenta</span>}
  </Link>
  
  <Link href="/portal/perfil" onClick={closeSidebarMobile} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${pathname === '/portal/perfil' ? 'bg-[#4f46e5] text-white font-bold shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
    <User size={20} /> {sidebarOpen && <span>Mi Perfil</span>}
  </Link>
  
  <Link href="/portal/informar-pago" onClick={closeSidebarMobile} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${pathname === '/portal/informar-pago' ? 'bg-[#4f46e5] text-white font-bold shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
    <Upload size={20} /> {sidebarOpen && <span>Informar Pago</span>}
  </Link>
  
  <Link href="/portal/asistencia" onClick={closeSidebarMobile} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${pathname === '/portal/asistencia' ? 'bg-[#4f46e5] text-white font-bold shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
    <Calendar size={20} /> {sidebarOpen && <span>Asistencia</span>}
  </Link>

  <Link href="/portal/terminos" onClick={closeSidebarMobile} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${pathname === '/portal/terminos' ? 'bg-[#4f46e5] text-white font-bold shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
    <Shield size={20} /> {sidebarOpen && <span>Términos y Condiciones</span>}
  </Link>
</nav>

        <div className="p-4 border-t border-white/10 min-w-[256px] lg:min-w-0 text-left">
          {/* SECCIÓN DE CAMBIO DE ROL */}
          {(() => {
            const hasAdmin = realRoles.includes('admin');
            const hasTeacher = realRoles.includes('teacher');

            if (!hasAdmin && !hasTeacher) return null;

            return (
              <>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-4">Cambiar Perfil</p>
                
                {hasAdmin && (
                  <button onClick={() => router.push('/admin/dashboard')} className="w-full flex items-center gap-3 px-4 py-3 mb-2 text-indigo-400 hover:bg-indigo-500/10 rounded-xl font-bold transition text-left group border border-indigo-500/10">
                    <Shield size={20} className="group-hover:rotate-12 transition-transform" /> 
                    {sidebarOpen && <span>Ir a Gestión</span>}
                  </button>
                )}

                {hasTeacher && (
                  <button onClick={() => router.push('/portal/teacher/calendario')} className="w-full flex items-center gap-3 px-4 py-3 mb-2 text-amber-400 hover:bg-amber-500/10 rounded-xl font-bold transition text-left group border border-amber-500/10">
                    <User size={20} className="group-hover:rotate-12 transition-transform" /> 
                    {sidebarOpen && <span>Ir a Panel Profe</span>}
                  </button>
                )}
                <div className="my-2 border-t border-white/5"></div>
              </>
            );
          })()}

          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-bold transition text-left">
            <LogOut size={20} /> {sidebarOpen && <span>Salir</span>}
          </button>
        </div>
      </aside>

      {/* OVERLAY PARA MÓVILES */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden text-left" onClick={() => setSidebarOpen(false)}></div>}

      {/* ---------------- ÁREA DE CONTENIDO DINÁMICO ---------------- */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} p-4 md:p-8 text-left bg-gray-50`}>
        {/* Navbar superior para móviles */}
        <div className="lg:hidden mb-4 flex items-center gap-3 text-left">
          <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-[#1e1b4b] text-left">
            <Menu size={24}/>
          </button>
          <h1 className="font-black italic text-sm text-[#1e1b4b] uppercase text-left">{CLIENT_CONFIG.name}</h1>
        </div>

        {/* ACÁ ENTRAN LAS PÁGINAS AISLADAS */}
        {children}
        
      </main>
    </div>
  );
}