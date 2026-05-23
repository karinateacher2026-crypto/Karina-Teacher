'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabaseClient'; // Verificá que la ruta de supabase sea correcta
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, UserCheck, UserX, Edit2 } from 'lucide-react';

export default function TeacherHistorialPage() {
  const router = useRouter();

  // --- ESTADOS EXACTOS DEL DASHBOARD ---
  const [teacher, setTeacher] = useState({ id: '', name: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [monthPractices, setMonthPractices] = useState<any[]>([]);
  const [historySummary, setHistorySummary] = useState<Record<number, {present: number, absent: number}>>({});
  
  // (Estados que mantenemos para que la lógica original no se rompa)
  const [playerStats, setPlayerStats] = useState<Record<string, any[]>>({});
  const [donePractices, setDonePractices] = useState<string[]>([]);
  const [selectedPracticeId, setSelectedPracticeId] = useState<string | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [attendanceRecord, setAttendanceRecord] = useState<Record<string, string>>({});
  const [gradesRecord, setGradesRecord] = useState<Record<string, string>>({}); 
  const [selectedHistoryPractice, setSelectedHistoryPractice] = useState<any | null>(null);
  const [historyAttendance, setHistoryAttendance] = useState<any[]>([]);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterType, setFilterType] = useState('');

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
      if (!selectedCategoryId) setSelectedCategoryId(currentId);

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
        
        const stats: any = {};
        const pStats: any = {};
        const doneIds: string[] = [];

        attData?.forEach(row => {
          const practiceInfo = allPractices.find(p => p.id === row.practice_id);
          const catId = practiceInfo?.category_id;

          if (!stats[row.practice_id]) stats[row.practice_id] = { present: 0, absent: 0 };
          row.status === 'present' ? stats[row.practice_id].present++ : stats[row.practice_id].absent++;
          
          if (!pStats[row.player_id]) pStats[row.player_id] = [];
          pStats[row.player_id].push({ 
            practice_id: row.practice_id, 
            status: row.status,
            category_id: catId 
          });

          if (!doneIds.includes(row.practice_id)) doneIds.push(row.practice_id);
        });

        setHistorySummary(stats);
        setPlayerStats(pStats);
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
    if (allPlayers.length > 0 && selectedCategoryId && !isEditingHistory) {
      const defaultAttendance: Record<string, string> = {};
      allPlayers
        .filter(p => p.category_id === selectedCategoryId && p.status === 'active')
        .forEach(p => { defaultAttendance[p.id] = 'present'; });
      setAttendanceRecord(defaultAttendance);
    }
  }, [allPlayers, selectedCategoryId, isEditingHistory, selectedPracticeId]);

  // --- FUNCIÓN GUARDAR (Intacta) ---
  const saveAttendance = async () => {
    const practiceToSave = isEditingHistory ? selectedHistoryPractice : monthPractices.find(p => p.id === selectedPracticeId);
    
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
      if (isEditingHistory) {
        setIsEditingHistory(false);
        setSelectedHistoryPractice(null);
      } else {
        setSelectedPracticeId(null);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (initialLoading) return <div className="h-screen flex items-center justify-center font-black text-indigo-950 animate-pulse uppercase tracking-widest">Cargando Portal...</div>;

  return (
    // ESTE CONTENEDOR ES EL QUE DA LOS MÁRGENES Y FONDO GRIS AL DASHBOARD
    <div className="flex-1 overflow-y-auto bg-gray-50 relative p-4 md:p-10 scroll-smooth min-h-screen text-left">
      
      {/* CABECERA EXACTA DEL DASHBOARD */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 mt-12 md:mt-0">
        <div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Panel del Profesor</p>
          <h2 className="text-3xl md:text-5xl font-black text-indigo-950 uppercase italic tracking-tighter leading-none">historial</h2>
        </div>
        
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

      {/* --- CÓDIGO LITERAL QUE ME PASASTE --- */}
      <div className="max-w-4xl mx-auto space-y-4">
        {selectedHistoryPractice ? (
          <div className="pb-10">
            <button 
              onClick={() => { setSelectedHistoryPractice(null); setIsEditingHistory(false); }} 
              className="text-indigo-600 font-black text-[10px] uppercase mb-4 flex items-center gap-2"
            >
              <ChevronLeft size={14}/> VOLVER
            </button>
            
            <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-xl relative">
              {!isEditingHistory && (
                <button 
                  onClick={async () => {
                    const editData: Record<string, string> = {};
                    const editGrades: Record<string, any> = {};
                    historyAttendance.forEach(att => { editData[att.player_id] = att.status; });
                    
                    if (selectedHistoryPractice.event_type === 'examen') {
                      const { data: gData } = await supabase
                        .from('grades')
                        .select('player_id, score_writing, score_speaking')
                        .eq('practice_id', selectedHistoryPractice.id);
                      
                      gData?.forEach(g => { 
                        editGrades[g.player_id] = { 
                          writing: g.score_writing?.toString() || '', 
                          speaking: g.score_speaking?.toString() || '' 
                        }; 
                      });
                    }

                    setAttendanceRecord(editData);
                    setGradesRecord(editGrades);
                    setIsEditingHistory(true);
                  }}
                  className="absolute top-6 right-6 md:top-8 md:right-8 flex items-center gap-2 bg-slate-50 text-slate-600 px-3 py-2 rounded-xl font-black text-[9px] md:text-[10px] hover:bg-indigo-600 hover:text-white transition-all border border-slate-100 shadow-sm"
                >
                  <Edit2 size={12}/> EDITAR / CALIFICAR
                </button>
              )}

              {/* CABECERA DEL DETALLE */}
              {(() => {
                const type = selectedHistoryPractice.event_type || 'clase';
                const colors = { examen: 'text-orange-600 border-orange-100', revision: 'text-emerald-600 border-emerald-100', clase: 'text-indigo-950 border-slate-100' };
                const labels = { examen: 'Examen', revision: 'Revisión', clase: 'Clase' };
                return (
                  <div className={`border-b pb-4 mb-6 md:mb-8 ${colors[type as keyof typeof colors]}`}>
                    <h3 className={`text-xl md:text-2xl font-black uppercase italic pr-16 md:pr-0 ${colors[type as keyof typeof colors].split(' ')[0]}`}>
                      {isEditingHistory ? 'Editando' : 'Detalle'}: {labels[type as keyof typeof labels]}
                    </h3>
                    <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">
                      {selectedHistoryPractice.scheduled_date.split('T')[0]} — {selectedHistoryPractice.observations?.replace('Turno: ', '').trim() || 'Sin horario'}
                    </span>
                  </div>
                );
              })()}

              {/* LISTADO DE ALUMNOS EN EL DETALLE */}
              {isEditingHistory ? (
                <div className="space-y-3">
                  {allPlayers.filter(p => p.category_id === selectedCategoryId && p.status === 'active').map(p => (
                    <div key={p.id} className="flex flex-col sm:flex-row justify-between items-center p-3 md:p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                      <span className="font-black text-slate-700 uppercase text-[10px] md:text-xs min-w-[120px]">{p.name}</span>
                      <div className="flex flex-1 gap-2 w-full sm:w-auto items-center justify-end">
                        <button onClick={() => setAttendanceRecord(v => ({...v, [p.id]: 'present'}))} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[8px] md:text-[9px] font-black ${attendanceRecord[p.id] === 'present' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}>PRESENTE</button>
                        <button onClick={() => setAttendanceRecord(v => ({...v, [p.id]: 'absent'}))} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[8px] md:text-[9px] font-black ${attendanceRecord[p.id] === 'absent' ? 'bg-red-500 text-white' : 'bg-white text-slate-400'}`}>AUSENTE</button>
                        {selectedHistoryPractice.event_type === 'examen' && (
                          <div className="flex gap-2">
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
                  <div className="flex gap-3 pt-4">
                    <button onClick={saveAttendance} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase">Guardar Cambios</button>
                    <button onClick={() => setIsEditingHistory(false)} className="px-8 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  {historyAttendance.map((record, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-2xl">
                      <span className="font-black text-slate-700 uppercase text-[10px] md:text-xs">{record.users?.name || 'Alumno'}</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-[8px] font-black px-2 py-1 rounded-lg ${record.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {record.status === 'present' ? 'PRESENTE' : 'AUSENTE'}
                        </span>
                        {selectedHistoryPractice.event_type === 'examen' && (
                           <div className="flex gap-1">
                              <div className="bg-white border px-2 py-1 rounded-lg font-black text-orange-600 text-[9px]">W: {(gradesRecord[record.player_id] as any)?.writing || '-'}</div>
                              <div className="bg-white border px-2 py-1 rounded-lg font-black text-orange-600 text-[9px]">S: {(gradesRecord[record.player_id] as any)?.speaking || '-'}</div>
                           </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* LISTADO GENERAL CON FILTROS */
          <>
           <div className="flex flex-col md:flex-row gap-2 mb-6">
  {/* NUEVO: Filtro Año Dinámico */}
  {/* Filtro Año */}
  <select 
    value={filterYear} 
    onChange={(e) => setFilterYear(e.target.value)} 
    className="flex-1 bg-white border-2 border-slate-100 px-4 py-3 rounded-xl font-black text-[10px] uppercase outline-none shadow-sm"
  >
    <option value="">TODOS LOS AÑOS</option>
    {Array.from(new Set(monthPractices.map(p => p.scheduled_date.split('-')[0])))
      .sort((a: any, b: any) => b - a)
      .map(year => (
        <option key={year} value={year}>{year}</option>
      ))}
  </select>

  {/* Filtro Mes */}
  <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="flex-1 bg-white border-2 border-slate-100 px-4 py-3 rounded-xl font-black text-[10px] uppercase outline-none shadow-sm">
    <option value="">Todos los meses</option>
    {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
      <option key={m} value={m}>{new Date(2026, parseInt(m)-1).toLocaleString('es', {month: 'long'})}</option>
    ))}
  </select>

  {/* Filtro Tipo */}
  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="flex-1 bg-white border-2 border-slate-100 px-4 py-3 rounded-xl font-black text-[10px] uppercase outline-none shadow-sm">
    <option value="">Todos los eventos</option>
    <option value="clase">Clases</option>
    <option value="examen">Exámenes</option>
    <option value="revision">Revisiones</option>
  </select>
</div>

            <div className="grid gap-3 pb-10">
              {monthPractices
                .filter(p => p.category_id === selectedCategoryId)
                .filter(p => !filterYear || p.scheduled_date.startsWith(filterYear)) // <--- ESTO FILTRA POR AÑO
                .filter(p => !filterMonth || p.scheduled_date.split('-')[1] === filterMonth)
                .filter(p => !filterType || (p.event_type || 'clase') === filterType)
                .filter(p => historySummary[p.id])
                .reverse()
                .map(p => {
                  const type = p.event_type || 'clase';
                  const style = {
                    examen: { label: 'EXAMEN', bg: 'bg-orange-600', text: 'text-orange-500' },
                    revision: { label: 'REVISIÓN', bg: 'bg-emerald-600', text: 'text-emerald-500' },
                    clase: { label: 'CLASE', bg: 'bg-indigo-600', text: 'text-indigo-400' }
                  }[type as 'examen' | 'revision' | 'clase'];

                  return (
                    <div key={p.id} onClick={async () => {
                        const { data: attData } = await supabase.from('attendance').select(`status, player_id, users!player_id (name)`).eq('practice_id', p.id);
                        if (type === 'examen') {
                          const { data: gData } = await supabase.from('grades').select('player_id, score_writing, score_speaking').eq('practice_id', p.id);
                          const loadedGrades: Record<string, any> = {};
                          gData?.forEach(g => { loadedGrades[g.player_id] = { writing: g.score_writing?.toString() || '', speaking: g.score_speaking?.toString() || '' }; });
                          setGradesRecord(loadedGrades);
                        } else { setGradesRecord({}); }
                        setHistoryAttendance(attData || []); 
                        setSelectedHistoryPractice(p);
                      }} 
                      className="p-5 bg-white rounded-[24px] border border-slate-100 flex justify-between items-center hover:border-indigo-400 cursor-pointer shadow-sm group transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`${style.bg} text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase italic min-w-[75px] text-center`}>{style.label}</div>
                        <div className="flex flex-col">
                          <span className={`text-[8px] font-black uppercase ${style.text}`}>{p.scheduled_date.split('T')[0]}</span>
                          <div className="flex gap-3 mt-1">
                            <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-black"><UserCheck size={12}/> {historySummary[p.id]?.present || 0}</div>
                            <div className="flex items-center gap-1 text-red-500 text-[10px] font-black"><UserX size={12}/> {historySummary[p.id]?.absent || 0}</div>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-200 group-hover:text-indigo-400" />
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}