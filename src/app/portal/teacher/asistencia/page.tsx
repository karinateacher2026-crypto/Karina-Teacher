'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabaseClient'; // Asegurate de que esta ruta sea correcta
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Users, CheckCircle2, Tag, Search, Calendar as CalendarIcon, Loader2 } from 'lucide-react';

export default function TeacherAsistenciaPage() {
  const router = useRouter();

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

  // --- ESTADOS EXACTOS DEL DASHBOARD ORIGINAL ---
  const [teacher, setTeacher] = useState({ id: '', name: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(() => {
    try { const s = sessionStorage.getItem('teacherCategoryId'); return s ? Number(s) : null; } catch { return null; }
  });
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [monthPractices, setMonthPractices] = useState<any[]>([]);
  
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [attendanceRecord, setAttendanceRecord] = useState<Record<string, string>>({});
  const [gradesRecord, setGradesRecord] = useState<Record<string, string>>({}); 
  const [selectedPracticeId, setSelectedPracticeId] = useState<string | null>(null);
  const [donePractices, setDonePractices] = useState<string[]>([]);

  // --- LÓGICA DE CARGA DE DATOS (Intacta) ---
  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/');

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
          ), 
          users:professor_id (id, name)
        `)
        .eq('professor_id', session.user.id);

      if (!assignments || assignments.length === 0) return;

      const profeInfo = assignments[0].users as any;
      const profeCats = assignments.map((a: any) => ({
        ...a.categories,
        sedeName: a.categories.sedes?.name || 'Sin Sede',
        deporteName: a.categories.deportes?.name || 'Sin Deporte',
        displayName: `${a.categories.name}`
      })).filter(Boolean);

      setTeacher({ id: profeInfo.id, name: profeInfo.name });
      setCategories(profeCats);
      
      const myCategoryIds = profeCats.map(c => c.id);
      const currentId = selectedCategoryId || profeCats[0]?.id;
      if (!selectedCategoryId) {
        setSelectedCategoryId(currentId);
        sessionStorage.setItem('teacherCategoryId', String(currentId));
      }

      const { data: relData, error: relError } = await supabase
        .from('user_categories')
        .select(`
          category_id,
          users:user_id (id, name, status, role)
        `)
        .in('category_id', myCategoryIds);

      if (relError) throw relError;

      const players = relData
        ?.map((rel: any) => ({
          ...rel.users,
          category_id: rel.category_id
        }))
        .filter(p => p.role?.includes('player'))
        .sort((a, b) => a.name.localeCompare(b.name)) || [];

      setAllPlayers(players);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateLimitStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: allPractices } = await supabase
        .from('practices')
        .select('*')
        .in('category_id', myCategoryIds)
        .gte('scheduled_date', dateLimitStr)
        .order('scheduled_date', { ascending: true });

      setMonthPractices(allPractices?.filter(p => p.category_id === currentId) || []);

      if (allPractices && allPractices.length > 0) {
        const { data: attData } = await supabase
          .from('attendance')
          .select('practice_id, player_id, status')
          .in('practice_id', allPractices.map(p => p.id));
        
        const doneIds: string[] = [];

        attData?.forEach(row => {
          if (!doneIds.includes(row.practice_id)) doneIds.push(row.practice_id);
        });

        setDonePractices(doneIds);
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setInitialLoading(false);
    }
  }, [selectedCategoryId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Por defecto marcamos todos como 'presente' al abrir una clase
    if (allPlayers.length > 0 && selectedCategoryId) {
      const defaultAttendance: Record<string, string> = {};
      allPlayers
        .filter(p => p.category_id === selectedCategoryId && p.status === 'active')
        .forEach(p => { defaultAttendance[p.id] = 'present'; });
      setAttendanceRecord(defaultAttendance);
    }
  }, [allPlayers, selectedCategoryId, selectedPracticeId]);

  // --- LÓGICA DE GUARDADO EXACTA ---
  const saveAttendance = async () => {
    const practiceToSave = monthPractices.find(p => p.id === selectedPracticeId);
    
    if (!practiceToSave || isSaving) return;
    setIsSaving(true);
    try {
      const rows = Object.entries(attendanceRecord).map(([playerId, status]) => ({
        practice_id: practiceToSave.id,
        player_id: playerId,
        professor_id: teacher.id,
        status: status
      }));

      const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'practice_id,player_id' });
      if (error) throw error;
      
      if (practiceToSave.event_type === 'examen') {
        const gradeRows = Object.entries(gradesRecord)
          .map(([playerId, scores]: [string, any]) => {
            const w = scores?.writing === '' ? null : parseFloat(scores?.writing);
            const s = scores?.speaking === '' ? null : parseFloat(scores?.speaking);

            return {
              practice_id: practiceToSave.id,
              player_id: playerId,
              score_writing: w, 
              score_speaking: s 
            };
          })
          .filter(row => row.score_writing !== null || row.score_speaking !== null);

        if (gradeRows.length > 0) {
          const { error: gradeError } = await supabase
            .from('grades')
            .upsert(gradeRows, { onConflict: 'practice_id,player_id' });
            
          if (gradeError) throw gradeError;
        }
      }

      await loadData();
      // Ya no redirigimos al historial, simplemente limpiamos el ID para volver al menú de clases del día
      setSelectedPracticeId(null);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (initialLoading) return <div className="h-screen flex items-center justify-center font-black text-indigo-950 animate-pulse uppercase tracking-widest">Cargando Asistencia...</div>;

  return (
    // ESTE CONTENEDOR ES EL QUE DA LOS MÁRGENES Y FONDO GRIS AL DASHBOARD
    <div className="flex-1 overflow-y-auto bg-gray-50 relative p-4 md:p-10 scroll-smooth min-h-screen text-left">
      
      {/* CABECERA EXACTA DEL DASHBOARD */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 mt-12 md:mt-0">
        <div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Panel del Profesor</p>
          <h2 className="text-3xl md:text-5xl font-black text-indigo-950 uppercase italic tracking-tighter leading-none">Asistencia</h2>
        </div>
        
        {/* SELECTOR DE CURSO - Solo se muestra si no hay una clase abierta */}
        {!selectedPracticeId && (
          <select 
            value={selectedCategoryId || ''} 
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedCategoryId(id);
              setSelectedPracticeId(null);
              sessionStorage.setItem('teacherCategoryId', String(id));
            }} 
            className="w-full md:w-auto bg-white border-2 border-slate-200 px-6 py-3 rounded-2xl font-bold text-xs shadow-sm outline-none"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.sedeName} | {c.deporteName}
              </option>
            ))}
          </select>
        )}
      </header>

      {/* --- CÓDIGO LITERAL QUE ME PASASTE --- */}
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {!selectedPracticeId ? (
          /* --- VISTA: SELECCIÓN DE EVENTO --- */
          <div className="space-y-4">
            <p className="font-black text-slate-400 uppercase text-xs tracking-widest text-center">Selecciona un evento de hoy para pasar lista:</p>
            {monthPractices
              .filter(p => p.scheduled_date.startsWith(getTodayArgentina()))
              .map((p) => {
                const type = (p?.event_type || 'clase') as 'clase' | 'examen' | 'revision';
                const horario = p.observations?.replace('Turno: ', '').trim() || 'Horario no definido';
                const isDone = donePractices.includes(p.id);
                
                const config = {
                  examen: { icon: <Tag size={16} />, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Examen' },
                  revision: { icon: <Search size={16} />, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Revisión' },
                  clase: { icon: <Users size={16} />, color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Clase' }
                };

                const { icon, color, bg, label } = config[type];

                return (
                  <button 
                    key={p.id} 
                    onClick={() => setSelectedPracticeId(p.id)} 
                    className={`w-full p-5 md:p-6 rounded-3xl border-2 flex justify-between items-center transition-all group ${
                      isDone ? 'bg-emerald-50 border-emerald-200 opacity-80' : 'bg-white border-slate-100 hover:border-indigo-500 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className={`p-3 rounded-2xl ${isDone ? 'bg-emerald-100 text-emerald-600' : bg + ' ' + color}`}>
                        {icon}
                      </div>
                      <div>
                        <h4 className="font-black text-indigo-950 text-lg md:text-xl uppercase italic leading-none">
                          {label}
                        </h4>
                        <span className="font-bold text-slate-400 text-xs tracking-tight">
                          {horario}
                        </span>
                      </div>
                    </div>
                    {isDone ? (
                      <div className="flex items-center gap-2 bg-emerald-100 px-3 py-1.5 rounded-xl">
                        <span className="font-black text-[9px] text-emerald-700 uppercase">Completado</span>
                        <CheckCircle2 className="text-emerald-500" size={18}/>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ChevronRight size={20} />
                      </div>
                    )}
                  </button>
                );
              })}
            
            {monthPractices.filter(p => p.scheduled_date.startsWith(getTodayArgentina())).length === 0 && (
              <div className="bg-white p-10 rounded-[32px] border-2 border-dashed border-slate-200 text-center">
                <CalendarIcon className="mx-auto mb-4 text-slate-300" size={40} />
                <p className="font-black text-slate-400 uppercase text-xs tracking-widest">No hay eventos programados para hoy</p>
              </div>
            )}
          </div>
        ) : donePractices.includes(selectedPracticeId) ? (
          /* --- VISTA: FEEDBACK COMPLETADO --- */
          <div className="bg-emerald-50 p-10 md:p-20 rounded-[32px] md:rounded-[40px] text-center border-2 border-emerald-100">
            <CheckCircle2 className="mx-auto mb-6 text-emerald-500" size={48}/>
            <p className="font-black text-emerald-900 uppercase text-xs tracking-widest mb-4">Lista enviada correctamente</p>
            <button onClick={() => setSelectedPracticeId(null)} className="bg-white border border-emerald-200 text-emerald-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-sm hover:bg-emerald-600 hover:text-white transition-all">
              Volver a eventos del día
            </button>
          </div>
        ) : (
          /* --- VISTA: LISTA DE ALUMNOS (PASE DE LISTA) --- */
          <div className="space-y-4">
            {(() => {
              const p = monthPractices.find(x => x.id === selectedPracticeId);
              const type = (p?.event_type || 'clase') as 'clase' | 'examen' | 'revision';
              const horario = p?.observations?.replace('Turno: ', '').trim() || 'Horario no definido';
              const label = type === 'examen' ? 'Examen' : type === 'revision' ? 'Revisión' : 'Clase';
              
              return (
                <div className={`p-6 md:p-8 rounded-[32px] md:rounded-[40px] text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl transition-colors ${
                  type === 'examen' ? 'bg-orange-600' : type === 'revision' ? 'bg-emerald-600' : 'bg-indigo-600'
                }`}>
                  <div className="text-center md:text-left">
                    <button onClick={() => setSelectedPracticeId(null)} className="text-white/70 text-[10px] font-black uppercase mb-2 flex items-center gap-1 hover:text-white">
                      <ChevronLeft size={12}/> VOLVER
                    </button>
                    <h3 className="text-2xl md:text-3xl font-black uppercase italic leading-none">
                      {label}
                    </h3>
                    <p className="text-white/80 font-bold text-sm mt-1">{horario}</p>
                  </div>
                  <button 
                    disabled={isSaving} 
                    onClick={saveAttendance} 
                    className="w-full md:w-auto bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-xs hover:bg-slate-900 hover:text-white transition-all shadow-lg active:scale-95"
                  >
                    {isSaving ? 'GUARDANDO...' : 'FINALIZAR PASE'}
                  </button>
                </div>
              );
            })()}

            <div className="grid gap-3">
              {allPlayers.filter(p => p.category_id === selectedCategoryId && p.status === 'active').map(p => (
                <div key={p.id} className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-100 flex flex-col sm:flex-row justify-between items-center shadow-sm hover:shadow-md transition-shadow gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400 text-[10px] shrink-0">
                      {p.name.substring(0,2).toUpperCase()}
                    </div>
                    <span className="font-black text-slate-700 uppercase text-[11px] md:text-xs">{p.name}</span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => setAttendanceRecord(v => ({...v, [p.id]: 'present'}))} 
                      className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[9px] md:text-[10px] font-black transition-all ${attendanceRecord[p.id] === 'present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    >
                      PRESENTE
                    </button>
                    <button 
                      onClick={() => setAttendanceRecord(v => ({...v, [p.id]: 'absent'}))} 
                      className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[9px] md:text-[10px] font-black transition-all ${attendanceRecord[p.id] === 'absent' ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    >
                      AUSENTE
                    </button>

                    {/* Inputs de Notas W y S (Solo si es Examen y está Presente) */}
                    {monthPractices.find(x => x.id === selectedPracticeId)?.event_type === 'examen' && attendanceRecord[p.id] === 'present' && (
                      <div className="flex gap-2 justify-center shrink-0">
                        <input 
                          type="number" 
                          placeholder="W" 
                          value={(gradesRecord[p.id] as any)?.writing || ''} 
                          onChange={(e) => setGradesRecord(v => ({...v, [p.id]: { ...(v[p.id] as any), writing: e.target.value }}))} 
                          className="w-14 h-10 px-1 py-2 rounded-xl border-2 border-slate-100 bg-white text-center font-black text-sm text-orange-600 focus:border-orange-400 outline-none transition-all placeholder:text-slate-300 shadow-sm" 
                        />
                        <input 
                          type="number" 
                          placeholder="S" 
                          value={(gradesRecord[p.id] as any)?.speaking || ''} 
                          onChange={(e) => setGradesRecord(v => ({...v, [p.id]: { ...(v[p.id] as any), speaking: e.target.value }}))} 
                          className="w-14 h-10 px-1 py-2 rounded-xl border-2 border-slate-100 bg-white text-center font-black text-sm text-orange-600 focus:border-orange-400 outline-none transition-all placeholder:text-slate-300 shadow-sm" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}