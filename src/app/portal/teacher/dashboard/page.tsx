'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck, LogOut, Calendar as CalendarIcon,
  Lock, ChevronLeft, ChevronRight, Users, History,
  CheckCircle2, UserCheck, UserX, Menu, X, Edit2, Save
} from 'lucide-react'
import { CLIENT_CONFIG } from '@/conf/clientConfig';

export default function DashboardProfe() {
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

  const [teacher, setTeacher] = useState({ id: '', name: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [monthPractices, setMonthPractices] = useState<any[]>([]);
  const [historySummary, setHistorySummary] = useState<Record<number, {present: number, absent: number}>>({});
  const [playerStats, setPlayerStats] = useState<Record<string, any[]>>({});

  const [activeTab, setActiveTab] = useState<'calendario' | 'asistencia' | 'divisiones' | 'historial'>('calendario');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [attendanceRecord, setAttendanceRecord] = useState<Record<string, string>>({});
  const [gradesRecord, setGradesRecord] = useState<Record<string, string>>({}); // Nuevo estado para notas
  const [isAttendanceDone, setIsAttendanceDone] = useState(false);
  const [selectedHistoryPractice, setSelectedHistoryPractice] = useState<any | null>(null);
  const [historyAttendance, setHistoryAttendance] = useState<any[]>([]);
  const [isEditingHistory, setIsEditingHistory] = useState(false);

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
        });

        setHistorySummary(stats);
        setPlayerStats(pStats);

        const todayStr = getTodayArgentina();
        const todayPractice = allPractices.find(p => p.category_id === currentId && p.scheduled_date.startsWith(todayStr));
        if (todayPractice) {
          const hasAtt = attData?.some(a => a.practice_id === todayPractice.id);
          setIsAttendanceDone(!!hasAtt);
        } else {
          setIsAttendanceDone(false);
        }
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
  }, [allPlayers, selectedCategoryId, isEditingHistory]);

  const saveAttendance = async () => {
    const todayStr = getTodayArgentina();
    const practiceToSave = isEditingHistory ? selectedHistoryPractice : monthPractices.find(p => p.scheduled_date.startsWith(todayStr));
    
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
      
      // Guardar notas si es examen
      if (practiceToSave.event_type === 'examen') {
        const gradeRows = Object.entries(gradesRecord).map(([playerId, score]) => ({
          practice_id: practiceToSave.id,
          player_id: playerId,
          score: score === '' ? null : parseFloat(score)
        })).filter(row => row.score !== null);

        if (gradeRows.length > 0) {
          const { error: gradeError } = await supabase.from('grades').upsert(gradeRows, { onConflict: 'practice_id,player_id' });
          if (gradeError) throw gradeError;
        }
      }

      await loadData();
      if (isEditingHistory) {
        setIsEditingHistory(false);
        setSelectedHistoryPractice(null);
      } else {
        setIsAttendanceDone(true);
      }
      setActiveTab('historial');
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

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
      const practice = monthPractices.find(p => p.scheduled_date.startsWith(dayStr));
      const isPast = dayStr < todayStr;
      const isToday = dayStr === todayStr;
      
      const isExam = practice?.event_type === 'examen';

      days.push(
        <div key={d} className="h-20 md:h-24 border border-slate-100 p-1 md:p-2 relative flex flex-col justify-between">
          <span className={`text-[10px] font-bold ${isToday ? 'text-indigo-600' : 'text-slate-300'}`}>{d}</span>
          {practice && (
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <div onClick={() => { if (isToday) setActiveTab('asistencia'); else if (isPast) setActiveTab('historial'); }}
                className={`p-0.5 md:p-1 rounded-[4px] text-[6px] md:text-[7px] font-black text-center transition-all ${
                  isToday ? (isExam ? 'bg-orange-600' : 'bg-indigo-600') + ' text-white cursor-pointer shadow-md' :
                  isPast ? 'bg-slate-100 text-slate-500 cursor-pointer hover:bg-indigo-100' :
                  'bg-orange-50 text-orange-400'
                }`}>
                {isToday ? (isExam ? 'EXAMEN' : 'HOY') : isPast ? 'pasados' : 'proximo'}
              </div>
              <div className={`text-[5px] md:text-[9px] font-black text-center uppercase truncate leading-none mt-0.5 md:mt-1 ${isExam ? 'text-orange-500' : 'text-slate-500'}`}>
                {practice.title || practice.observations?.replace('Turno: ', '').trim() || 'Sin Hora'}
              </div>
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  if (initialLoading) return <div className="h-screen flex items-center justify-center font-black text-indigo-950 animate-pulse uppercase tracking-widest">Cargando Portal...</div>;

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
                alt={CLIENT_CONFIG.name} 
                className="h-full w-full object-cover scale-110" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>

            <div className="flex flex-col justify-center overflow-hidden">
              <h1 className="font-bold text-sm leading-tight uppercase tracking-tight text-white truncate">
                {CLIENT_CONFIG.name}
              </h1>
              <p className="text-[10px] text-indigo-300 font-bold uppercase truncate tracking-tighter">{teacher.name}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {[
            { id: 'calendario', icon: CalendarIcon, label: 'Calendario' },
            { id: 'asistencia', icon: ClipboardCheck, label: 'Asistencia' },
            { id: 'divisiones', icon: Users, label: 'Divisiones' },
            { id: 'historial', icon: History, label: 'Historial' }
          ].map((item: any) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSelectedHistoryPractice(null); setIsEditingHistory(false); setIsMenuOpen(false); }}
                className={`flex w-full items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md transform translate-x-1'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isActive ? 'text-orange-400' : ''}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button
            onClick={() => { supabase.auth.signOut(); router.push('/portal'); }}
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

      <main className="flex-1 overflow-y-auto bg-gray-50 relative p-4 md:p-10 scroll-smooth">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 mt-12 md:mt-0">
          <div>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Panel del Profesor</p>
            <h2 className="text-3xl md:text-5xl font-black text-indigo-950 uppercase italic tracking-tighter leading-none">{activeTab}</h2>
          </div>
          {activeTab !== 'divisiones' && (
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
          )}
        </header>

        {activeTab === 'calendario' && (
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
        )}

        {activeTab === 'asistencia' && (
          <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
            {!monthPractices.find(p => p.scheduled_date.startsWith(getTodayArgentina())) ? (
              <div className="bg-white p-10 md:p-20 rounded-[32px] md:rounded-[40px] text-center border-2 border-dashed border-slate-200">
                <Lock className="mx-auto mb-6 text-slate-200" size={48}/>
                <p className="font-black text-slate-400 uppercase text-xs tracking-widest">No hay clases para hoy</p>
              </div>
            ) : isAttendanceDone ? (
              <div className="bg-emerald-50 p-10 md:p-20 rounded-[32px] md:rounded-[40px] text-center border-2 border-emerald-100">
                <CheckCircle2 className="mx-auto mb-6 text-emerald-500" size={48}/>
                <p className="font-black text-emerald-900 uppercase text-xs tracking-widest">Lista enviada correctamente</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-indigo-600 p-6 md:p-8 rounded-[32px] md:rounded-[40px] text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl">
                  <h3 className="text-xl md:text-2xl font-black uppercase italic text-center md:text-left">Pase de lista hoy</h3>
                  <button disabled={isSaving} onClick={saveAttendance} className="w-full md:w-auto bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-xs hover:bg-orange-500 hover:text-white transition-all">
                    {isSaving ? 'GUARDANDO...' : 'FINALIZAR'}
                  </button>
                </div>
                {allPlayers.filter(p => p.category_id === selectedCategoryId && p.status === 'active').map(p => (
                  <div key={p.id} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 flex flex-col sm:flex-row justify-between items-center shadow-sm gap-3">
                    <span className="font-black text-slate-700 uppercase text-[10px] md:text-xs">{p.name}</span>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={() => setAttendanceRecord(v => ({...v, [p.id]: 'present'}))} className={`flex-1 sm:flex-none px-4 md:px-5 py-3 rounded-xl text-[9px] md:text-[10px] font-black transition-all ${attendanceRecord[p.id] === 'present' ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400'}`}>PRESENTE</button>
                      <button onClick={() => setAttendanceRecord(v => ({...v, [p.id]: 'absent'}))} className={`flex-1 sm:flex-none px-4 md:px-5 py-3 rounded-xl text-[9px] md:text-[10px] font-black transition-all ${attendanceRecord[p.id] === 'absent' ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-400'}`}>AUSENTE</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'divisiones' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-indigo-900 p-4 md:p-6 text-white">
                  <p className="font-black uppercase italic text-sm md:text-lg leading-none">
                    {cat.name} <span className="opacity-60 text-xs md:text-sm"></span>
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[8px] md:text-[10px] font-black bg-white/20 px-2 py-0.5 rounded uppercase tracking-tighter">
                      {cat.sedeName}
                    </span>
                    <span className="text-[8px] md:text-[10px] font-black bg-indigo-500/50 px-2 py-0.5 rounded uppercase tracking-tighter">
                      {cat.deporteName}
                    </span>
                  </div>
                </div>

                <div className="p-4 md:p-6 space-y-2">
                  {allPlayers.filter(p => p.category_id === cat.id && p.status === 'active').map(p => {
                    const allRecs = playerStats[p.id] || [];
                    const filteredRecs = allRecs.filter((r: any) => r.category_id === cat.id);
                    const totalClases = filteredRecs.length;
                    const presentes = filteredRecs.filter((r: any) => r.status === 'present').length;
                    const porc = totalClases > 0 ? Math.round((presentes / totalClases) * 100) : 0;

                    return (
                      <div key={p.id} className="p-3 md:p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                        <span className="text-[10px] md:text-xs font-black text-slate-700 uppercase">{p.name}</span>
                        <div className={`px-3 py-2 md:px-4 md:py-2 rounded-xl border font-black text-[9px] md:text-[10px] ${porc >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                          {totalClases > 0 ? `${porc}% ASIST.` : 'SIN DATOS'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {selectedHistoryPractice ? (
              <div className="pb-10">
                <button onClick={() => { setSelectedHistoryPractice(null); setIsEditingHistory(false); }} className="text-indigo-600 font-black text-[10px] uppercase mb-4 flex items-center gap-2"><ChevronLeft size={14}/> VOLVER</button>
                <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-xl relative">
                  {!isEditingHistory && (
                    <button 
                      onClick={async () => {
                        const editData: Record<string, string> = {};
                        const editGrades: Record<string, string> = {};
                        
                        historyAttendance.forEach(att => { editData[att.player_id] = att.status; });
                        
                        if (selectedHistoryPractice.event_type === 'examen') {
                          const { data: gData } = await supabase.from('grades').select('player_id, score').eq('practice_id', selectedHistoryPractice.id);
                          gData?.forEach(g => { editGrades[g.player_id] = g.score.toString(); });
                        }

                        setAttendanceRecord(editData);
                        setGradesRecord(editGrades);
                        setIsEditingHistory(true);
                      }}
                      className="absolute top-6 right-6 md:top-8 md:right-8 flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-2 rounded-xl font-black text-[9px] md:text-[10px] hover:bg-orange-600 hover:text-white transition-all border border-orange-100 shadow-sm"
                    >
                      <Edit2 size={12}/> EDITAR / CALIFICAR
                    </button>
                  )}
                  <div className={`border-b pb-4 mb-6 md:mb-8 ${selectedHistoryPractice.event_type === 'examen' ? 'border-orange-100' : ''}`}>
                    <h3 className={`text-xl md:text-2xl font-black uppercase italic pr-16 md:pr-0 ${selectedHistoryPractice.event_type === 'examen' ? 'text-orange-600' : 'text-indigo-950'}`}>
                      {isEditingHistory ? 'Editando' : 'Detalle'}: {selectedHistoryPractice.title || selectedHistoryPractice.scheduled_date.split('T')[0]}
                    </h3>
                    {selectedHistoryPractice.event_type === 'examen' && <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Tipo: Examen / Evaluación</span>}
                  </div>
                  {isEditingHistory ? (
                    <div className="space-y-3 md:space-y-4">
                      {allPlayers.filter(p => p.category_id === selectedCategoryId && p.status === 'active').map(p => (
                        <div key={p.id} className="flex flex-col sm:flex-row justify-between items-center p-3 md:p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                          <span className="font-black text-slate-700 uppercase text-[10px] md:text-xs min-w-[120px]">{p.name}</span>
                          <div className="flex flex-1 gap-2 w-full sm:w-auto items-center">
                            <button onClick={() => setAttendanceRecord(v => ({...v, [p.id]: 'present'}))} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[8px] md:text-[9px] font-black transition-all ${attendanceRecord[p.id] === 'present' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}>PRESENTE</button>
                            <button onClick={() => setAttendanceRecord(v => ({...v, [p.id]: 'absent'}))} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[8px] md:text-[9px] font-black transition-all ${attendanceRecord[p.id] === 'absent' ? 'bg-red-500 text-white' : 'bg-white text-slate-400'}`}>AUSENTE</button>
                            
                            {selectedHistoryPractice.event_type === 'examen' && (
                              <input 
                                type="number"
                                placeholder="Nota"
                                value={gradesRecord[p.id] || ''}
                                onChange={(e) => setGradesRecord(v => ({...v, [p.id]: e.target.value}))}
                                disabled={attendanceRecord[p.id] === 'absent'}
                                className="w-16 p-2 rounded-lg border-2 border-slate-200 text-center font-black text-xs outline-none focus:border-orange-400 disabled:opacity-30"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button disabled={isSaving} onClick={saveAttendance} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs hover:bg-orange-500 transition-all shadow-md">
                          {isSaving ? 'GUARDANDO...' : 'FINALIZAR CAMBIOS'}
                        </button>
                        <button onClick={() => setIsEditingHistory(false)} className="w-full sm:w-auto px-8 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-xs">CANCELAR</button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {historyAttendance.map((record, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl">
                          <span className="font-black text-slate-700 uppercase text-[10px] md:text-xs">{record.users?.name || 'Alumno'}</span>
                          <div className="flex items-center gap-3">
                            <span className={`text-[8px] md:text-[9px] font-black px-2 py-1 rounded-lg ${record.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                              {record.status === 'present' ? 'PRESENTE' : 'AUSENTE'}
                            </span>
                            {selectedHistoryPractice.event_type === 'examen' && (
                               <div className="bg-white border px-3 py-1 rounded-lg font-black text-orange-600 text-xs">
                                  {gradesRecord[record.player_id] ? `Nota: ${gradesRecord[record.player_id]}` : '-'}
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
              <div className="grid gap-3 pb-10">
                {monthPractices.filter(p => historySummary[p.id]).reverse().map(p => {
                  const isExam = p.event_type === 'examen';
                  return (
                    <div key={p.id} onClick={async () => {
                      const { data: attData } = await supabase.from('attendance').select(`status, player_id, users!player_id (name), professor_id`).eq('practice_id', p.id);
                      
                      // Cargar notas si es examen para la vista detalle
                      if (p.event_type === 'examen') {
                        const { data: gData } = await supabase.from('grades').select('player_id, score').eq('practice_id', p.id);
                        const loadedGrades: Record<string, string> = {};
                        gData?.forEach(g => { loadedGrades[g.player_id] = g.score.toString(); });
                        setGradesRecord(loadedGrades);
                      } else {
                        setGradesRecord({});
                      }

                      setHistoryAttendance(attData || []); 
                      setSelectedHistoryPractice(p);
                    }} className={`bg-white p-5 md:p-6 rounded-[24px] md:rounded-[32px] border flex justify-between items-center hover:border-indigo-400 cursor-pointer shadow-sm group active:bg-slate-50 transition-all ${isExam ? 'border-orange-200 bg-orange-50/10' : 'border-slate-100'}`}>
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={`px-3 py-2 md:p-4 rounded-xl md:rounded-2xl font-black text-[9px] md:text-xs uppercase italic ${isExam ? 'bg-orange-600 text-white' : 'bg-slate-50 text-indigo-900'}`}>
                          {isExam ? 'EXAMEN' : p.scheduled_date.split('T')[0]}
                        </div>
                        <div className="flex flex-col">
                          {isExam && <span className="text-[8px] font-black text-orange-500 uppercase leading-none mb-1">{p.scheduled_date.split('T')[0]}</span>}
                          <div className="flex gap-3 md:gap-4">
                            <div className="flex items-center gap-1 text-emerald-500"><UserCheck size={14}/> <span className="text-[10px] md:text-xs font-black">{historySummary[p.id]?.present || 0}</span></div>
                            <div className="flex items-center gap-1 text-red-500"><UserX size={14}/> <span className="text-[10px] md:text-xs font-black">{historySummary[p.id]?.absent || 0}</span></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase hidden md:inline ${isExam ? 'text-orange-500' : 'text-slate-300'}`}>
                          {isExam ? p.title : 'Ver Clase'}
                        </span>
                        <ChevronRight size={18} className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}