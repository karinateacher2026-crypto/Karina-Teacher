'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import {
  ClipboardCheck, LogOut, Calendar as CalendarIcon,
  Users, History, Menu, X, User
} from 'lucide-react';
import { CLIENT_CONFIG } from '@/conf/clientConfig';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [teacherName, setTeacherName] = useState("Profesor");
  
  const pathname = usePathname();
  const router = useRouter();

  // Buscar el nombre del profesor para mostrarlo en la barra
  useEffect(() => {
    const fetchTeacherName = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
            .from('users')
            .select('name')
            .eq('id', session.user.id)
            .single();
        if (data?.name) {
            setTeacherName(data.name);
        }
      }
    };
    fetchTeacherName();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/portal');
  };

  return (
    <div className="flex h-screen bg-gray-50 text-slate-900 overflow-hidden font-sans relative">
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)} 
        className="md:hidden fixed top-4 right-4 z-[60] p-2 bg-indigo-900 text-white rounded-lg shadow-lg"
      >
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-indigo-900 text-white flex flex-col shadow-xl transition-transform duration-300 transform
        md:relative md:translate-x-0 flex-shrink-0
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-24 flex items-center justify-center border-b border-indigo-800 px-4">
          <div className="flex items-center gap-3 w-full">
            <div className="h-12 w-12 bg-[#1e1b4b] rounded-full flex items-center justify-center border-2 overflow-hidden shadow-md min-w-[3rem]"
              style={{ borderColor: CLIENT_CONFIG.colors.primary }}
            >
              <img 
                src={CLIENT_CONFIG.logoUrl}
                alt={CLIENT_CONFIG.acortadoname} 
                className="h-full w-full object-cover scale-110" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="flex flex-col justify-center overflow-hidden">
              <h1 className="font-bold text-sm leading-tight uppercase tracking-tight text-white truncate">
                {CLIENT_CONFIG.acortadoname}
              </h1>
              <p className="text-[10px] text-indigo-300 font-bold uppercase truncate tracking-tighter">{teacherName}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {[
            { id: 'calendario', icon: CalendarIcon, label: 'Calendario', href: '/portal/teacher/calendario' },
            { id: 'asistencia', icon: ClipboardCheck, label: 'Asistencia', href: '/portal/teacher/asistencia' },
            { id: 'divisiones', icon: Users, label: 'Divisiones', href: '/portal/teacher/divisiones' },
            { id: 'historial', icon: History, label: 'Historial', href: '/portal/teacher/historial' }
          ].map((item: any) => {
            const Icon = item.icon;
            // Chequeamos si la ruta actual coincide con el href
            const isActive = pathname === item.href || (pathname === '/portal/teacher/calendario' && item.id === 'calendario');
            
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                onClick={() => setIsMenuOpen(false)}
                className={`flex w-full items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md transform translate-x-1'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isActive ? 'text-orange-400' : ''}`} />
                {item.label}
              </Link>
            );
          })}
          
          <div className="pt-2 mt-2 border-t border-indigo-800/50">
            <Link
              href="/portal/teacher/perfil"
              prefetch={false}
              onClick={() => setIsMenuOpen(false)}
              className={`flex w-full items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                pathname === '/portal/teacher/perfil' 
                  ? 'bg-indigo-600 text-white shadow-md transform translate-x-1' 
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`}
            >
              <User className={`mr-3 h-5 w-5 transition-transform group-hover:scale-110 flex-shrink-0 ${pathname === '/portal/teacher/perfil' ? 'text-orange-400' : ''}`} />
              Mi Perfil
            </Link>
          </div>
        </nav>

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

      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* AQUÍ SE RENDERIZA EL CONTENIDO DE CADA SECCIÓN */}
      <main className="flex-1 overflow-y-auto bg-gray-50 relative scroll-smooth">
        {children}
      </main>
    </div>
  );
}