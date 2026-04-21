'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient'
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, 
  Check, Edit2, Trash2, X, Save, Search, Filter, Users, AlertCircle, Loader2, Info,
  UserCheck
} from 'lucide-react';

export default function AdminPlanner() {
  // ESTADOS PARA PLANIFICADOR (ARRIBA)
  const [sedes, setSedes] = useState<any[]>([]);
  const [deportes, setDeportes] = useState<any[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<number | ''>('');
  const [selectedDeporteId, setSelectedDeporteId] = useState<number | ''>('');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | ''>('');

  // ESTADOS PARA FILTROS DE AGENDA (ABAJO)
  const [filterSedeId, setFilterSedeId] = useState<number | ''>('');
  const [filterDeporteId, setFilterDeporteId] = useState<number | ''>('');
  const [filterCatId, setFilterCatId] = useState<number | ''>('');
  const [filterMonth, setFilterMonth] = useState<string>(''); // <--- NUEVO FILTRO DE MES
  const [filterYear, setFilterYear] = useState<string>(''); // <--- NUEVO ESTADO PARA EL AÑO
  const [timeFilter, setTimeFilter] = useState<'future' | 'past' | 'all'>('future');
  
  const [assignedProfNames, setAssignedProfNames] = useState<string[]>([]);
  const [existingPractices, setExistingPractices] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:30');
  const [dates, setDates] = useState<string[]>([]); 
  const [isSaving, setIsSaving] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, practiceId: number | null}>({ show: false, practiceId: null });

  const [selectedHistoryPractice, setSelectedHistoryPractice] = useState<any | null>(null);
  const [historyAttendance, setHistoryAttendance] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadData = async () => {
    try {
      const { data: sedesData } = await supabase.from('sedes').select('*').order('name');
      if (sedesData) setSedes(sedesData);

      const { data: deportesData } = await supabase.from('deportes').select('*').order('name');
      if (deportesData) setDeportes(deportesData);
      
      const { data: pracData, error } = await supabase
        .from('practices')
        .select('*, categories(id, name, gender, sede_id, deporte_id, sedes(name), deportes(name))')
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      if (pracData) setExistingPractices(pracData);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Filtrado de categorías para el PLANIFICADOR (Arriba)
  useEffect(() => {
    const fetchFilteredCategories = async () => {
      if (selectedSedeId && selectedDeporteId) {
        const { data } = await supabase
          .from('categories')
          .select('*, sedes(name), deportes(name)')
          .eq('sede_id', selectedSedeId)
          .eq('deporte_id', selectedDeporteId)
          .order('name');
        setCategories(data || []);
      } else {
        setCategories([]);
      }
    };
    fetchFilteredCategories();
  }, [selectedSedeId, selectedDeporteId]);

  useEffect(() => {
    const getProfessorNames = async () => {
      if (!selectedCatId) { setAssignedProfNames([]); return; }
      const { data } = await supabase
        .from('professor_assignments')
        .select('users(name)')
        .eq('category_id', selectedCatId);
      if (data) setAssignedProfNames(data.map((d: any) => d.users?.name).filter(Boolean));
    };
    getProfessorNames();
  }, [selectedCatId]);

  const openHistory = async (p: any) => {
    setIsLoadingHistory(true);
    setSelectedHistoryPractice(p);
    try {
      const { data: attData } = await supabase
        .from('attendance')
        .select(`status, users!player_id (name), professor_id`)
        .eq('practice_id', p.id);

      let pName = "No registrado";
      if (attData && attData.length > 0 && attData[0].professor_id) {
        const { data: prof } = await supabase.from('users').select('name').eq('id', attData[0].professor_id).single();
        if (prof) pName = prof.name;
      }
      const finalData = attData?.map(item => ({ ...item, profeNombre: pName }));
      setHistoryAttendance(finalData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const savePractices = async () => {
    if (!selectedCatId || dates.length === 0) return;
    setIsSaving(true);
    const observationText = `Turno: ${startTime} - ${endTime}`;

    try {
      if (editingId) {
        const { error } = await supabase.from('practices').update({
          category_id: selectedCatId,
          scheduled_date: dates[0],
          observations: observationText
        }).eq('id', editingId);
        if (error) throw error;
        setNotification({ message: "Entrenamiento actualizado con éxito", type: 'success' });
        setEditingId(null); setSelectedCatId(''); setDates([]);
      } else {
        const practicesToInsert = dates.map(date => ({
          category_id: Number(selectedCatId),
          scheduled_date: date,
          location: 'Predio Club',
          observations: observationText
        }));
        const { error } = await supabase.from('practices').insert(practicesToInsert);
        if (error) throw error;
        setNotification({ message: `¡Planificados ${dates.length} días correctamente!`, type: 'success' });
        setDates([]);
      }
      loadData();
    } catch (err: any) {
      setNotification({ message: `Error: ${err.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.practiceId) return;
    try {
      const { error } = await supabase.from('practices').delete().eq('id', deleteModal.practiceId);
      if (error) throw error;
      setDeleteModal({ show: false, practiceId: null });
      setNotification({ message: "Entrenamiento eliminado correctamente", type: 'info' });
      loadData();
    } catch (err: any) {
      setNotification({ message: "No se pudo eliminar el registro", type: 'error' });
    }
  };

  const toggleDate = (day: number) => {
    if (editingId) return; 
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dates.includes(dateStr)) setDates(dates.filter(d => d !== dateStr));
    else setDates([...dates, dateStr].sort());
  };

  const handleEditClick = (e: React.MouseEvent, practice: any) => {
    e.stopPropagation();
    setEditingId(practice.id);
    setSelectedCatId(practice.category_id);
    const fechaLimpia = practice.scheduled_date.split('T')[0];
    setDates([fechaLimpia]);
    const [year, month] = fechaLimpia.split('-').map(Number);
    setViewDate(new Date(year, month - 1, 1));
    const times = practice.observations?.match(/\d{2}:\d{2}/g);
    if (times) { setStartTime(times[0]); setEndTime(times[1]); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null); setSelectedCatId(''); setDates([]); setStartTime('18:00'); setEndTime('19:30');
    setSelectedSedeId(''); setSelectedDeporteId('');
  };

  // LÓGICA DE FILTRADO DE LA AGENDA (ABAJO)
  const filteredPractices = [...existingPractices]
    .filter(p => {
      const matchesSede = filterSedeId === '' || p.categories?.sede_id === filterSedeId;
      const matchesDeporte = filterDeporteId === '' || p.categories?.deporte_id === filterDeporteId;
      const matchesCat = filterCatId === '' || p.category_id === filterCatId;
      const matchesMonth = filterMonth === '' || p.scheduled_date.split('-')[1] === filterMonth;
      const matchesYear = filterYear === '' || p.scheduled_date.startsWith(filterYear);
      const todayStr = new Intl.DateTimeFormat('fr-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());
      
      let matchesTime = true;
      if (timeFilter === 'future') matchesTime = p.scheduled_date >= todayStr;
      else if (timeFilter === 'past') matchesTime = p.scheduled_date < todayStr;
      
    return matchesSede && matchesDeporte && matchesCat && matchesMonth && matchesYear && matchesTime;    })
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  const formatDateSafely = (dateStr: string) => {
    const parts = dateStr.split('T')[0].split('-');
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-10 pb-20 relative">
      
      {/* MODAL HISTORIAL */}
      {selectedHistoryPractice && (
        <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black uppercase italic text-indigo-950 leading-none">
                  {formatDateSafely(selectedHistoryPractice.scheduled_date)}
                </h3>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">
                  {selectedHistoryPractice.categories?.name}
                </p>
              </div>
              <button onClick={() => setSelectedHistoryPractice(null)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
                <X size={20} className="text-slate-400"/>
              </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              {isLoadingHistory ? (
                <div className="py-20 text-center space-y-4">
                  <Loader2 className="animate-spin mx-auto text-indigo-600" size={40}/>
                  <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Cargando registros...</p>
                </div>
              ) : historyAttendance.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-6 bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <UserCheck className="text-orange-500" size={16}/>
                    <p className="text-[11px] font-black text-orange-600 uppercase">Lista tomada por: {historyAttendance[0].profeNombre}</p>
                  </div>
                  <div className="grid gap-2">
                    {historyAttendance.map((record, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="font-black text-slate-700 uppercase text-xs">{record.users?.name}</span>
                        <span className={`text-[9px] font-black px-4 py-2 rounded-xl ${record.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {record.status === 'present' ? 'PRESENTE' : 'AUSENTE'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center space-y-4 border-2 border-dashed border-slate-100 rounded-[32px]">
                  <AlertCircle className="mx-auto text-slate-200" size={48}/>
                  <p className="font-black text-slate-400 uppercase text-xs tracking-widest">No hay registros de asistencia para este entrenamiento</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICACIONES */}
      {notification && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in zoom-in slide-in-from-top-10 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-3xl shadow-2xl border ${
            notification.type === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 
            notification.type === 'info' ? 'bg-indigo-600 border-indigo-500 text-white' : 
            'bg-amber-500 border-amber-400 text-white'
          }`}>
            {notification.type === 'success' ? <Check size={20} className="animate-bounce"/> : 
             notification.type === 'info' ? <Info size={20}/> : <AlertCircle size={20}/>}
            <span className="font-black uppercase italic text-xs tracking-wider">{notification.message}</span>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-2xl max-w-lg w-full text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="bg-rose-50 p-6 rounded-full w-24 h-24 mx-auto border border-rose-100 flex items-center justify-center">
                <Trash2 size={48} className="text-rose-600 animate-pulse"/>
            </div>
            <div className="space-y-1">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atención de Seguridad</h3>
              <p className="font-bold text-slate-700 text-lg">¿Estás seguro de que deseas eliminar este entrenamiento?</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <button onClick={() => setDeleteModal({ show: false, practiceId: null })} className="w-full text-center py-4 rounded-xl text-[10px] font-black text-slate-400 uppercase border-2 border-slate-100 hover:bg-slate-50 transition-all">No, cancelar</button>
              <button onClick={confirmDelete} className="w-full text-center py-4 rounded-xl text-[10px] font-black text-white bg-rose-600 hover:bg-rose-700 shadow-lg uppercase transition-all">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 bg-white p-6 md:p-10 rounded-[40px] border border-slate-200 shadow-xl relative overflow-hidden">
        <div className="flex-1 space-y-8">
          <h2 className="text-2xl font-black text-indigo-950 flex items-center gap-3 uppercase italic"> 
            <CalendarIcon className="text-indigo-600" size={24} /> 
            {editingId ? 'Editando Práctica' : 'Planificador de Clases'}
          </h2>
          <div className="space-y-6">
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar Sede</label>
                <select value={selectedSedeId} onChange={(e) => { setSelectedSedeId(Number(e.target.value)); setSelectedCatId(''); }} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-600 transition-all">
                  <option value="">Elegir sede...</option>
                  {sedes.map(s => <option key={s.sede_id} value={s.sede_id}>{s.name}</option>)}
                </select>
              </div>

              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar Idioma</label>
                <select value={selectedDeporteId} onChange={(e) => { setSelectedDeporteId(Number(e.target.value)); setSelectedCatId(''); }} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-600 transition-all">
                  <option value="">Elegir Idioma...</option>
                  {deportes.map(d => <option key={d.deporte_id} value={d.deporte_id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar División</label>
              <select 
                value={selectedCatId} 
                onChange={(e) => setSelectedCatId(Number(e.target.value))} 
                disabled={!selectedSedeId || !selectedDeporteId}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-600 transition-all disabled:opacity-50"
              >
                <option value="">{!selectedSedeId || !selectedDeporteId ? 'Selecciona sede e idioma primero...' : 'Elegir curso...'}</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name} ({cat.gender})</option>)}
              </select>
            </div>

            {selectedCatId && (
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} className="text-indigo-600" />
                  <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">Equipo Técnico Asignado</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {assignedProfNames.length > 0 ? (
                    assignedProfNames.map((name, i) => (
                      <span key={i} className="px-3 py-1 bg-white rounded-full text-[10px] font-bold text-indigo-600 shadow-sm border border-indigo-100">
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 italic">No hay profesores asignados</span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-3 md:p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 text-sm md:text-base outline-none focus:border-indigo-600" />
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full p-3 md:p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 text-sm md:text-base outline-none focus:border-indigo-600" />
            </div>
            
            <button onClick={savePractices} disabled={isSaving || !dates.length || !selectedCatId} className="w-full py-5 rounded-2xl font-black text-white bg-orange-500 hover:bg-orange-600 shadow-lg uppercase text-xs transition-all flex items-center justify-center gap-2">
              {isSaving && <Loader2 className="animate-spin" size={16}/>}
              {isSaving ? 'Procesando...' : editingId ? 'Guardar Cambios' : `Planificar ${dates.length} Sesiones`}
            </button>
            {editingId && <button onClick={cancelEdit} className="w-full text-[10px] font-black text-slate-400 uppercase">Cancelar Edición</button>}
          </div>
        </div>

        <div className="w-full lg:w-[380px] bg-slate-50 p-6 rounded-[30px] border border-slate-100 shadow-inner">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))}><ChevronLeft/></button>
            <span className="font-black text-xs uppercase text-indigo-900">{viewDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))}><ChevronRight/></button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['D','L','M','X','J','V','S'].map(d => <div key={d} className="text-center text-[9px] font-black text-slate-300">{d}</div>)}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={i} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dates.includes(dateStr);
              return (
                <button key={day} onClick={() => toggleDate(day)} className={`h-10 w-10 rounded-xl text-[10px] font-bold border-2 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-transparent text-slate-700 hover:border-indigo-100'}`}>{day}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* AGENDA PROGRAMADA CON FILTROS MEJORADOS */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-indigo-600"/>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agenda Programada</h3>
            </div>
            
            <div className="flex flex-wrap justify-end gap-3 w-full md:w-auto">
              {/* FILTRO SEDE */}
              <select 
                value={filterSedeId} 
                onChange={(e) => { 
                  setFilterSedeId(e.target.value === '' ? '' : Number(e.target.value));
                  setFilterCatId(''); // Reset cat al cambiar sede
                }} 
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none shadow-sm text-slate-700 min-w-[120px]"
              >
                <option value="">Sede: Todas</option>
                {sedes.map(s => <option key={s.sede_id} value={s.sede_id}>{s.name}</option>)}
              </select>

              {/* FILTRO DEPORTE */}
              <select 
                value={filterDeporteId} 
                onChange={(e) => { 
                  setFilterDeporteId(e.target.value === '' ? '' : Number(e.target.value));
                  setFilterCatId(''); // Reset cat al cambiar deporte
                }} 
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none shadow-sm text-slate-700 min-w-[120px]"
              >
                <option value="">Idioma: Todos</option>
                {deportes.map(d => <option key={d.deporte_id} value={d.deporte_id}>{d.name}</option>)}
              </select>

              {/* FILTRO CATEGORÍA */}
              <select 
                value={filterCatId} 
                onChange={(e) => setFilterCatId(e.target.value === '' ? '' : Number(e.target.value))} 
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none shadow-sm text-slate-700 max-w-[200px] truncate"
              >
                <option value="">Curso: Todas</option>
                {/* Mostramos todas, pero el filter acumulativo se encarga de la lógica */}
                {[...new Set(existingPractices.map(p => JSON.stringify({id: p.categories?.id, name: p.categories?.name, sede: p.categories?.sede_id, dep: p.categories?.deporte_id})))]
                  .map(str => JSON.parse(str))
                  .filter(c => (filterSedeId === '' || c.sede === filterSedeId) && (filterDeporteId === '' || c.dep === filterDeporteId))
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                }
              </select>
          
                {/* FILTRO DE MES FIJO (ENERO - DICIEMBRE) */}
              <select 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)} 
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none shadow-sm text-slate-700 min-w-[120px]"
              >
                <option value="">Mes: Todos</option>
                <option value="01">Enero</option>
                <option value="02">Febrero</option>
                <option value="03">Marzo</option>
                <option value="04">Abril</option>
                <option value="05">Mayo</option>
                <option value="06">Junio</option>
                <option value="07">Julio</option>
                <option value="08">Agosto</option>
                <option value="09">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
              {/* FILTRO DE AÑO AUTOMÁTICO */}
              <select 
                value={filterYear} 
                onChange={(e) => setFilterYear(e.target.value)} 
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none shadow-sm text-slate-700 min-w-[100px]"
              >
                <option value="">Año: Todos</option>
                {/* Extrae los años de la BD y los ordena del más nuevo al más viejo */}
                {[...new Set(existingPractices.map(p => p.scheduled_date.substring(0, 4)))]
                  .sort((a, b) => b.localeCompare(a)) 
                  .map(yearStr => (
                    <option key={yearStr} value={yearStr}>{yearStr}</option>
                ))}
              </select>
              
              
              <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                 <button onClick={() => setTimeFilter('past')} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${timeFilter === 'past' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}>pasados</button>
                 <button onClick={() => setTimeFilter('future')} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${timeFilter === 'future' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>proximos</button>
                 <button onClick={() => setTimeFilter('all')} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${timeFilter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}>Todos</button>
              </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPractices.length > 0 ? (
            filteredPractices.map((p) => (
              <div 
                key={p.id} 
                onClick={() => openHistory(p)}
                className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden cursor-pointer"
              >
                <div className="flex flex-col gap-2 mb-4 relative z-10">
                  <div className="flex justify-between items-start w-full">
                    <span className="bg-indigo-50 text-indigo-950 text-[10px] font-black px-3 py-1 rounded-full uppercase italic border border-indigo-100">
                      {p.categories?.name}
                    </span>
                    
                    <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleEditClick(e, p); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={14}/></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteModal({ show: true, practiceId: p.id }); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-tighter border border-slate-200">
                      {p.categories?.sedes?.name || 'Sede N/A'}
                    </span>
                    <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-tighter border border-blue-100">
                      {p.categories?.deportes?.name || 'Deporte N/A'}
                    </span>
                  </div>
                </div>
                
                <h4 className="font-black text-indigo-950 text-base mb-1 uppercase tracking-tighter relative z-10">
                  {formatDateSafely(p.scheduled_date)}
                </h4>
                
                <div className="flex items-center gap-2 text-slate-700 relative z-10">
                  <Clock size={12} className="text-indigo-500" />
                  <span className="text-[11px] font-bold uppercase relative z-10">{p.observations?.replace('Turno: ', '')}</span>
                </div>
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-indigo-100 group-hover:bg-slate-50 transition-all duration-300 rounded-[24px] z-0"/>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-[32px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No se encontraron clases con estos filtros</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}