'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Loader2, Plus, Trash2, MapPin, 
  Tags, CheckCircle, XCircle, Trophy, AlertTriangle, TrendingUp, TrendingDown,
  Settings, Phone, CreditCard
} from 'lucide-react';

export default function PersonalizacionPage() {
  // 1. Agregamos 'datos' a las pestañas
  const [activeTab, setActiveTab] = useState<'sedes' | 'deportes' | 'categorias' | 'ingresos' | 'egresos' | 'datos'>('sedes');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Estados de datos
  const [sedes, setSedes] = useState<any[]>([]);
  const [deportes, setDeportes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [ingresosCats, setIngresosCats] = useState<any[]>([]);
  const [egresosCats, setEgresosCats] = useState<any[]>([]);
  const [configData, setConfigData] = useState<any[]>([]); // <-- Para los datos del club

  // Estados de formularios
  const [newSede, setNewSede] = useState({ name: '', address: '' });
  const [newDeporte, setNewDeporte] = useState({ name: '' });
  const [newCategoria, setNewCategoria] = useState({ name: '', sede_id: '', deporte_id: '' });
  const [newIngreso, setNewIngreso] = useState({ name: '' });
  const [newEgreso, setNewEgreso] = useState({ name: '' });
  
  // Estados para Datos del Club
  const [contactData, setContactData] = useState({ telefono: '', instagram: '' });
  // Buscá esta línea y reemplazala por esta:
const [newAliasCbu, setNewAliasCbu] = useState({ type: 'alias', value: '', description: '' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  
  // Estados del Modal de Borrado (agregamos 'config')
  const [deleteModal, setDeleteModal] = useState<{ type: 'sede' | 'deporte' | 'categoria' | 'ingreso' | 'egreso' | 'config', id: any } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: sedesData } = await supabase.from('sedes').select('*').order('name');
      if (sedesData) setSedes(sedesData);

      const { data: deportesData } = await supabase.from('deportes').select('*').order('name');
      if (deportesData) setDeportes(deportesData);

      const { data: catData } = await supabase
        .from('categories')
        .select(`id, name, sedes (name), deportes (name)`)
        .order('name');
      if (catData) setCategorias(catData);

      const { data: transData } = await supabase.from('transaction_categories').select('*').order('name');
      if (transData) {
        setIngresosCats(transData.filter(t => t.type === 'income'));
        setEgresosCats(transData.filter(t => t.type === 'expense'));
      }      

      // Cargar configuraciones del club
      const { data: confData } = await supabase.from('system_config').select('*');
      if (confData) {
        setConfigData(confData);
        setContactData({
          telefono: confData.find(c => c.key === 'telefono')?.value || '',
          instagram: confData.find(c => c.key === 'instagram')?.value || ''
        });
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // --- LÓGICA DE AGREGAR EXISTENTE ---
  const handleAddSede = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSede.name.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('sedes').insert([{ name: newSede.name, address: newSede.address, active: true }]);
      if (error) throw error;
      showToast('success', 'Sede creada correctamente');
      setNewSede({ name: '', address: '' });
      fetchData();
    } catch (error) {
      showToast('error', 'Error al crear la sede');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDeporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeporte.name.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('deportes').insert([{ name: newDeporte.name }]);
      if (error) throw error;
      showToast('success', 'Idioma creado correctamente');
      setNewDeporte({ name: '' });
      fetchData();
    } catch (error) {
      showToast('error', 'Error al crear el deporte');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    // 1. Ya no validamos el gender
    if (!newCategoria.name.trim() || !newCategoria.sede_id || !newCategoria.deporte_id) {
      showToast('error', 'Completá todos los campos');
      return;
    }
    setIsSubmitting(true);
    try {
      // 2. Ya no enviamos el gender a Supabase
      const { error } = await supabase.from('categories').insert([{ 
        name: newCategoria.name,
        sede_id: parseInt(newCategoria.sede_id),
        deporte_id: parseInt(newCategoria.deporte_id)
      }]);
      if (error) throw error;
      showToast('success', 'Curso creado correctamente');
      
      // 3. Limpiamos el estado sin el gender
      setNewCategoria({ name: '', sede_id: '', deporte_id: '' });
      fetchData();
    } catch (error) {
      showToast('error', 'Error al crear el curso');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTransCategoria = async (e: React.FormEvent, type: 'income' | 'expense', name: string) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('transaction_categories').insert([{ name: name.trim(), type }]);
      if (error) throw error;
      showToast('success', `Categoría de ${type === 'income' ? 'ingreso' : 'egreso'} creada`);
      if (type === 'income') setNewIngreso({ name: '' });
      else setNewEgreso({ name: '' });
      fetchData();
    } catch (error: any) {
      showToast('error', 'Error al crear. Asegurate de que el nombre no exista ya.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NUEVA LÓGICA: DATOS DEL CLUB ---
  const handleSaveContact = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmittingContact(true); // <-- Cambiar acá
  try {
    const { error } = await supabase.from('system_config').upsert([
      { key: 'telefono', value: contactData.telefono },
      { key: 'instagram', value: contactData.instagram }
    ], { onConflict: 'key' });
    
    if (error) throw error;
    showToast('success', 'Datos de contacto actualizados');
    fetchData();
  } catch (error) {
    showToast('error', 'Error al actualizar contacto');
  } finally {
    setIsSubmittingContact(false); // <-- Cambiar acá
  }
};

  const handleAddAliasCbu = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newAliasCbu.value.trim()) return;
  setIsSubmittingAccount(true);
  
  // Generar una key única para permitir múltiples alias o CBU
  const uniqueKey = `${newAliasCbu.type}_${Date.now()}`;
  
  try {
    const { error } = await supabase.from('system_config').insert([
      { 
        key: uniqueKey, 
        value: newAliasCbu.value.trim(),
        description: newAliasCbu.description.trim() // <-- Guardamos el título o alias asociado aquí
      }
    ]);
    if (error) throw error;
    showToast('success', `${newAliasCbu.type === 'alias' ? 'Alias' : 'CBU'} agregado correctamente`);
    
    // Limpiamos todo el formulario
    setNewAliasCbu({ type: newAliasCbu.type, value: '', description: '' });
    fetchData();
  } catch (error) {
    showToast('error', 'Error al agregar dato');
  } finally {
    setIsSubmittingAccount(false);
  }
};

  // --- LÓGICA DE BORRADO ---
  const confirmDelete = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);
    try {
      if (deleteModal.type === 'sede') {
        const { error } = await supabase.from('sedes').delete().eq('sede_id', deleteModal.id);
        if (error) throw error;
        showToast('success', 'Sede eliminada');
      } else if (deleteModal.type === 'deporte') {
        const { error } = await supabase.from('deportes').delete().eq('deporte_id', deleteModal.id);
        if (error) throw error;
        showToast('success', 'Idioma eliminado');
      } else if (deleteModal.type === 'categoria') {
        const { error } = await supabase.from('categories').delete().eq('id', deleteModal.id);
        if (error) throw error;
        showToast('success', 'Curso eliminado');
      } else if (deleteModal.type === 'ingreso' || deleteModal.type === 'egreso') {
        const { error } = await supabase.from('transaction_categories').delete().eq('id', deleteModal.id);
        if (error) throw error;
        showToast('success', 'Categoría eliminada');
      } else if (deleteModal.type === 'config') {
        // Borrar Alias o CBU
        const { error } = await supabase.from('system_config').delete().eq('key', deleteModal.id);
        if (error) throw error;
        showToast('success', 'Dato eliminado');
      }
      fetchData();
    } catch (error: any) {
      console.error("Error al borrar:", error);
      showToast('error', 'Error al eliminar: ' + (error.message || 'Verificá los permisos.'));
    } finally {
      setIsDeleting(false);
      setDeleteModal(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 pb-10 text-left relative w-full overflow-x-hidden">
      
      {/* CABECERA */}
      <div className="mb-8 text-left">
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase">Personalización</h2>
        <p className="text-gray-500 text-sm">Administrá los idiomas, sedes, cursos, finanzas y datos del intituto.</p>
      </div>

      {/* SELECTOR DE PESTAÑAS */}
      <div className="flex overflow-x-auto gap-4 mb-8 border-b border-gray-200 pb-1 w-full scrollbar-hide">
        <button onClick={() => setActiveTab('sedes')} className={`pb-3 px-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'sedes' ? 'border-[#4f46e5] text-[#4f46e5]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <MapPin size={18} /> Sedes
        </button>
        <button onClick={() => setActiveTab('deportes')} className={`pb-3 px-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'deportes' ? 'border-[#4f46e5] text-[#4f46e5]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <Trophy size={18} /> Idiomas
        </button>
        <button onClick={() => setActiveTab('categorias')} className={`pb-3 px-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'categorias' ? 'border-[#4f46e5] text-[#4f46e5]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <Tags size={18} /> Cursos
        </button>
        <button onClick={() => setActiveTab('ingresos')} className={`pb-3 px-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'ingresos' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <TrendingUp size={18} /> Ingresos
        </button>
        <button onClick={() => setActiveTab('egresos')} className={`pb-3 px-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'egresos' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <TrendingDown size={18} /> Egresos
        </button>
        <button onClick={() => setActiveTab('datos')} className={`pb-3 px-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'datos' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <Settings size={18} /> Datos del Instituto
        </button>
      </div>

      {/* CONTENIDO SEDES */}
      {activeTab === 'sedes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-black text-gray-800 uppercase mb-4 flex items-center gap-2">
                <Plus size={18} className="text-indigo-600"/> Nueva Sede
              </h3>
              <form onSubmit={handleAddSede} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre</label>
                  <input required type="text" value={newSede.name} onChange={e => setNewSede({...newSede, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl text-sm text-gray-900 font-medium placeholder-gray-400 outline-none focus:border-indigo-500" placeholder="Ej: Polideportivo Municipal"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Dirección</label>
                  <input type="text" value={newSede.address} onChange={e => setNewSede({...newSede, address: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl text-sm text-gray-900 font-medium placeholder-gray-400 outline-none focus:border-indigo-500" placeholder="Ej: Av. 10 y 65"/>
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full bg-[#4f46e5] text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 flex justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : 'Guardar Sede'}
                </button>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100"><h3 className="font-black text-gray-600 uppercase text-xs tracking-wider">Sedes Registradas</h3></div>
              <div className="divide-y divide-gray-100">
                {sedes.length > 0 ? sedes.map(sede => (
                  <div key={sede.sede_id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <h4 className="font-bold text-gray-900">{sede.name}</h4>
                      {sede.address && <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin size={12}/> {sede.address}</p>}
                    </div>
                    <button onClick={() => setDeleteModal({ type: 'sede', id: sede.sede_id })} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                )) : (<div className="p-8 text-center text-gray-400 font-bold text-sm">No hay sedes.</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO DEPORTES */}
      {activeTab === 'deportes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-black text-gray-800 uppercase mb-4 flex items-center gap-2"><Plus size={18} className="text-indigo-600"/> Nuevo Idioma</h3>
              <form onSubmit={handleAddDeporte} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre</label>
                  <input required type="text" value={newDeporte.name} onChange={e => setNewDeporte({...newDeporte, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl text-sm text-gray-900 font-medium placeholder-gray-400 outline-none focus:border-indigo-500" placeholder="Ej: Español"/>
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full bg-[#4f46e5] text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 flex justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : 'Guardar Idioma'}
                </button>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100"><h3 className="font-black text-gray-600 uppercase text-xs tracking-wider">Idiomas Activos</h3></div>
              <div className="divide-y divide-gray-100">
                {deportes.length > 0 ? deportes.map(dep => (
                  <div key={dep.deporte_id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <h4 className="font-bold text-gray-900">{dep.name}</h4>
                    <button onClick={() => setDeleteModal({ type: 'deporte', id: dep.deporte_id })} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                )) : (<div className="p-8 text-center text-gray-400 font-bold text-sm">No hay idiomas.</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO CATEGORÍAS */}
      {activeTab === 'categorias' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-black text-gray-800 uppercase mb-4 flex items-center gap-2"><Plus size={18} className="text-indigo-600"/> Nuevo curso</h3>
              <form onSubmit={handleAddCategoria} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre</label>
                  <input required type="text" value={newCategoria.name} onChange={e => setNewCategoria({...newCategoria, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl text-sm text-gray-900 font-medium placeholder-gray-400 outline-none focus:border-indigo-500" placeholder="Ej: Kids 1"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Idioma</label>
                  <select required value={newCategoria.deporte_id} onChange={e => setNewCategoria({...newCategoria, deporte_id: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl text-sm text-gray-900 font-medium outline-none bg-white">
                    <option value="">Seleccionar Idioma...</option>
                    {deportes.map(d => <option key={d.deporte_id} value={d.deporte_id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sede</label>
                  <select required value={newCategoria.sede_id} onChange={e => setNewCategoria({...newCategoria, sede_id: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl text-sm text-gray-900 font-medium outline-none bg-white">
                    <option value="">Seleccionar Sede...</option>
                    {sedes.map(s => <option key={s.sede_id} value={s.sede_id}>{s.name}</option>)}
                  </select>
                </div>
                <button disabled={isSubmitting || deportes.length === 0 || sedes.length === 0} type="submit" className="w-full bg-[#4f46e5] text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:bg-gray-400 flex justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : 'Crear Curso'}
                </button>
              </form>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between"><h3 className="font-black text-gray-600 uppercase text-xs tracking-wider">Cursos activos</h3></div>
              <div className="divide-y divide-gray-100">
                {categorias.length > 0 ? categorias.map(cat => (
                  <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900">{cat.name}</h4>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs font-medium text-gray-500">
                        <span className="flex items-center gap-1"><Trophy size={12}/> {cat.deportes?.name || 'S/D'}</span>
                        <span className="flex items-center gap-1"><MapPin size={12}/> {cat.sedes?.name || 'S/D'}</span>
                      </div>
                    </div>
                    <button onClick={() => setDeleteModal({ type: 'categoria', id: cat.id })} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                )) : (<div className="p-8 text-center text-gray-400 font-bold text-sm">No hay cursos.</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO INGRESOS */}
      {activeTab === 'ingresos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-6">
              <h3 className="font-black text-emerald-800 uppercase mb-4 flex items-center gap-2"><Plus size={18} className="text-emerald-600"/> Nuevo Ingreso</h3>
              <form onSubmit={(e) => handleAddTransCategoria(e, 'income', newIngreso.name)} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Nombre Categoría</label>
                  <input required type="text" value={newIngreso.name} onChange={e => setNewIngreso({...newIngreso, name: e.target.value})} className="w-full p-3 border border-emerald-100 rounded-xl text-sm text-gray-900 font-medium placeholder-gray-400 outline-none focus:border-emerald-500 bg-emerald-50/30" placeholder="Ej: Eventos, Sponsor..."/>
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 flex justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : 'Guardar Ingreso'}
                </button>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-emerald-50 border-b border-emerald-100"><h3 className="font-black text-emerald-700 uppercase text-xs tracking-wider">Categorías de Ingreso Activas</h3></div>
              <div className="divide-y divide-gray-100">
                {ingresosCats.length > 0 ? ingresosCats.map(inc => (
                  <div key={inc.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <h4 className="font-bold text-gray-900">{inc.name}</h4>
                    <button onClick={() => setDeleteModal({ type: 'ingreso', id: inc.id })} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                )) : (<div className="p-8 text-center text-gray-400 font-bold text-sm">No hay categorías de ingreso.</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO EGRESOS */}
      {activeTab === 'egresos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
              <h3 className="font-black text-red-800 uppercase mb-4 flex items-center gap-2"><Plus size={18} className="text-red-600"/> Nuevo Egreso</h3>
              <form onSubmit={(e) => handleAddTransCategoria(e, 'expense', newEgreso.name)} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Nombre Categoría</label>
                  <input required type="text" value={newEgreso.name} onChange={e => setNewEgreso({...newEgreso, name: e.target.value})} className="w-full p-3 border border-red-100 rounded-xl text-sm text-gray-900 font-medium placeholder-gray-400 outline-none focus:border-red-500 bg-red-50/30" placeholder="Ej: Sueldos, Alquiler..."/>
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full bg-red-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-red-700 flex justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : 'Guardar Egreso'}
                </button>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-red-50 border-b border-red-100"><h3 className="font-black text-red-700 uppercase text-xs tracking-wider">Categorías de Egreso Activas</h3></div>
              <div className="divide-y divide-gray-100">
                {egresosCats.length > 0 ? egresosCats.map(exp => (
                  <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <h4 className="font-bold text-gray-900">{exp.name}</h4>
                    <button onClick={() => setDeleteModal({ type: 'egreso', id: exp.id })} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                )) : (<div className="p-8 text-center text-gray-400 font-bold text-sm">No hay categorías de egreso.</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NUEVO CONTENIDO: DATOS DEL CLUB */}
      {activeTab === 'datos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Columna Izquierda: Teléfono e Instagram */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-purple-200 p-6">
              <h3 className="font-black text-purple-800 uppercase mb-4 flex items-center gap-2">
                <Phone size={18} className="text-purple-600"/> Contacto del Instituto
              </h3>
              <form onSubmit={handleSaveContact} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-purple-600 uppercase mb-1">Teléfono (WhatsApp)</label>
                  <input type="text" value={contactData.telefono} onChange={e => setContactData({...contactData, telefono: e.target.value})} className="w-full p-3 border border-purple-100 rounded-xl text-sm text-gray-900 font-medium placeholder-gray-400 outline-none focus:border-purple-500 bg-purple-50/30" placeholder="Ej: 2262123456"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-purple-600 uppercase mb-1">Enlace de Instagram</label>
                  <input type="url" value={contactData.instagram} onChange={e => setContactData({...contactData, instagram: e.target.value})} className="w-full p-3 border border-purple-100 rounded-xl text-sm text-gray-900 font-medium placeholder-gray-400 outline-none focus:border-purple-500 bg-purple-50/30" placeholder="https://instagram.com/tuclub"/>
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-purple-700 flex justify-center gap-2 transition">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : 'Actualizar Datos'}
                </button>
              </form>
            </div>
            
            {/* Formulario Agregar Alias / CBU */}
            <div className="bg-white rounded-2xl shadow-sm border border-purple-200 p-6">
              <h3 className="font-black text-purple-800 uppercase mb-4 flex items-center gap-2">
                <Plus size={18} className="text-purple-600"/> Agregar Cuenta
              </h3>
              <form onSubmit={handleAddAliasCbu} className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <label className="block text-[10px] font-bold text-purple-600 uppercase mb-1">Tipo</label>
                    <select 
                      value={newAliasCbu.type} 
                      onChange={e => setNewAliasCbu({...newAliasCbu, type: e.target.value, description: ''})} 
                      className="w-full p-3 border border-purple-100 rounded-xl text-sm text-gray-900 font-medium outline-none bg-white focus:border-purple-500"
                    >
                      <option value="alias">Alias</option>
                      <option value="cbu">CBU / CVU</option>
                    </select>
                  </div>
                  <div className="w-2/3">
                    <label className="block text-[10px] font-bold text-purple-600 uppercase mb-1">
                      {newAliasCbu.type === 'alias' ? 'Alias' : 'Número de CBU / CVU'}
                    </label>
                    <input 
                      required 
                      type="text" 
                      value={newAliasCbu.value} 
                      onChange={e => setNewAliasCbu({...newAliasCbu, value: e.target.value})} 
                      className="w-full p-3 border border-purple-100 rounded-xl text-sm text-gray-900 font-medium placeholder-gray-400 outline-none focus:border-purple-500 bg-purple-50/30" 
                      placeholder={newAliasCbu.type === 'alias' ? "Ej: club.necochea.mp" : "Ej: 0000003100012345678901"}
                    />
                  </div>
                </div>

                {/* 👇 NUEVO CAMPO DE DESCRIPCIÓN DINÁMICA 👇 */}
                <div>
                  <label className="block text-[10px] font-bold text-purple-600 uppercase mb-1">
                    {newAliasCbu.type === 'alias' ? 'Título / Destino de este Alias' : '¿A qué Alias o Cuenta corresponde este CBU?'}
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={newAliasCbu.description} 
                    onChange={e => setNewAliasCbu({...newAliasCbu, description: e.target.value})} 
                    className="w-full p-3 border border-purple-100 rounded-xl text-sm text-gray-900 font-medium placeholder-gray-400 outline-none focus:border-purple-500 bg-purple-50/30" 
                    placeholder={newAliasCbu.type === 'alias' ? "Ej: Alias para pagos de cuotas" : "Ej: Corresponde al alias club.necochea.mp"}
                  />
                </div>

                <button disabled={isSubmittingAccount} type="submit" className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-purple-700 flex justify-center gap-2 transition">
                  {isSubmittingAccount ? <Loader2 className="animate-spin" size={18}/> : 'Agregar Cuenta'}
                </button>
              </form>
            </div>
          </div>

          {/* Columna Derecha: Lista de Alias / CBU */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
              <div className="p-4 bg-purple-50 border-b border-purple-100"><h3 className="font-black text-purple-700 uppercase text-xs tracking-wider">Cuentas Registradas (CBU/Alias)</h3></div>
              <div className="divide-y divide-gray-100 flex-1 overflow-y-auto">
                {configData.filter(c => c.key.startsWith('alias') || c.key.startsWith('cbu')).length > 0 ? 
                  configData.filter(c => c.key.startsWith('alias') || c.key.startsWith('cbu')).map(config => {
                    const isAlias = config.key.includes('alias');
                    return (
                    <div key={config.key} className="p-4 flex items-center justify-between hover:bg-gray-50 gap-2">
                      
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg shrink-0 ${isAlias ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                          <CreditCard size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">{isAlias ? 'Alias' : 'CBU / CVU'}</p>
                          <h4 className="font-bold text-gray-900 text-sm leading-none truncate">{config.value}</h4>
                          
                          {/* DESCRIPCIÓN DINÁMICA */}
                          {config.description && (
                            <p className="text-[11px] text-purple-600 font-semibold italic mt-1 truncate">
                              {isAlias ? config.description : `Asociado a: ${config.description}`}
                            </p>
                          )}
                        </div>
                      </div>

                      <button onClick={() => setDeleteModal({ type: 'config', id: config.key })} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg shrink-0">
                        <Trash2 size={18} />
                      </button>
                      
                    </div>
                  )}) : (
                  <div className="p-8 text-center text-gray-400 font-bold text-sm">No hay alias ni CBUs registrados.</div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      {deleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">¿Estás seguro?</h3>
              <p className="text-sm text-gray-500 px-4">
                {deleteModal.type === 'sede' && 'Estás por eliminar esta sede. Los cursos asignadas a este lugar podrían verse afectadas.'}
                {deleteModal.type === 'deporte' && 'Estás por eliminar este idioma. Asegurate de que no haya cursos utilizándolo.'}
                {deleteModal.type === 'categoria' && 'Estás por eliminar este curso. Asegurate de que no haya estudiantes ni clases vinculadas.'}
                {deleteModal.type === 'ingreso' && 'Estás por eliminar esta categoría de ingreso. Podría afectar a los registros financieros.'}
                {deleteModal.type === 'egreso' && 'Estás por eliminar esta categoría de egreso. Podría afectar a los registros financieros.'}
                {deleteModal.type === 'config' && 'Estás por eliminar este dato del Instituto. Ya no será visible para los usuarios.'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => setDeleteModal(null)} 
                disabled={isDeleting}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={18}/> : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS DE ALERTA */}
      {message && (
        <div className={`fixed bottom-8 right-8 z-[60] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 border-l-8 ${message.type === 'success' ? 'bg-white border-green-500' : 'bg-white border-red-500'}`}>
          <div className={`${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{message.type === 'success' ? <CheckCircle size={28}/> : <XCircle size={28}/>}</div>
          <div>
            <h4 className={`font-bold uppercase text-[10px] tracking-wider ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.type === 'success' ? '¡Éxito!' : 'Atención'}</h4>
            <p className="font-semibold text-gray-700 text-xs">{message.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}