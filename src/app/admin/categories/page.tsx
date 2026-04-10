'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Search, Filter, Save, Loader2, CheckCircle2, Calendar } from 'lucide-react';

export default function AsignacionCategorias() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const [userCategories, setUserCategories] = useState<any[]>([]);
  const [deportes, setDeportes] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);

  const [searchName, setSearchName] = useState('');
  const [selectedDeporteFilter, setSelectedDeporteFilter] = useState('todos');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState('todos');
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rDeps, rSedes, rCats, rUsers, rUserCats] = await Promise.all([
        supabase.from('deportes').select('*'),
        supabase.from('sedes').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('users').select('id, name, email, gender, birth_date'),
        supabase.from('user_categories').select('*')
      ]);

      setDeportes(rDeps.data || []);
      setSedes(rSedes.data || []);
      setCategorias(rCats.data || []);

      const initialRows = (rUserCats.data || []).map(rel => {
        const user = rUsers.data?.find(u => u.id === rel.user_id);
        const currentCat = rCats.data?.find(c => Number(c.id) === Number(rel.category_id));
        
        return {
          ...rel,
          user_name: user?.name || 'Socio Desconocido',
          user_email: user?.email || 'Sin Email',
          user_gender: user?.gender || '',
          user_birth: user?.birth_date || null,
          temp_sede_id: currentCat ? String(currentCat.sede_id) : '',
          temp_category_id: rel.category_id ? String(rel.category_id) : ''
        };
      });

      setUserCategories(initialRows);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRowChange = (id: string, field: string, value: string) => {
    setUserCategories(prev => prev.map(row => {
      if (row.id === id) {
        const newRow = { ...row, [field]: value };
        if (field === 'temp_sede_id') newRow.temp_category_id = '';
        return newRow;
      }
      return row;
    }));
  };

  const handleSave = async (row: any) => {
    if (!row.temp_category_id) return;
    setIsSaving(row.id);
    try {
      const { error } = await supabase
        .from('user_categories')
        .update({ category_id: Number(row.temp_category_id) })
        .eq('id', row.id);

      if (error) throw error;
      
      setUserCategories(prev => prev.map(r => r.id === row.id ? { ...r, category_id: row.temp_category_id } : r));
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

    } catch (error: any) {
      console.error("Error:", error.message);
    } finally {
      setIsSaving(null);
    }
  };

  const filteredRows = userCategories.filter(row => {
    const matchDeporte = selectedDeporteFilter === 'todos' || String(row.deporte_id) === selectedDeporteFilter;
    const matchName = row.user_name.toLowerCase().includes(searchName.toLowerCase());
    
    let matchEstado = true;
    if (selectedEstadoFilter === 'asignados') {
      matchEstado = !!row.category_id; // Tiene categoría (Verde)
    } else if (selectedEstadoFilter === 'no_asignados') {
      matchEstado = !row.category_id;  // NO tiene categoría (Rojo)
    }

    return matchDeporte && matchName && matchEstado;
  });

  if (loading) return <div className="p-10 text-center font-bold text-gray-950">Cargando socios...</div>;

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-4 md:p-6 font-sans relative">
      
      {showToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-5 z-[100] flex items-center gap-3 bg-gray-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 border border-white/10">
          <CheckCircle2 className="text-emerald-400" size={20} />
          <span className="text-sm font-bold tracking-tight">¡Asignación guardada con éxito!</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-6 px-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Socios</h1>
          <p className="mt-2 text-gray-500">Gestión de categorías del club.</p>
        </div>

        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre..." 
              className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm text-left"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto px-2">
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest hidden sm:block">Filtros</span>
            
            <select 
              className="w-full sm:w-auto border border-indigo-200 rounded-full px-4 py-2.5 text-sm font-bold text-indigo-700 bg-indigo-50 outline-none cursor-pointer"
              value={selectedDeporteFilter}
              onChange={(e) => setSelectedDeporteFilter(e.target.value)}
            >
              <option value="todos">Todos los Deportes</option>
              {deportes.map(d => <option key={d.deporte_id} value={d.deporte_id}>{d.name}</option>)}
            </select>

            {/* 3. ESTE ES EL NUEVO SELECTOR DE ESTADO */}
            <select 
              className="w-full sm:w-auto border border-indigo-200 rounded-full px-4 py-2.5 text-sm font-bold text-indigo-700 bg-indigo-50 outline-none cursor-pointer"
              value={selectedEstadoFilter}
              onChange={(e) => setSelectedEstadoFilter(e.target.value)}
            >
              <option value="todos">Todos los Estados</option>
              <option value="asignados">Solo Asignados</option>
              <option value="no_asignados">Falta Asignar (Rojos)</option>
            </select>
          </div>
        </div>

        {/* VISTA MÓVIL (CARDS) */}
        <div className="flex flex-col gap-4 md:hidden">
          {filteredRows.map((row) => {
            const hasCategory = !!row.category_id;
            const deporteNombre = deportes.find(d => String(d.deporte_id) === String(row.deporte_id))?.name || '-';
            const catsDisponibles = categorias.filter(c => 
              String(c.deporte_id) === String(row.deporte_id) && 
              String(c.sede_id) === String(row.temp_sede_id) &&
              c.gender === row.user_gender
            );

            return (
              <div 
                key={row.id} 
                className={`rounded-2xl p-4 shadow-sm border border-gray-200 ${hasCategory ? 'bg-emerald-100' : 'bg-red-100'} transition-colors`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                    {row.user_name.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-gray-900 truncate uppercase">{row.user_name}</span>
                    <span className="text-[10px] text-gray-500 uppercase truncate">{row.user_email}</span>
                    {/* Información secundaria: Nacimiento y Deporte */}
                    <div className="flex flex-col mt-0.5">
                       <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">
                          {row.user_birth || 'Sin fecha'}
                       </span>
                       <span className="text-[10px] font-bold text-indigo-700 uppercase">
                          {deporteNombre}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase ml-2">Sede</label>
                    <select 
                      className="w-full bg-white border border-gray-300 rounded-full text-xs text-gray-900 font-bold py-2 px-3 outline-none"
                      value={row.temp_sede_id}
                      onChange={(e) => handleRowChange(row.id, 'temp_sede_id', e.target.value)}
                    >
                      <option value="">Sede...</option>
                      {sedes.map(s => <option key={s.sede_id} value={s.sede_id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase ml-2">Categoría</label>
                    <select 
                      className="w-full bg-white border border-gray-300 rounded-full text-xs text-gray-900 font-bold py-2 px-3 outline-none disabled:opacity-50"
                      value={row.temp_category_id}
                      onChange={(e) => handleRowChange(row.id, 'temp_category_id', e.target.value)}
                      disabled={!row.temp_sede_id}
                    >
                      <option value="">Categoría...</option>
                      {catsDisponibles.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.gender})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  onClick={() => handleSave(row)}
                  disabled={isSaving === row.id || !row.temp_category_id}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black shadow-md active:scale-95 disabled:opacity-30 uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {isSaving === row.id ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14}/> GUARDAR</>}
                </button>
              </div>
            );
          })}
        </div>

        {/* VISTA ESCRITORIO (TABLA) */}
        <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-5">Socio</th>
                <th className="px-4 py-5">Nacimiento</th>
                <th className="px-4 py-5">Deporte</th>
                <th className="px-4 py-5">Sede</th>
                <th className="px-4 py-5">Categoría</th>
                <th className="px-6 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => {
                const hasCategory = !!row.category_id;
                const deporteNombre = deportes.find(d => String(d.deporte_id) === String(row.deporte_id))?.name || '-';
                const catsDisponibles = categorias.filter(c => 
                  String(c.deporte_id) === String(row.deporte_id) && 
                  String(c.sede_id) === String(row.temp_sede_id) &&
                  c.gender === row.user_gender
                );

                return (
                  <tr 
                    key={row.id} 
                    className={`${hasCategory ? 'bg-emerald-100' : 'bg-red-100'} hover:opacity-90 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                          {row.user_name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 uppercase">{row.user_name}</span>
                          <span className="text-[10px] text-gray-500 uppercase tracking-tight">{row.user_email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[11px] font-bold text-gray-600 bg-white/30 px-2 py-1 rounded">
                        {row.user_birth || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[11px] font-black text-gray-700 bg-white/50 px-2.5 py-1 rounded-lg uppercase">
                        {deporteNombre}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <select 
                        className="w-full bg-white border border-gray-300 rounded-full text-sm text-gray-900 font-bold py-2 px-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm"
                        value={row.temp_sede_id}
                        onChange={(e) => handleRowChange(row.id, 'temp_sede_id', e.target.value)}
                      >
                        <option value="" className="text-gray-400">Seleccionar Sede</option>
                        {sedes.map(s => <option key={s.sede_id} value={s.sede_id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <select 
                        className="w-full bg-white border border-gray-300 rounded-full text-sm text-gray-900 font-bold py-2 px-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                        value={row.temp_category_id}
                        onChange={(e) => handleRowChange(row.id, 'temp_category_id', e.target.value)}
                        disabled={!row.temp_sede_id}
                      >
                        <option value="" className="text-gray-400">-- Seleccionar --</option>
                        {catsDisponibles.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.gender})</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleSave(row)}
                        disabled={isSaving === row.id || !row.temp_category_id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-30 uppercase tracking-wider"
                      >
                        {isSaving === row.id ? <Loader2 size={14} className="animate-spin" /> : "GUARDAR"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}