'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Tag, Search, Loader2 } from 'lucide-react';

export default function TeacherCalendarioPage() {
  const router = useRouter();
  
  // 1. ESTADOS EXTRAÍDOS PARA EL CALENDARIO
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [monthPractices, setMonthPractices] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [initialLoading, setInitialLoading] = useState(true);

  // 2. FUNCIÓN DE FECHA LOCAL
  const getTodayArgentina = () => {
    const now = new Date();
    const argentinaTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    return argentinaTime;
  };

  // 3. RECUPERACIÓN DE DATOS (Cursos asignados y prácticas)
  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/');

      // Traemos las categorías (cursos) asignadas al profe
      const { data: assignments } = await supabase
        .from('professor_assignments')
        .select(`
          category_id, 
          categories (
            id, 
            name, 
            gender,
            sedes (name),
            deportes (name)
          )
        `)
        .eq('professor_id', session.user.id);

      if (!assignments || assignments.length === 0) {
        setInitialLoading(false);
        return;
      }

      const profeCats = assignments.map((a: any) => ({
        ...a.categories,
        sedeName: a.categories.sedes?.name || 'Sin Sede',
        deporteName: a.categories.deportes?.name || 'Sin Deporte',
        displayName: `${a.categories.name}`
      })).filter(Boolean);

      setCategories(profeCats);
      
      const myCategoryIds = profeCats.map(c => c.id);
      const currentId = selectedCategoryId || profeCats[0]?.id;
      if (!selectedCategoryId) setSelectedCategoryId(currentId);

      // Traemos las prácticas de los últimos 30 días en adelante
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateLimitStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: allPractices } = await supabase
        .from('practices')
        .select('*')
        .in('category_id', myCategoryIds)
        .gte('scheduled_date', dateLimitStr)
        .order('scheduled_date', { ascending: true });

      // Filtramos solo las que corresponden al curso seleccionado en el select superior
      setMonthPractices(allPractices?.filter(p => p.category_id === currentId) || []);

    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setInitialLoading(false);
    }
  }, [selectedCategoryId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 4. FUNCIÓN VISUAL DEL CALENDARIO (Intacta)
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    const todayStr = getTodayArgentina();

    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-20 md:h-24 border border-slate-50" />);
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayPractices = monthPractices.filter(p => p.scheduled_date.startsWith(dayStr));
      const isPast = dayStr < todayStr;
      const isToday = dayStr === todayStr;
      
      days.push(
        <div key={d} className="h-20 md:h-24 border border-slate-100 p-1 md:p-2 relative flex flex-col justify-start gap-1 overflow-y-auto">
          <span className={`text-[10px] font-bold ${isToday ? 'text-indigo-600 underline underline-offset-2' : 'text-slate-300'}`}>{d}</span>
          
          {dayPractices.map((practice, idx) => {
            const type = (practice?.event_type || 'clase') as 'clase' | 'examen' | 'revision';
            
            const horarioCompleto = practice.observations?.replace('Turno: ', '').trim() || '';
            
            let bgColor = 'bg-indigo-50 text-indigo-400';
            let textColor = 'text-slate-500';

            if (type === 'examen') {
              bgColor = 'bg-orange-50 text-orange-400';
              textColor = 'text-orange-500';
            } else if (type === 'revision') {
              bgColor = 'bg-emerald-50 text-emerald-400';
              textColor = 'text-emerald-500';
            }

            const finalBg = isToday ? bgColor.replace('50', '600').replace('text-', 'text-white ') : bgColor;
            const label = isToday ? 'HOY' : (isPast ? 'pasados' : 'proximo');

            return (
              <div key={idx} className="flex flex-col gap-0.5 shrink-0">
                
                <div 
                    onClick={() => {
                      if (isToday) {
                        router.push('/portal/teacher/asistencia');
                      } else if (isPast) {
                        router.push('/portal/teacher/historial');
                      }
                    }}
                    className={`p-0.5 rounded-[4px] text-[7px] font-black text-center transition-colors cursor-pointer hover:scale-105 ${finalBg} ${isToday ? 'text-white shadow-sm' : ''}`}
                  >
                    {label}
                  </div>
                
                <div className="flex flex-col items-center leading-tight">
                  <span className={`text-[6px] md:text-[7px] font-black opacity-90 whitespace-nowrap ${isToday ? 'text-slate-900' : textColor}`}>
                    {horarioCompleto}
                  </span>
                  <div className={`text-[7px] md:text-[8px] font-bold uppercase truncate flex items-center justify-center gap-0.5 ${isToday ? 'text-slate-800' : 'text-slate-400'}`}>
                    {type === 'examen' && <Tag size={7} className="shrink-0" />}
                    {type === 'revision' && <Search size={7} className="shrink-0" />}
                    <span className="truncate">{practice.title || (type === 'examen' ? 'Examen' : type === 'revision' ? 'Revisión' : 'Clase')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return days;
  };

  // PANTALLA DE CARGA
  if (initialLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center font-black text-indigo-950 uppercase tracking-widest gap-3">
        <Loader2 className="animate-spin text-indigo-600" /> Cargando Calendario...
      </div>
    );
  }

 // 5. RENDERIZADO PRINCIPAL
  return (
    // CAMBIAMOS: quitamos max-w-6xl y mx-auto, ponemos flex-1 para que ocupe el ancho disponible
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-10 scroll-smooth min-h-screen text-left">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 mt-8 md:mt-0">
        <div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Panel del Profesor</p>
          <h2 className="text-3xl md:text-5xl font-black text-indigo-950 uppercase italic tracking-tighter leading-none">Calendario</h2>
        </div>
        
        {/* SELECTOR DE CURSO */}
        <select 
          value={selectedCategoryId || ''} 
          onChange={(e) => setSelectedCategoryId(Number(e.target.value))} 
          className="w-full md:w-auto bg-white border-2 border-slate-200 px-6 py-3 rounded-2xl font-bold text-xs shadow-sm outline-none"
        >
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} - {c.sedeName} | {c.deporteName}
            </option>
          ))}
        </select>
      </header>

      {/* GRILLA DEL CALENDARIO */}
      <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-4 md:p-8 bg-slate-50 flex justify-between items-center border-b">
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))} className="p-2 hover:bg-white rounded-full"><ChevronLeft/></button>
            <span className="font-black text-[10px] md:text-sm uppercase tracking-[0.2em] text-indigo-950">{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))} className="p-2 hover:bg-white rounded-full"><ChevronRight/></button>
        </div>
        <div className="grid grid-cols-7">
          {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => <div key={d} className="bg-slate-50 py-3 md:py-4 text-center text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
          {renderCalendar()}
        </div>
      </div>
    </div>
  );
}