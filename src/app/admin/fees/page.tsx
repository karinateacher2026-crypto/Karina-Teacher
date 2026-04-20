'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { Users, Info, Loader2, Search, CheckCircle, AlertTriangle, Trash2, History, X, Percent, Check, Trophy, Sparkles, MapPin, MinusCircle, PlusCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function AdminFees() {
  const [activeTab, setActiveTab] = useState<'massive' | 'manual'>('massive')
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{ show: boolean, type: 'success' | 'error', message: string }>({ show: false, type: 'success', message: '' })

  // --- MES ACTUAL ---
  const date = new Date()
  const monthName = date.toLocaleString('es-ES', { month: 'long' })
  const year = date.getFullYear()
  const baseConcept = `Cuota ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`

  // --- TAB MASIVA (SEGMENTADA) ---
  const [dbSports, setDbSports] = useState<any[]>([])
  const [dbSedes, setDbSedes] = useState<any[]>([])
  const [massiveAmount, setMassiveAmount] = useState('')
  const [selectedSport, setSelectedSport] = useState('')
  const [feeBatches, setFeeBatches] = useState<any[]>([])
  const [historyFilter, setHistoryFilter] = useState('todos')
  
  // Guardamos los identificadores seleccionados (blindado para evitar selección múltiple accidental)
  const [massiveSedeIds, setMassiveSedeIds] = useState<any[]>([]) 
  const [massiveCats, setMassiveCats] = useState<number[]>([])
  const [availableCatsForMassive, setAvailableCatsForMassive] = useState<any[]>([])

  const [showBonusModal, setShowBonusModal] = useState(false)
  const [bonusPercent, setBonusPercent] = useState('10')
  const [bonusType, setBonusType] = useState<'multi' | 'family'>('multi')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<{ show: boolean, batchName: string | null }>({ show: false, batchName: null })

  // Construcción dinámica del nombre del lote
  const getDynamicConcept = () => {
    let concept = `${baseConcept} - ${selectedSport}`
    const sedeNames = dbSedes
  .filter(s => massiveSedeIds.includes(s.sede_id)) // Cambiado .id por .sede_id
  .map(s => s.name)
  .join(', ')
    
    const catNames = Array.from(
  new Set(
    availableCatsForMassive
      .filter(c => massiveCats.includes(c.id))
      .map(c => c.name)
  )
).join(', ')

    if (sedeNames || catNames) {
      concept += ` (${sedeNames ? sedeNames : ''}${sedeNames && catNames ? ' - ' : ''}${catNames ? catNames : ''})`
    }
    return concept
  }

  const fullConcept = getDynamicConcept()

  // -------------------------------------------------------------------
  // 🚀 LÓGICA DE BLOQUEO INTELIGENTE (ÚNICO CAMBIO)
  // -------------------------------------------------------------------
  const [isSelectionDisabled, setIsSelectionDisabled] = useState(false)

  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedSport || dbSports.length === 0) return
      const sportId = dbSports.find(s => s.name === selectedSport)?.deporte_id
      if (!sportId) return

      let query = supabase
        .from('user_categories')
        .select('user_id, categories!inner(sede_id)')
        .eq('deporte_id', sportId)
      
      if (massiveSedeIds.length > 0) query = query.in('categories.sede_id', massiveSedeIds)
      if (massiveCats.length > 0) query = query.in('category_id', massiveCats)

      const { data: candidates } = await query
      if (!candidates || candidates.length === 0) {
        setIsSelectionDisabled(false)
        return
      }
      const candidateIds = candidates.map(c => c.user_id)

      const { data: alreadyPaid } = await supabase
        .from('payments')
        .select('user_id')
        .eq('method', 'cuota')
        .eq('sport_snapshot', selectedSport)
        .ilike('proof_url', `${baseConcept}%`)
        .in('user_id', candidateIds)

      if (alreadyPaid) {
        const paidUserIds = new Set(alreadyPaid.map(p => p.user_id))
        const allPaid = candidateIds.every(id => paidUserIds.has(id))
        setIsSelectionDisabled(allPaid)
      } else {
        setIsSelectionDisabled(false)
      }
    }
    checkAvailability()
  }, [selectedSport, massiveSedeIds, massiveCats, feeBatches, baseConcept, dbSports])

  // --- TAB MANUAL ---
  const [manualUser, setManualUser] = useState<any>(null)
  const [manualAmount, setManualAmount] = useState('')
  const [manualNote, setManualNote] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [adjustmentType, setAdjustmentType] = useState<'debt' | 'bonus'>('debt')
  const [dbCategories, setDbCategories] = useState<any[]>([])
  const [filterCats, setFilterCats] = useState<number[]>([])

  // -------------------------------------------------------------------
  // CARGA INICIAL
  // -------------------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      const { data: sports } = await supabase.from('deportes').select('*').order('name')
      const { data: sedes } = await supabase.from('sedes').select('*').order('name')
      
      if (sports?.length) { 
        setDbSports(sports)
        setSelectedSport(sports[0].name)
      }
      if (sedes?.length) setDbSedes(sedes)

      const { data: allCats } = await supabase
        .from('categories')
        .select(`id, name, gender, sede_id, deporte_id, sedes ( name ), deportes ( name )`)
        .order('name')
      
      if (allCats) setDbCategories(allCats)
      fetchFeeBatches()
    }
    init()
  }, [])

 useEffect(() => {
    if (selectedSport) {
      const filtered = dbCategories.filter(c => c.deportes?.name === selectedSport)
      setAvailableCatsForMassive(filtered)
      setMassiveCats([]) 
      setMassiveSedeIds([])
    }
  }, [selectedSport, dbCategories])

  // 🚀 FILTRO DE CATEGORÍAS CORREGIDO: 
  // Filtra las categorías disponibles según los IDs de sede (sede_id) seleccionados.
  const displayedCats = massiveSedeIds.length > 0
    ? availableCatsForMassive.filter(c => massiveSedeIds.includes(Number(c.sede_id)))
    : availableCatsForMassive;

  // -------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000)
  }

  const fetchFeeBatches = async () => {
    const { data } = await supabase.from('payments').select('proof_url, date, amount').eq('method', 'cuota').order('date', { ascending: false }).limit(200)
    if (data) {
      const map = new Map()
      data.forEach(item => { if (!map.has(item.proof_url)) map.set(item.proof_url, { name: item.proof_url, date: item.date, amount: Math.abs(item.amount) }) })
      setFeeBatches(Array.from(map.values()))
    }
  }

  // 🚀 Lógica de Alternancia Blindada: Usa un identificador único real
  const toggleSedeMassive = (sede: any) => {
  const identifier = Number(sede.sede_id); // Cambiado .id por .sede_id
  setMassiveSedeIds(prev => 
    prev.includes(identifier) ? prev.filter(i => i !== identifier) : [...prev, identifier]
  );
};

  const toggleCatMassive = (id: number) =>
    setMassiveCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const toggleCatManual = (id: number) =>
    setFilterCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const handleSearch = async (term: string) => {
    setSearchTerm(term)
    if (term.length < 3) { setSearchResults([]); return }
    const { data } = await supabase.from('users').select('id, name, cuil, account_balance').contains('role', ['player']).or(`name.ilike.%${term}%,cuil.ilike.%${term}%`).limit(5)
    setSearchResults(data || [])
  }

  // -------------------------------------------------------------------
  // GENERACIÓN MASIVA SEGMENTADA (MATCH REFORZADO)
  // -------------------------------------------------------------------
  const executeMassiveGeneration = async () => {
    setLoading(true); setShowConfirmModal(false)
    try {
      const sportId = dbSports.find(s => s.name === selectedSport)?.deporte_id;      
      
      let query = supabase
        .from('user_categories')
        .select('user_id, users!inner(id, status, role), categories!inner(id, name, sede_id)')
        .eq('users.status', 'active')
        .contains('users.role', ['player'])
        .eq('deporte_id', sportId);

      if (massiveSedeIds.length > 0) {
        query = query.in('categories.sede_id', massiveSedeIds);
      }

      if (massiveCats.length > 0) {
        query = query.in('category_id', massiveCats);
      }

      const { data: candidates, error: candError } = await query
      if (candError) throw candError
      if (!candidates?.length) throw new Error(`No hay socios que coincidan con la selección.`)

      // --- 🚀 ESTA ES LA LÓGICA DE EXCLUSIÓN REFORZADA ---
      // Buscamos en la tabla de pagos TODOS los socios que ya tengan la cuota de este deporte este mes
      // No filtramos por 'proof_url', sino por 'sport_snapshot' y el mes (baseConcept)
      const { data: alreadyPaidThisMonth } = await supabase
        .from('payments')
        .select('user_id')
        .eq('method', 'cuota')
        .eq('sport_snapshot', selectedSport)
        .ilike('proof_url', `${baseConcept}%`); // baseConcept es "Cuota Marzo 2026"

      const paidIds = new Set(alreadyPaidThisMonth?.map(p => p.user_id))
      
      // Filtramos los candidatos: solo pasan los que NO están en la lista de los que ya pagaron
      const finalTargets = candidates.filter(c => !paidIds.has(c.user_id))
      // ---------------------------------------------------

      if (finalTargets.length === 0) {
        throw new Error(`Todos los socios que cumplen estos filtros ya tienen su cuota de ${selectedSport} generada para este mes.`)
      }

      const amount = parseFloat(massiveAmount)
      const records = finalTargets.map((item: any) => ({
        user_id: item.users.id,
        amount: -amount,
        method: 'cuota',
        date: new Date().toISOString(),
        status: 'completed',
        proof_url: fullConcept,
        category_snapshot: item.categories?.name || 'S/D',
        sport_snapshot: selectedSport
      }))

      const { error: insertError } = await supabase.from('payments').insert(records)
      if (insertError) throw insertError

      showToast(`¡Éxito! Cuota generada para ${finalTargets.length} socios.`, 'success')
      setMassiveAmount(''); setMassiveCats([]); setMassiveSedeIds([]); fetchFeeBatches()
    } catch (e: any) { 
      showToast(e.message, 'error') 
    } finally { 
      setLoading(false) 
    }
  }

  // applyBonuses y executeDeleteBatch se mantienen igual
  const applyBonuses = async () => {
    setLoading(true); setShowBonusModal(false)
    try {
      const { data: monthFees } = await supabase.from('payments').select('user_id, amount').eq('method', 'cuota').ilike('proof_url', `%${baseConcept}%`)
      if (!monthFees?.length) throw new Error('Cargá primero las cuotas del mes.')
      const { data: players } = await supabase.from('users').select('id, family_id, account_balance, user_categories(deporte_id, categories(name), deportes(name))').eq('status', 'active')
      if (!players) return
      const feeMap = new Map<string, number>()
      monthFees.forEach(f => feeMap.set(f.user_id, (feeMap.get(f.user_id) || 0) + Math.abs(f.amount)))
      const familyCount: any = {}
      players.forEach(p => { if (p.family_id) familyCount[p.family_id] = (familyCount[p.family_id] || 0) + 1 })
      const pct = parseFloat(bonusPercent) / 100
      const records: any[] = []; const updates: any[] = []
      for (const p of players) {
        const debt = feeMap.get(p.id) || 0; if (!debt) continue
        const { data: already } = await supabase.from('payments').select('id').eq('user_id', p.id).eq('method', 'adjustment').ilike('notes', `%Bonificación ${monthName}%`).maybeSingle()
        if (already) continue
        const rels = (p.user_categories as any[]) || []
        let note = ''
        if (bonusType === 'multi' && rels.length >= 2) note = `Bonificación ${monthName} - MultiIdiomas (${bonusPercent}%)`
        else if (bonusType === 'family' && p.family_id && familyCount[p.family_id] >= 2) note = `Bonificación ${monthName} - Familiar (${bonusPercent}%)`
        if (!note) continue
        const credit = debt * pct
        const allSports = [...new Set(rels.map(r => r.deportes?.name).filter(Boolean))].join(' / ')
        const allCats = [...new Set(rels.map(r => r.categories?.name).filter(Boolean))].join(' / ')
        records.push({ user_id: p.id, amount: credit, method: 'adjustment', date: new Date().toISOString(), status: 'completed', notes: note, sport_snapshot: allSports || 'MultiIdioma', category_snapshot: allCats || 'Varias' })
        updates.push(supabase.rpc('increment_balance', { x: credit, row_id: p.id }))
      }
      if (!records.length) throw new Error('No hay socios para bonificar o ya fueron procesados.')
      await supabase.from('payments').insert(records); await Promise.all(updates)
      showToast('Beneficio aplicado correctamente.', 'success')
    } catch (e: any) { showToast(e.message, 'error') } finally { setLoading(false) }
  }

  const executeDeleteBatch = async () => {
    const batchName = showDeleteModal.batchName; 
    if (!batchName) return;
    
    setLoading(true); 
    // NO cerramos el modal acá, así el usuario ve la ruedita girando mientras procesa
    
    try {
      // 1. Extraemos el mes del nombre del lote (Ej: de "Cuota Marzo 2026..." saca "Marzo")
      const monthMatch = batchName.match(/Cuota (\w+)/);
      const targetMonth = monthMatch ? monthMatch[1] : monthName;

      // 2. Buscamos a qué usuarios se les había cobrado en este lote específico
      const { data: fees } = await supabase
        .from('payments')
        .select('user_id')
        .eq('proof_url', batchName);

      // 3. Borramos las bonificaciones asociadas a esos usuarios en ese mes de un solo golpe
      if (fees && fees.length > 0) {
        const userIds = fees.map(f => f.user_id);
        await supabase
          .from('payments')
          .delete()
          .eq('method', 'adjustment')
          .in('user_id', userIds)
          .ilike('notes', `%Bonificación ${targetMonth}%`);
      }

      // 4. Finalmente, borramos el lote de cuotas principal
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('proof_url', batchName);

      if (error) throw error;
      
      showToast(`Lote "${batchName}" eliminado.`, 'success'); 
      fetchFeeBatches();
      setShowDeleteModal({ show: false, batchName: null }); // Recién ahora cerramos el modal
    } catch (e: any) { 
      showToast('Error: ' + e.message, 'error'); 
      setShowDeleteModal({ show: false, batchName: null });
    } finally { 
      setLoading(false); 
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let amountVal = parseFloat(manualAmount)
    if (!amountVal || amountVal <= 0) return
    const finalAmount = adjustmentType === 'debt' ? -amountVal : amountVal
    setLoading(true)
    try {
      let targets: any[] = []
      if (manualUser) {
        const { data } = await supabase.from('users').select('id, name, user_categories(deportes(name), categories(name))').eq('id', manualUser.id).single()
        targets = data ? [data] : []
      } else {
        if (filterCats.length === 0) throw new Error('Seleccioná al menos una categoría.')
        const { data } = await supabase.from('users').select('id, name, user_categories!inner(category_id, deportes(name), categories(name))').eq('status', 'active').in('user_categories.category_id', filterCats)
        targets = data || []
      }
      if (!targets.length) throw new Error('No hay socios seleccionados.')
      
      const records = targets.map(t => {
        const rels = (t.user_categories as any[]) || []
        const allCats = [...new Set(rels.map(r => r.categories?.name).filter(Boolean))].join(' / ')
        const allSports = [...new Set(rels.map(r => r.deportes?.name).filter(Boolean))].join(' / ')

        return {
          user_id: t.id, 
          amount: finalAmount, 
          method: 'adjustment', 
          date: new Date().toISOString(), 
          status: 'completed',
          notes: manualNote || (adjustmentType === 'debt' ? 'Ajuste Deuda' : 'Ajuste Bonificación'),
          category_snapshot: allCats || 'S/D', 
          sport_snapshot: allSports || 'S/D'
        }
      })

      await supabase.from('payments').insert(records)
      for (const t of targets) await supabase.rpc('increment_balance', { x: finalAmount, row_id: t.id })
      showToast('Ajuste aplicado.', 'success')
      setManualUser(null); setManualAmount(''); setManualNote(''); setFilterCats([])
    } catch (e: any) { showToast(e.message, 'error') } finally { setLoading(false) }
  }
// --- LÓGICA DE FILTRADO DE HISTORIAL ---
  const currentMonthDate = new Date();
  const currentMonthNum = currentMonthDate.getMonth();
  const currentYearNum = currentMonthDate.getFullYear();
  
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(currentMonthDate.getMonth() - 1);
  const lastMonthNum = lastMonthDate.getMonth();
  const lastMonthYearNum = lastMonthDate.getFullYear();

  const filteredBatches = feeBatches.filter(batch => {
    if (historyFilter === 'todos') return true;
    
    const bDate = new Date(batch.date);
    if (historyFilter === 'este_mes') {
      return bDate.getMonth() === currentMonthNum && bDate.getFullYear() === currentYearNum;
    }
    if (historyFilter === 'mes_anterior') {
      return bDate.getMonth() === lastMonthNum && bDate.getFullYear() === lastMonthYearNum;
    }
    return true;
  });



  return (
    <div className="space-y-6 min-h-screen pb-10 font-sans text-left">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Cuotas</h1>
        <p className="text-gray-500 mt-1">Liquidación inteligente del Instituto.</p>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit border border-gray-200">
        <button onClick={() => setActiveTab('massive')} className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'massive' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'}`}>Generación por Actividad</button>
        <button onClick={() => setActiveTab('manual')} className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'manual' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'}`}>Ajuste Individual / Grupo</button>
      </div>

      {activeTab === 'massive' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-3xl">
            <div className="flex gap-2 mb-8 bg-gray-50 p-1.5 rounded-xl border border-gray-200 overflow-x-auto">
              {dbSports.map(sport => {
                const sKey = sport.id ? `sport-id-${sport.id}` : `sport-name-${sport.name}`;
                return (
                  <button key={sKey} onClick={() => setSelectedSport(sport.name)} className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-lg font-black uppercase text-xs transition-all ${selectedSport === sport.name ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white'}`}>
                    <Trophy size={16} /> {sport.name}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mb-6 p-4 bg-red-50 text-red-800 rounded-lg border border-red-100">
              <div className="bg-white p-2 rounded-full shadow-sm"><Users size={20} className="text-red-500" /></div>
              <div>
                <h3 className="font-bold text-sm uppercase">CARGA DE DEUDA: {selectedSport}</h3>
                <p className="text-xs mt-1">Se generará el monto bruto. Los beneficios se aplican al final.</p>
              </div>
            </div>

            <div className="mb-8 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-4">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12}/> Segmentación de Cuota (Opcional)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="max-h-32 overflow-y-auto bg-white border border-gray-200 rounded-lg p-2 space-y-1">
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Filtrar por Sede:</p>
                                    {dbSedes.map(s => {
                    const identifier = Number(s.sede_id); // Cambiado .id por .sede_id
                    const isSelected = massiveSedeIds.includes(identifier);
                    return (
                        <button 
                        key={`massive-sede-btn-${identifier}`} 
                        type="button"
                        onClick={() => toggleSedeMassive(s)}
                        className={`w-full text-left px-2 py-1.5 rounded text-[10px] font-bold transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-gray-50 text-gray-600 bg-white'}`}
                        >
                        <div className="flex items-center justify-between">
                          <span>{s.name}</span>
                          {isSelected && <Check size={10} />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="max-h-32 overflow-y-auto bg-white border border-gray-200 rounded-lg p-2 space-y-1">
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Filtrar por Categorías:</p>
                  {displayedCats.length > 0 ? displayedCats.map(cat => (
                    <button 
                      key={`massive-cat-btn-${cat.id || cat.name}`} 
                      type="button"
                      onClick={() => toggleCatMassive(cat.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-[10px] font-bold transition-all ${massiveCats.includes(cat.id) ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-gray-50 text-gray-600 bg-white'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{cat.name} ({cat.gender})</span>
                        {massiveCats.includes(cat.id) && <Check size={10} />}
                      </div>
                    </button>
                  )) : <p className="text-[9px] text-gray-300 p-2 italic text-left">Sin categorías para esta selección</p>}
                </div>
              </div>
              {(massiveSedeIds.length > 0 || massiveCats.length > 0) && (
                <button onClick={() => {setMassiveSedeIds([]); setMassiveCats([])}} className="text-[9px] font-black text-red-500 uppercase hover:underline">Remover Filtros y cobrar a todos</button>
              )}
            </div>

            <form onSubmit={e => { e.preventDefault(); setShowConfirmModal(true) }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Monto Bruto ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-gray-400 font-bold text-lg">$</span>
                    <input 
                          type="number" 
                          required 
                          min="1" 
                          disabled={isSelectionDisabled} 
                          className="w-full pl-9 p-3 border border-gray-300 rounded-lg outline-none font-bold text-lg text-gray-900 disabled:bg-gray-100 focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          placeholder="0" 
                          value={massiveAmount} 
                          onChange={e => setMassiveAmount(e.target.value)}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Concepto del Lote</label>
                  <input type="text" disabled className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 font-bold text-gray-700 cursor-not-allowed text-ellipsis overflow-hidden whitespace-nowrap" value={fullConcept} />
                </div>
              </div>
              <button disabled={loading || !massiveAmount || isSelectionDisabled} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-200 uppercase text-sm flex justify-center items-center gap-2 shadow-sm">
                {loading ? <Loader2 className="animate-spin" /> : isSelectionDisabled ? 'Ya generado para esta selección' : `Generar Cuotas`}
              </button>
            </form>
          </div>
          
          <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-100 max-w-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-4"><Sparkles className="text-indigo-600" size={24} /><h3 className="font-black text-indigo-900 uppercase tracking-tight">Aplicar Bonificaciones</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => { setBonusType('multi'); setShowBonusModal(true) }} className="bg-white p-4 rounded-xl border border-indigo-200 flex flex-col items-center gap-2 hover:bg-indigo-600 group transition-all">
                <Trophy className="text-indigo-600 group-hover:text-white" size={24} />
                <span className="font-black text-[10px] uppercase text-indigo-900 group-hover:text-white">Bonif. MultiIdioma</span>
              </button>
              <button onClick={() => { setBonusType('family'); setShowBonusModal(true) }} className="bg-white p-4 rounded-xl border border-indigo-200 flex flex-col items-center gap-2 hover:bg-indigo-600 group transition-all">
                <Users className="text-indigo-600 group-hover:text-white" size={24} />
                <span className="font-black text-[10px] uppercase text-indigo-900 group-hover:text-white">Bonif. Familiar</span>
              </button>
            </div>
          </div>
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-sm uppercase flex items-center gap-2">
                <History size={18} /> Historial de Lotes
              </h3>
              <select 
                className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
              >
                <option value="todos">Historial Completo</option>
                <option value="este_mes">Este Mes</option>
                <option value="mes_anterior">Mes Anterior</option>
              </select>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {filteredBatches.length === 0
                ? <div className="p-8 text-center text-gray-400 text-sm font-medium">No hay historial reciente.</div>
                : <div className="divide-y divide-gray-100">
                    {filteredBatches.map((batch, i) => (
                      <div key={`hist-batch-row-${i}`} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-xs border border-blue-100 uppercase bg-blue-50 text-blue-600">{batch.name.split('-')[1]?.trim().charAt(0) || 'C'}</div>
                          <div><p className="font-bold text-gray-900 text-sm">{batch.name}</p><p className="text-xs text-gray-500">Fecha: {format(parseISO(batch.date), 'dd/MM/yyyy')} • <span className="text-red-600 font-bold">${batch.amount.toLocaleString()}</span></p></div>
                        </div>
                        <button onClick={() => setShowDeleteModal({ show: true, batchName: batch.name })} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition shadow-sm"><Trash2 size={14} /> Borrar</button>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-3xl animate-in fade-in">
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => setAdjustmentType('debt')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${adjustmentType === 'debt' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
              >
                <MinusCircle size={24} />
                <span className="font-black text-[10px] uppercase">Cargar Deuda</span>
              </button>
              <button 
                type="button"
                onClick={() => setAdjustmentType('bonus')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${adjustmentType === 'bonus' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
              >
                <PlusCircle size={24} />
                <span className="font-black text-[10px] uppercase">Bonificación</span>
              </button>
            </div>

            <div className={manualUser === null && filterCats.length > 0 ? 'opacity-40 pointer-events-none' : ''}>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Opción A: Estudiante Único</label>
              {!manualUser ? (
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input type="text" className="w-full pl-10 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-gray-900" placeholder="Buscar socio..." value={searchTerm} onChange={e => handleSearch(e.target.value)} />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {searchResults.map(u => (
                        <button key={`manual-search-res-${u.id}`} type="button" onClick={() => { setManualUser(u); setSearchTerm(''); setSearchResults([]) }} className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-sm font-bold text-gray-800 border-b last:border-0">{u.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 border border-indigo-200 rounded-lg flex justify-between items-center bg-indigo-50">
                  <span className="font-bold text-indigo-700 text-xs">{manualUser.name}</span>
                  <button onClick={() => setManualUser(null)} className="text-red-500"><X size={16} /></button>
                </div>
              )}
            </div>

            <div className={`space-y-4 ${manualUser ? 'opacity-30 pointer-events-none' : ''}`}>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Opción B: Selección Grupal</label>
              <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-100 pr-4">
                {dbCategories.map(cat => (
                  <button
                    key={`manual-cat-select-btn-${cat.id}`}
                    type="button"
                    onClick={() => toggleCatManual(cat.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${filterCats.includes(cat.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}
                  >
                    <div className="flex flex-col text-left">
                      <span className={`text-[9px] font-black uppercase ${filterCats.includes(cat.id) ? 'text-indigo-100' : 'text-gray-400'}`}>
                        {cat.sedes?.name} / {cat.deportes?.name}
                      </span>
                      <span className="text-xs font-bold uppercase">{cat.name} ({cat.gender})</span>
                    </div>
                    {filterCats.includes(cat.id) && <Check size={16} strokeWidth={4} />}
                  </button>
                ))}
              </div>
              {filterCats.length > 0 && (
                <button onClick={() => setFilterCats([])} className="text-[10px] font-bold text-indigo-600 uppercase hover:underline">Limpiar Selección</button>
              )}
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Monto ($)</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none font-bold text-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    value={manualAmount} 
                    onChange={e => setManualAmount(e.target.value)} 
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Motivo / Nota</label>
                  <input type="text" required placeholder="Ej: Indumentaria..." className="w-full p-3 border border-gray-300 rounded-lg outline-none font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500" value={manualNote} onChange={e => setManualNote(e.target.value)} />
                </div>
              </div>
              <button disabled={loading || (!manualUser && filterCats.length === 0)} className={`w-full py-3 text-white font-black rounded-lg transition flex justify-center items-center gap-2 shadow-sm uppercase text-sm ${adjustmentType === 'debt' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-300`}>
                {loading ? <Loader2 className="animate-spin" /> : manualUser ? 'Aplicar al Socio' : `Aplicar a ${filterCats.length} categorías`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALES Y NOTIFICACIONES */}
      {showBonusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
            <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 mx-auto"><Percent size={32} className="text-indigo-600" /></div>
            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase">Bonificación</h3>
            <div className="relative mb-6">
              <span className="absolute right-4 top-3.5 text-gray-400 font-black">%</span>
              <input type="number" autoFocus className="w-full p-4 border-2 border-indigo-200 rounded-xl outline-none focus:border-indigo-600 font-black text-2xl text-center text-gray-900" value={bonusPercent} onChange={e => setBonusPercent(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowBonusModal(false)} className="py-3 bg-gray-100 text-gray-700 font-bold rounded-xl">Cancelar</button>
              <button onClick={applyBonuses} disabled={loading} className="py-3 bg-indigo-600 text-white font-bold rounded-xl flex justify-center items-center">{loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto"><AlertTriangle size={32} className="text-red-600" /></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Confirmás Lote?</h3>
            <p className="text-gray-500 text-xs mb-6 font-bold uppercase tracking-widest">{fullConcept}</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-lg">Cancelar</button>
              <button onClick={executeMassiveGeneration} className="py-2.5 px-4 bg-gray-900 text-white font-bold rounded-lg flex justify-center items-center">{loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto"><Trash2 size={32} className="text-gray-600" /></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar Lote?</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowDeleteModal({ show: false, batchName: null })} className="py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-lg">Cancelar</button>
              <button onClick={executeDeleteBatch} className="py-2.5 px-4 bg-red-600 text-white font-bold rounded-lg flex justify-center items-center">{loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      {notification.show && (
        <div className={`fixed bottom-8 right-8 z-[60] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 border-l-4 ${notification.type === 'success' ? 'bg-white border-green-500' : 'bg-white border-red-500'} text-left`}>
          {notification.type === 'success' ? <CheckCircle size={24} className="text-green-500" /> : <AlertTriangle size={24} className="text-red-500" />}
          <div><h4 className="font-bold text-sm text-gray-900">{notification.type === 'success' ? '¡Hecho!' : 'Error'}</h4><p className="text-gray-500 text-xs">{notification.message}</p></div>
        </div>
      )}
    </div>
  )
}