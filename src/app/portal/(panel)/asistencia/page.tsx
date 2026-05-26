'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronLeft, ChevronRight, Tag, Search } from 'lucide-react';

export default function AsistenciaPage() {
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [scheduledPractices, setScheduledPractices] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);

  // 1. Buscamos el usuario logueado y TODAS sus categorías (puede tener varios idiomas)
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        if (userData) {
          const { data: catData } = await supabase
            .from('user_categories')
            .select('category_id, categories(id, name)')
            .eq('user_id', userData.id);
          const userCats = catData?.map((c: any) => ({
            id: c.category_id,
            name: c.categories?.name || `Categoría ${c.category_id}`
          })) || [];
          userData.category_ids = userCats.map(c => c.id);
          setCategories(userCats);
          if (userCats.length > 0) setSelectedCategoryId(userCats[0].id);
          setUser(userData);
        }
      }
      setCalendarLoading(false);
    };
    fetchUser();
  }, []);

  // 2. Fetch de Asistencia, Prácticas y Notas (para todos los idiomas del alumno)
  useEffect(() => {
    const fetchAttendanceAndPractices = async () => {
      if (!user?.id || !user?.category_ids?.length) return;

      try {
        setCalendarLoading(true);
        const [practicesRes, attendanceRes, gradesRes] = await Promise.all([
          supabase.from('practices').select('id, scheduled_date, observations, event_type, title, category_id').in('category_id', user.category_ids),
          supabase.from('attendance').select('practice_id, status').eq('player_id', user.id),
          supabase.from('grades').select('practice_id, score_writing, score_speaking').eq('player_id', user.id)
        ]);

        const combinedData = attendanceRes.data?.map(att => {
          const grade = gradesRes.data?.find(g => g.practice_id === att.practice_id);
          return {
            practice_id: att.practice_id,
            status: att.status,
            score_writing: grade?.score_writing ?? '-',
            score_speaking: grade?.score_speaking ?? '-'
          };
        }) || [];

        if (practicesRes.data) setScheduledPractices(practicesRes.data);
        setAttendanceData(combinedData);
      } catch (err) {
        console.error("Error cargando el calendario de asistencia:", err);
      } finally {
        setCalendarLoading(false);
      }
    };
    
    fetchAttendanceAndPractices();
  }, [user?.id, user?.category_ids?.join(',')]);

  const getTodayArgentina = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
  };

  // 3. Renderizado del calendario (lógica integrada)
  const renderDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const todayStr = getTodayArgentina();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 md:h-32 border border-slate-50" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const practicesForDay = scheduledPractices
        .filter(p => !selectedCategoryId || p.category_id === selectedCategoryId)
        .filter(p => p.scheduled_date.startsWith(dayStr));
      const isPast = dayStr < todayStr;
      const isToday = dayStr === todayStr;

      days.push(
        <div key={d} className="h-24 md:h-32 border border-slate-100 p-1 relative flex flex-col bg-white overflow-hidden">
          <span className={`text-[10px] font-black mb-1 ${isToday ? 'text-indigo-600 underline underline-offset-2' : 'text-slate-300'}`}>{d}</span>
          <div className="flex flex-col gap-1.5 overflow-y-auto no-scrollbar">
            {practicesForDay.map((practice, idx) => {
              const record = attendanceData.find(r => r.practice_id === practice.id);
              const type = (practice?.event_type || 'clase') as 'clase' | 'examen' | 'revision';
              
              const config = {
                examen: { label: 'EXAMEN', bg: 'bg-orange-50', text: 'text-orange-500', icon: <Tag size={7} />, activeBg: 'bg-orange-600' },
                revision: { label: 'REVISIÓN', bg: 'bg-emerald-50', text: 'text-emerald-500', icon: <Search size={7} />, activeBg: 'bg-emerald-600' },
                clase: { label: 'CLASE', bg: 'bg-indigo-50', text: 'text-indigo-400', icon: null, activeBg: 'bg-indigo-600' }
              };
              const style = config[type];

              let statusLabel = style.label;
              let statusClass = isToday ? `${style.activeBg} text-white shadow-sm` : `${style.bg} ${style.text}`;

              if (record) {
                if (record.status === 'present') { statusLabel = 'PRESENTE'; statusClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100'; }
                else if (record.status === 'absent') { statusLabel = 'AUSENTE'; statusClass = 'bg-red-50 text-red-600 border border-red-100'; }
              } else if (isPast) { statusLabel = 'PASADO'; statusClass = 'bg-slate-50 text-slate-400 border border-slate-100'; }
              else if (isToday) { statusLabel = 'HOY'; statusClass = 'bg-indigo-600 text-white shadow-sm'; }

              return (
                <div key={practice.id || idx} className="flex flex-col gap-0.5 shrink-0">
                  <div className={`p-0.5 rounded-[4px] text-[7px] font-black text-center uppercase tracking-tighter ${statusClass}`}>{statusLabel}</div>
                  <div className="flex flex-col items-center leading-tight">
                    <div className="text-[7px] md:text-[8px] font-bold uppercase truncate flex items-center justify-center gap-0.5 text-slate-400">
                      {style.icon}
                      <span className="truncate">{practice.title || style.label}</span>
                    </div>
                  </div>
                  {type === 'examen' && record?.status === 'present' && (
                    <div className="mt-1 flex flex-col gap-0.5">
                      <div className="bg-white/90 border border-orange-200 rounded-md py-0.5 px-1 flex justify-between items-center shadow-sm">
                        <div className="flex flex-col items-center flex-1"><span className="text-[5px] font-bold text-slate-400">W</span><span className="text-[8px] font-black text-orange-600">{record.score_writing ?? '-'}</span></div>
                        <div className="w-[1px] h-3 bg-orange-100 mx-0.5" />
                        <div className="flex flex-col items-center flex-1"><span className="text-[5px] font-bold text-slate-400">S</span><span className="text-[8px] font-black text-orange-600">{record.score_speaking ?? '-'}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-10 text-left w-full">
      {(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateLimitStr = thirtyDaysAgo.toISOString().split('T')[0];
        const recentWithRecord = scheduledPractices
          .filter(p => !selectedCategoryId || p.category_id === selectedCategoryId)
          .filter(p => p.scheduled_date.slice(0, 10) >= dateLimitStr)
          .filter(p => attendanceData.some(a => a.practice_id === p.id));
        const total = recentWithRecord.length;
        const presentes = recentWithRecord.filter(p =>
          attendanceData.find(a => a.practice_id === p.id)?.status === 'present'
        ).length;
        const porc = total > 0 ? Math.round((presentes / total) * 100) : null;

        return (
          <div className="mb-6 mt-2 text-left px-4 md:px-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-black text-[#1e1b4b] uppercase tracking-tighter">Mi Asistencia</h2>
              {porc !== null ? (
                <span className={`px-3 py-1.5 rounded-2xl font-black text-sm border ${
                  porc >= 80
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-orange-50 text-orange-600 border-orange-100'
                }`}>
                  {porc}% <span className="font-bold text-[10px] opacity-70">últimos 30 días</span>
                </span>
              ) : !calendarLoading && (
                <span className="px-3 py-1.5 rounded-2xl font-black text-sm bg-slate-50 text-slate-400 border border-slate-100">
                  Sin datos
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm">Calendario de clases y registro de presencias.</p>
          </div>
        );
      })()}

      {categories.length > 1 && (
        <div className="flex gap-2 px-4 md:px-0 mb-4 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${
                selectedCategoryId === cat.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-xl border border-slate-100 overflow-hidden mx-4 md:mx-0">
        <div className="p-4 md:p-8 bg-slate-50 flex justify-between items-center border-b">
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))} className="p-2 hover:bg-white rounded-full"><ChevronLeft/></button>
            <span className="font-black text-[10px] md:text-sm uppercase tracking-[0.2em] text-indigo-950">{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))} className="p-2 hover:bg-white rounded-full"><ChevronRight/></button>
        </div>
        <div className="grid grid-cols-7">
          {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => <div key={d} className="bg-slate-50 py-3 md:py-4 text-center text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
          {renderDays()}
        </div>
      </div>
    </div>
  );
}