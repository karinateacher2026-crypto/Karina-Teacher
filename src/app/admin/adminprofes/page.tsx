'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CLIENT_CONFIG } from '@/conf/clientConfig';
import { Download } from 'lucide-react';
import { UserCheck, Users, Save, Loader2, Search, CheckCircle2, XCircle, MapPin, Trophy } from 'lucide-react';

export default function AdminProfesPage() {
  const [professors, setProfessors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  // NUEVOS ESTADOS PARA FILTROS Y DATOS
  const [sedes, setSedes] = useState<any[]>([]);
  const [deportes, setDeportes] = useState<any[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<number | ''>('');
  const [selectedDeporteId, setSelectedDeporteId] = useState<number | ''>('');

  const [selectedProfe, setSelectedProfe] = useState<any>(null);
  const [profeCategories, setProfeCategories] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [notification, setNotification] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  });

  // CARGA INICIAL: PROFESORES, SEDES Y DEPORTES
  useEffect(() => {
    const loadInitialData = async () => {
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .filter('role', 'cs', '{"teacher"}');
      
      const { data: sedesData } = await supabase.from('sedes').select('*').order('name');
      const { data: deportesData } = await supabase.from('deportes').select('*').order('name');
      
      setProfessors(users || []);
      setSedes(sedesData || []);
      setDeportes(deportesData || []);
    };
    loadInitialData();
  }, []);

  // FILTRADO DINÁMICO DE CATEGORÍAS SEGÚN SEDE Y DEPORTE
  useEffect(() => {
    const fetchFilteredCategories = async () => {
      if (selectedSedeId && selectedDeporteId) {
        const { data } = await supabase
          .from('categories')
          .select('*')
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

  const selectProfessor = async (profe: any) => {
    setSelectedProfe(profe);
    const { data } = await supabase
      .from('professor_assignments')
      .select('category_id')
      .eq('professor_id', profe.id);
    setProfeCategories(data?.map(d => d.category_id) || []);
  };

  const toggleCategory = (catId: number) => {
    setProfeCategories(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  const saveAssignments = async () => {
    if (!selectedProfe) return;
    setIsSaving(true);
    try {
      // Nota: Esta lógica borra todas las asignaciones del profe. 
      // Si solo quieres borrar las de esta sede/deporte, habría que ajustar el delete.
      await supabase.from('professor_assignments').delete().eq('professor_id', selectedProfe.id);
      
      if (profeCategories.length > 0) {
        const toInsert = profeCategories.map(catId => ({
          professor_id: selectedProfe.id,
          category_id: catId
        }));
        await supabase.from('professor_assignments').insert(toInsert);
      }
      showToast(`Asignaciones actualizadas para ${selectedProfe.name}`, 'success');
    } catch (error) {
      showToast("Error al procesar la solicitud", 'error');
    } finally {
      setIsSaving(false);
    }
  };
// --- FUNCIÓN PARA EXPORTAR A EXCEL ---
  const handleExportExcel = () => {
    const headers = ['Nombre', 'Teléfono', 'CUIL', 'Email'];

    const csvData = professors.map((p) => [
      p.name || 'Sin nombre',
      p.phone || '-', 
      p.cuil || '-',
      p.email || 'Sin email'
    ]);

    const csvContent = [
      headers.join(';'),
      ...csvData.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Staff_Tecnico.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  return (
    <div className="p-4 md:p-8 space-y-8 relative">
      {notification.show && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in fade-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={20}/> : <XCircle className="text-red-500" size={20}/>}
          <p className="font-black uppercase text-[10px] tracking-wider">{notification.message}</p>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-indigo-950 uppercase italic tracking-tighter">
            Gestión de Staff Técnico
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Asignación de categorías por profesor</p>
        </div>
        
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-[15px] font-bold rounded-md shadow-sm transition-all active:scale-95 shrink-0"
        >
          <Download size={18} strokeWidth={2.5} />
          Exportar Excel
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LISTADO DE PROFESORES */}
        <div className="bg-white rounded-[35px] border border-slate-200 shadow-xl p-6 h-fit">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input 
              type="text" 
              placeholder="Buscar profesor..." 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-sm transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {professors.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(profe => (
              <button
                key={profe.id}
                onClick={() => selectProfessor(profe)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border-2 text-left ${selectedProfe?.id === profe.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-700 hover:border-indigo-200'}`}
              >
                <div className={`p-2 rounded-xl ${selectedProfe?.id === profe.id ? 'bg-indigo-500' : 'bg-white text-indigo-600 shadow-sm'}`}><UserCheck size={18}/></div>
                <div>
                  <p className="font-black uppercase text-[11px] tracking-tight">{profe.name}</p>
                  <p className={`text-[9px] font-bold ${selectedProfe?.id === profe.id ? 'text-indigo-200' : 'text-slate-400'}`}>{profe.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* PANEL DE ASIGNACIÓN */}
        <div className="lg:col-span-2">
          {selectedProfe ? (
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl p-8 flex flex-col min-h-[500px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[2px]">Editando accesos de:</p>
                  <h3 className="text-3xl font-black text-indigo-950 uppercase italic leading-none">{selectedProfe.name}</h3>
                </div>
                <button 
                  onClick={saveAssignments}
                  disabled={isSaving}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                  Guardar Cambios
                </button>
              </div>

              {/* FILTROS DE SEDE Y DEPORTE (NUEVOS) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={12}/> Filtrar por Sede
                  </label>
                  <select 
                    value={selectedSedeId} 
                    onChange={(e) => setSelectedSedeId(Number(e.target.value))} 
                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="">Seleccionar Sede...</option>
                    {sedes.map(s => <option key={s.sede_id} value={s.sede_id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Trophy size={12}/> Filtrar por Deporte
                  </label>
                  <select 
                    value={selectedDeporteId} 
                    onChange={(e) => setSelectedDeporteId(Number(e.target.value))} 
                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="">Seleccionar Deporte...</option>
                    {deportes.map(d => <option key={d.deporte_id} value={d.deporte_id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto">
                {categories.length > 0 ? (
                  categories.map(cat => {
                    const isSelected = profeCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`p-5 rounded-3xl border-2 transition-all flex justify-between items-center group ${isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-indigo-100'}`}
                      >
                        <div className="text-left">
                          <p className={`font-black uppercase text-sm ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>{cat.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{cat.gender}</p>
                        </div>
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'border-slate-200 bg-white'}`}>
                          {isSelected && <CheckCircle2 size={16} />}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-2 py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      {!selectedSedeId || !selectedDeporteId ? 'Seleccioná sede y deporte para ver categorías' : 'No hay categorías en esta selección'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200 h-full flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <Users size={60} strokeWidth={1} className="mb-4 opacity-20"/>
              <p className="font-black uppercase tracking-widest text-xs">Seleccioná un profesional para gestionar sus categorías</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}