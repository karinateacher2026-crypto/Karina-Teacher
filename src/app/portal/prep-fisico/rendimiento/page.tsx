'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient'; 
import { Activity, Search, X, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function PrepFisicoPage() {
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState('velocidad');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHistoryTerm, setSearchHistoryTerm] = useState('');
  const [historySelectedPlayer, setHistorySelectedPlayer] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  
  const [filterSex, setFilterSex] = useState('todos');
  const [filterTest, setFilterTest] = useState('todos');

  const [formData, setFormData] = useState({
    test_date: new Date().toISOString().split('T')[0],
    attempt_1: '',
    attempt_2: '',
    attempt_3: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    // Traemos solo lo necesario de la tabla users
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, cuil, gender')
      .order('name');
    
    if (usersData) setPlayers(usersData);
    fetchGeneralHistory();
  };

  const fetchGeneralHistory = async () => {
    // Relación limpia con la tabla users para obtener nombre y sexo
    const { data: evals } = await supabase
      .from('physical_evaluations')
      .select(`*, users ( name, gender )`)
      .order('created_at', { ascending: false });
    
    if (evals) setHistory(evals);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) return;

    const a1 = parseFloat(formData.attempt_1) || 0;
    const a2 = testType === 'resistencia' ? null : (parseFloat(formData.attempt_2) || null);
    const a3 = testType === 'resistencia' ? null : (parseFloat(formData.attempt_3) || null);

    if (a1 < 0 || (a2 !== null && a2 < 0) || (a3 !== null && a3 < 0)) {
      return Swal.fire({ 
        title: 'Valor inválido', 
        text: 'Los intentos no pueden ser números negativos.', 
        icon: 'error', 
        confirmButtonColor: '#1e1b4b' 
      });
    }

    setLoading(true);

    // Guardamos sin el campo 'category'
    const { error } = await supabase.from('physical_evaluations').insert([{
      user_id: selectedPlayer.id,
      test_date: formData.test_date,
      test_type: testType,
      attempt_1: a1,
      attempt_2: a2,
      attempt_3: a3
    }]);

    if (error) {
      Swal.fire({ title: 'Error', text: error.message, icon: 'error', confirmButtonColor: '#1e1b4b' });
    } else {
      Swal.fire({ title: '¡Guardado!', icon: 'success', confirmButtonColor: '#1e1b4b', timer: 1500, showConfirmButton: false });
      setFormData({ ...formData, attempt_1: '', attempt_2: '', attempt_3: '' });
      setSelectedPlayer(null);
      setSearchTerm('');
      fetchGeneralHistory();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    Swal.fire({
      title: '¿Eliminar registro?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#1e1b4b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { error } = await supabase.from('physical_evaluations').delete().eq('id', id);
        if (!error) fetchGeneralHistory();
      }
    });
  };

  const getBestScore = (h: any) => {
    const attempts = [h.attempt_1, h.attempt_2, h.attempt_3].filter(a => a !== null && a !== 0);
    if (attempts.length === 0) return 0;
    return h.test_type === 'velocidad' ? Math.min(...attempts) : Math.max(...attempts);
  };

  const filteredHistory = history.filter(h => {
    const rawGender = (h.users?.gender || '').toLowerCase();
    const filterValue = filterSex.toLowerCase();
    
    // Lógica de filtrado por sexo simplificada
    const isMale = rawGender === 'male' || rawGender === 'm' || rawGender === 'masculino';
    const isFemale = rawGender === 'female' || rawGender === 'f' || rawGender === 'femenino';
    
    const matchSex = filterValue === 'todos' || 
                    (filterValue === 'masculino' && isMale) || 
                    (filterValue === 'femenino' && isFemale);
    
    const matchTest = filterTest === 'todos' || h.test_type === filterTest;
    
    const matchSearch = historySelectedPlayer 
      ? h.user_id === historySelectedPlayer.id 
      : h.users?.name?.toLowerCase().includes(searchHistoryTerm.toLowerCase());
      
    return matchSex && matchTest && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] p-0 font-sans text-slate-700 text-left">
      <div className="max-w-[1600px] mx-auto pt-4 px-4">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e1b4b] tracking-tight">Rendimientos</h1>
          <p className="text-slate-400 text-sm mt-1">Control y seguimiento del desempeño físico de los socios.</p>
        </div>

        <div className="flex flex-col xl:flex-row gap-8 items-start">
          {/* CARGA FÍSICA */}
          <div className="w-full xl:w-[450px] shrink-0">
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 p-8 space-y-8 relative overflow-visible">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <div className="bg-orange-500 p-2 rounded-lg shadow-md"><Activity className="text-white" size={20} /></div>
                <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight italic">Carga Física</h1>
              </div>

              <div className="relative">
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Socio / Jugador</label>
                <div className={`relative flex items-center border-2 rounded-xl transition-all ${selectedPlayer ? 'border-green-500 bg-green-50/30' : 'border-slate-100 focus-within:border-indigo-500'}`}>
                  <Search className={`ml-4 ${selectedPlayer ? 'text-green-500' : 'text-slate-400'}`} size={18} />
                  <input 
                    type="text" 
                    placeholder={selectedPlayer ? "" : "Escribir nombre..."}
                    className="w-full pl-3 pr-12 py-4 bg-transparent outline-none font-bold text-slate-700 text-base"
                    value={selectedPlayer ? selectedPlayer.name : searchTerm}
                    readOnly={!!selectedPlayer}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {(searchTerm || selectedPlayer) && (
                    <button onClick={() => {setSearchTerm(''); setSelectedPlayer(null);}} className="absolute right-4 text-slate-300 hover:text-slate-500">
                      <X size={18} />
                    </button>
                  )}
                </div>
                {searchTerm && !selectedPlayer && (
                  <div className="absolute z-[999] w-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl max-h-60 overflow-y-auto">
                    {players.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.cuil?.includes(searchTerm)).map(p => (
                      <button key={p.id} type="button" className="w-full text-left px-6 py-4 hover:bg-indigo-600 group border-b border-slate-50 last:border-0 flex flex-col"
                        onClick={() => { setSelectedPlayer(p); setSearchTerm(''); }}>
                        <span className="font-bold text-slate-800 group-hover:text-white text-sm">{p.name}</span>
                        <span className="text-[10px] text-slate-400 group-hover:text-indigo-100 font-bold italic uppercase tracking-tighter">CUIL: {p.cuil} | {p.gender}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                <button onClick={() => setTestType('velocidad')} className={`py-2.5 rounded-lg text-[10px] font-bold uppercase transition-all shadow-sm ${testType === 'velocidad' ? 'bg-green-600 text-white' : 'bg-white text-slate-400'}`}>Velocidad</button>
                <button onClick={() => setTestType('salto')} className={`py-2.5 rounded-lg text-[10px] font-bold uppercase transition-all shadow-sm ${testType === 'salto' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>Salto</button>
                <button onClick={() => setTestType('resistencia')} className={`py-2.5 rounded-lg text-[10px] font-bold uppercase transition-all shadow-sm ${testType === 'resistencia' ? 'bg-purple-600 text-white' : 'bg-white text-slate-400'}`}>Resistencia</button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase mb-2 block tracking-widest italic">Fecha de Evaluación</label>
                  <input type="date" className="w-full p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-600 bg-white"
                    value={formData.test_date} onChange={(e) => setFormData({...formData, test_date: e.target.value})} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {testType === 'resistencia' ? (
                    <div className="col-span-3">
                      <label className="text-[10px] font-bold text-slate-300 uppercase mb-2 block text-center italic leading-tight">Nivel Alcanzado</label>
                      <input 
                        type="number" step="1" min="0" placeholder="Ej: 16"
                        className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-center font-bold text-xl text-slate-800 outline-none focus:border-orange-500"
                        value={formData.attempt_1} 
                        onChange={(e) => setFormData({...formData, attempt_1: e.target.value})} 
                      />
                    </div>
                  ) : (
                    [1, 2, 3].map((n) => (
                      <div key={n}>
                        <label className="text-[10px] font-bold text-slate-300 uppercase mb-2 block text-center italic leading-tight h-8 flex items-end justify-center text-center">
                          {testType === 'salto' ? (n === 1 ? 'SJ' : n === 2 ? 'CMJ' : 'ABALAKOV') : `Int. ${n}`}
                        </label>
                        <input 
                          type="number" step="0.01" min="0"
                          className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-center font-bold text-xl text-slate-800 outline-none focus:border-orange-500"
                          value={formData[`attempt_${n}` as keyof typeof formData]} 
                          onChange={(e) => setFormData({...formData, [`attempt_${n}`]: e.target.value})} 
                        />
                      </div>
                    ))
                  )}
                </div>
                <button disabled={!selectedPlayer || loading} className={`w-full font-bold py-5 rounded-xl uppercase tracking-widest shadow-lg transition-all ${selectedPlayer ? 'bg-[#1e1b4b] text-white hover:bg-orange-600 active:scale-95' : 'bg-slate-100 text-slate-300'}`}>
                  {loading ? 'CARGANDO...' : `GUARDAR ${testType}`}
                </button>
              </form>
            </div>
          </div>

          {/* HISTORIAL */}
          <div className="flex-grow">
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 flex flex-col min-h-[700px] overflow-hidden">
              <div className="p-4 md:p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-left shrink-0">
                  <h2 className="font-bold text-slate-800 uppercase tracking-tight text-xl">Historial del Club</h2>
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-[0.2em] mt-1 italic">Panel de marcas físicas</p>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-3 justify-end w-full">
                  <div className="relative">
                    <div className={`flex items-center bg-white border rounded-xl transition-all ${historySelectedPlayer ? 'border-indigo-500 ring-2 ring-indigo-50' : 'border-slate-200'}`}>
                      <Search className={`ml-3 ${historySelectedPlayer ? 'text-indigo-500' : 'text-slate-400'}`} size={14} />
                      <input 
                        type="text" 
                        placeholder="Filtrar por jugador..."
                        className="pl-2 pr-8 py-2 text-[10px] font-bold uppercase outline-none bg-transparent min-w-[150px]"
                        value={historySelectedPlayer ? historySelectedPlayer.name : searchHistoryTerm}
                        readOnly={!!historySelectedPlayer}
                        onChange={(e) => setSearchHistoryTerm(e.target.value)}
                      />
                      {(searchHistoryTerm || historySelectedPlayer) && (
                        <button onClick={() => {setSearchHistoryTerm(''); setHistorySelectedPlayer(null);}} className="absolute right-2 text-slate-300 hover:text-slate-500">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <select onChange={(e) => setFilterTest(e.target.value)} className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-indigo-500 shadow-sm cursor-pointer min-w-[120px]">
                    <option value="todos">Prueba: Todas</option>
                    <option value="velocidad">Velocidad</option>
                    <option value="salto">Salto</option>
                    <option value="resistencia">Resistencia</option>
                  </select>
                  <select onChange={(e) => setFilterSex(e.target.value)} className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-indigo-500 shadow-sm cursor-pointer min-w-[110px]">
                    <option value="todos">Sexo: Todos</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                  </select>
                </div>
              </div>

              <div className="p-2 md:p-4">
                <table className="w-full text-left border-separate border-spacing-y-3 hidden md:table">
                  <thead>
                    <tr className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.25em] px-4">
                      <th className="px-6 py-2">Jugador / Sexo</th>
                      <th className="px-6 py-2 text-center">Prueba</th>
                      <th className="px-6 py-2 text-center">Marca</th>
                      <th className="px-6 py-2 text-right">Fecha</th>
                      <th className="px-6 py-2 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((h) => (
                      <tr key={h.id} className="bg-white hover:bg-slate-50 border border-slate-100 transition-all rounded-2xl shadow-sm group">
                        <td className="px-6 py-5 rounded-l-2xl border-y border-l border-slate-50">
                          <div className="font-bold text-slate-700 text-[13px] tracking-tight">{h.users?.name}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">{h.users?.gender}</div>
                        </td>
                        <td className="px-6 py-5 text-center border-y border-slate-50">
                          <span className={`text-[9px] px-3 py-1.5 rounded-lg font-black uppercase text-white shadow-md ${
                            h.test_type === 'velocidad' ? 'bg-green-600' : h.test_type === 'salto' ? 'bg-blue-600' : 'bg-purple-600'
                          }`}>{h.test_type}</span>
                        </td>
                        <td className="px-6 py-5 text-center border-y border-slate-50 font-bold text-slate-900 tracking-tight">
                          {h.test_type === 'salto' ? (
                            <div className="flex flex-col text-[12px] leading-tight">
                              <span>SJ: {h.attempt_1}cm</span>
                              <span>CMJ: {h.attempt_2}cm</span>
                              <span>AB: {h.attempt_3}cm</span>
                            </div>
                          ) : h.test_type === 'velocidad' ? (
                            <div className="flex flex-col leading-tight">
                              <span className="text-[12px]">Mejor: {getBestScore(h).toFixed(2)}s</span>
                              <span className="text-slate-400 font-normal text-[10px]">({h.attempt_1} | {h.attempt_2} | {h.attempt_3})</span>
                            </div>
                          ) : (
                            <span className="text-sm italic font-black text-[#1e1b4b]">Niv {h.attempt_1}</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-slate-400 text-[11px] border-y border-slate-50 italic">
                          {new Date(h.test_date).toLocaleDateString('es-AR')}
                        </td>
                        <td className="px-6 py-5 text-right rounded-r-2xl border-y border-r border-slate-50">
                          <button onClick={() => handleDelete(h.id)} className="text-slate-200 hover:text-red-500 transition-all p-2 bg-slate-50 rounded-lg group-hover:bg-red-50"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile */}
                <div className="flex flex-col gap-3 md:hidden">
                  {filteredHistory.map((h) => (
                    <div key={h.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 relative">
                      <div className="flex justify-between items-start">
                        <div className="text-left">
                          <div className="font-bold text-slate-700 text-[14px] leading-tight">{h.users?.name}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">{h.users?.gender}</div>
                        </div>
                        <button onClick={() => handleDelete(h.id)} className="text-slate-200 p-1 bg-slate-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                        <span className={`text-[9px] px-2.5 py-1 rounded-md font-black uppercase text-white ${h.test_type === 'velocidad' ? 'bg-green-600' : h.test_type === 'salto' ? 'bg-blue-600' : 'bg-purple-600'}`}>{h.test_type}</span>
                        <div className="text-right">
                          <div className="font-bold text-slate-900 tracking-tight">
                            {h.test_type === 'salto' ? (
                               <span className="text-[12px]">SJ: {h.attempt_1} | CMJ: {h.attempt_2}</span>
                            ) : h.test_type === 'velocidad' ? (
                               <span className="text-[12px]">Mejor: {getBestScore(h).toFixed(2)}s</span>
                            ) : (
                               <span className="text-sm font-black italic text-[#1e1b4b]">Niv {h.attempt_1}</span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-slate-300 mt-1 italic">{new Date(h.test_date).toLocaleDateString('es-AR')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}