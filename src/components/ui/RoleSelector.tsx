'use client';
import { User, GraduationCap, LayoutDashboard, ClipboardList, Timer } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RoleSelector({ roles }: { roles: string[] }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3 w-full mt-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">
        Selecciona un perfil para ingresar
      </p>
      
      {/* Opción PANEL ADMIN (Solo si es Admin) */}
      {roles.includes('admin') && (
        <button 
          onClick={() => router.push('/admin/dashboard')}
          className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-50 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group bg-white shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white group-hover:scale-110 transition-transform">
              <LayoutDashboard size={20} />
            </div>
            <div className="text-left">
              <span className="block font-black text-slate-700 uppercase text-[11px] leading-none">Panel Gestión</span>
              <span className="text-[10px] text-slate-400 font-bold italic">Administrador</span>
            </div>
          </div>
          <div className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
            →
          </div>
        </button>
      )}

      {/* Opción PANEL PROFESOR (Solo si es Teacher) */}
      {roles.includes('teacher') && (
        <button 
          onClick={() => router.push('/portal/teacher/dashboard')}
          className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-50 hover:border-amber-500 hover:bg-amber-50/50 transition-all group bg-white shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 p-2 rounded-xl text-white group-hover:scale-110 transition-transform">
              <ClipboardList size={20} />
            </div>
            <div className="text-left">
              <span className="block font-black text-slate-700 uppercase text-[11px] leading-none">Panel Profesor</span>
              <span className="text-[10px] text-slate-400 font-bold italic">Docente</span>
            </div>
          </div>
          <div className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
            →
          </div>
        </button>
      )}
      {/* Opción PREPARADOR FÍSICO (Solo si es prep_fisico) */}
{roles.includes('prep_fisico') && (
  <button 
    onClick={() => router.push('/portal/prep-fisico/rendimiento')}
    className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-50 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group bg-white shadow-sm"
  >
    <div className="flex items-center gap-3">
      <div className="bg-emerald-600 p-2 rounded-xl text-white group-hover:scale-110 transition-transform">
        <Timer size={20} />
      </div>
      <div className="text-left">
        <span className="block font-black text-slate-700 uppercase text-[11px] leading-none">Rendimiento Físico</span>
        <span className="text-[10px] text-slate-400 font-bold italic">Preparador Físico</span>
      </div>
    </div>
    <div className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
      →
    </div>
  </button>
)}

      {/* Opción MI PERFIL (Para Player) */}
      {roles.includes('player') && (
        <button 
          onClick={() => router.push('/portal/dashboard')}
          className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-50 hover:border-orange-500 hover:bg-orange-50/50 transition-all group bg-white shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="bg-orange-600 p-2 rounded-xl text-white group-hover:scale-110 transition-transform">
              <User size={20} />
            </div>
            <div className="text-left">
              <span className="block font-black text-slate-700 uppercase text-[11px] leading-none">Mi Perfil</span>
              <span className="text-[10px] text-slate-400 font-bold italic">Estudiante</span>
            </div>
          </div>
          <div className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
            →
          </div>
        </button>
      )}
    </div>
  );
}