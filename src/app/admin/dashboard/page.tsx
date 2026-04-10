'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { DollarSign, Search, CreditCard, Loader2, Calendar, CheckCircle, XCircle, AlertTriangle, Users, Filter, User, Check, Trophy } from 'lucide-react'
import { format, parseISO, startOfMonth, subMonths, startOfYear, endOfMonth, differenceInYears } from 'date-fns'

export default function AdminDashboard() {
  const [dateFilter, setDateFilter] = useState<'current' | 'last' | 'year' | 'custom'>('current')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [sportFilter, setSportFilter] = useState<string>('all')
  const [sedeFilter, setSedeFilter] = useState<string>('all')

  const [dbSports, setDbSports] = useState<any[]>([])
  const [dbCategories, setDbCategories] = useState<any[]>([])

  const [selectedUserFilter, setSelectedUserFilter] = useState<any>(null)
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<any[]>([])
  
  const [stats, setStats] = useState({ revenue: 0, debt: 0, debtorCount: 0, topDebtors: [] as {name: string, balance: number}[] })
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [quickPayUser, setQuickPayUser] = useState<any>(null)
  const [quickPayAmount, setQuickPayAmount] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [processing, setProcessing] = useState(false)
  
  const [notification, setNotification] = useState<{ show: boolean, type: 'success' | 'error', message: string }>({ 
    show: false, 
    type: 'success', 
    message: '' 
  })

  useEffect(() => {
    const initDB = async () => {
      const { data: sports } = await supabase.from('deportes').select('*').order('name')
      const { data: cats } = await supabase.from('categories').select('*').order('name')
      
      if (sports) setDbSports(sports)
      if (cats) setDbCategories(cats)
    }
    initDB()
  }, [])

  useEffect(() => {
    if (dateFilter === 'custom' && (!customStart || !customEnd)) return;
    fetchDashboardData()
  }, [dateFilter, categoryFilter, genderFilter, selectedUserFilter, customStart, customEnd, sportFilter, sedeFilter])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
      setNotification({ show: true, type, message })
      setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000)
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    const now = new Date()
    
    let startDate: Date;
    let endDate: Date;

    if (dateFilter === 'last') {
        const lastMonth = subMonths(now, 1)
        startDate = startOfMonth(lastMonth)
        endDate = endOfMonth(lastMonth)
    } else if (dateFilter === 'year') {
        startDate = startOfYear(now)
        endDate = now
    } else if (dateFilter === 'custom' && customStart && customEnd) {
        startDate = new Date(customStart + 'T00:00:00')
        endDate = new Date(customEnd + 'T23:59:59')
    } else {
        startDate = startOfMonth(now)
        endDate = now
    }

    let validUserIds: string[] = [];
    let isFilterActive = false;

    if (selectedUserFilter) {
        isFilterActive = true;
        validUserIds.push(selectedUserFilter.id);
    } else if (sportFilter !== 'all' || sedeFilter !== 'all' || categoryFilter !== 'all' || genderFilter !== 'all') {
        isFilterActive = true;
        
        let ucQuery = supabase.from('user_categories')
            .select('user_id, category_id, deporte_id, categories!inner(sede_id, gender), users!inner(gender, status)');

        if (sportFilter !== 'all') ucQuery = ucQuery.eq('deporte_id', sportFilter);
        if (categoryFilter !== 'all') ucQuery = ucQuery.eq('category_id', categoryFilter);
        if (sedeFilter !== 'all') ucQuery = ucQuery.eq('categories.sede_id', sedeFilter);

        const { data: ucData } = await ucQuery;

        if (ucData) {
            const tempIds = new Set<string>();
            ucData.forEach((uc: any) => {
                let matchesGender = genderFilter === 'all';
                if (!matchesGender) {
                    const dbGender = uc.users?.gender?.toLowerCase() || '';
                    if (genderFilter === 'male') matchesGender = (dbGender === 'male' || dbGender === 'm' || dbGender === 'masculino');
                    if (genderFilter === 'female') matchesGender = (dbGender === 'female' || dbGender === 'f' || dbGender === 'femenino');
                }
                if (matchesGender) {
                    tempIds.add(uc.user_id);
                }
            });
            validUserIds = Array.from(tempIds);
        }
    }

    let query = supabase.from('payments')
      .select('user_id, amount, method, status, date, users(name)')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())

    if (isFilterActive) {
        if (validUserIds.length === 0) {
            setStats({ revenue: 0, debt: 0, debtorCount: 0, topDebtors: [] })
            setRecentPayments([])
            setLoading(false)
            return
        }
        query = query.in('user_id', validUserIds)
    }

    const { data: movements } = await query

    let filteredRevenue = 0;
    let periodDebt = 0;
    let debtors = 0;
    const debtorList: {name: string, balance: number}[] = [];
    
    if (movements && movements.length > 0) {
      const balanceMap = new Map<string, {name: string, balance: number}>();
      
      movements.forEach(m => {
        if (m.status === 'pending' || m.status === 'rejected') return;

        const user = m.users as any;

        if (m.amount > 0 && (m.method === 'cash' || m.method === 'transfer')) {
            filteredRevenue += m.amount;
        }

        const currentData = balanceMap.get(m.user_id) || { name: user?.name || 'Socio', balance: 0 };
        balanceMap.set(m.user_id, { ...currentData, balance: currentData.balance + m.amount });
      });

      balanceMap.forEach((userData) => {
        if (userData.balance < 0) {
          periodDebt += Math.abs(userData.balance);
          debtors++;
          debtorList.push(userData);
        }
      });
    }

    const topDebtors = debtorList
        .sort((a, b) => a.balance - b.balance)
        .slice(0, 5);

    let recentQuery = supabase.from('payments')
      .select('*, users(name)')
      .gt('amount', 0)
      .in('method', ['cash', 'transfer'])
      .in('status', ['completed', 'approved'])
      .order('date', { ascending: false })
      .limit(5)
      
    if (isFilterActive && validUserIds.length > 0) {
      recentQuery = recentQuery.in('user_id', validUserIds)
    }

    const { data: recent } = await recentQuery

    setStats({ revenue: filteredRevenue, debt: periodDebt, debtorCount: debtors, topDebtors })
    setRecentPayments(recent || [])
    setLoading(false)
  }

  const handleUserSearch = async (term: string) => {
    setUserSearchTerm(term)
    if (term.length < 3) { setUserSearchResults([]); return }
    const { data } = await supabase.from('users').select('id, name, cuil').contains('role', ['player']).or(`name.ilike.%${term}%,cuil.ilike.%${term}%`).limit(5)
    setUserSearchResults(data || [])
  }

  const handleSearch = async (term: string) => {
      setSearchTerm(term)
      if (term.length < 3) { 
          setSearchResults([])
          return 
      }
      
      // Le sacamos las columnas conflictivas (category, sport, birth_date) y dejamos solo las seguras
      const { data, error } = await supabase
          .from('users')
          .select('id, name, cuil, account_balance')
          .contains('role', ['player'])
          .or(`name.ilike.%${term}%,cuil.ilike.%${term}%`)
          .limit(5)
          
      if (error) {
          console.error("Error en Caja Rápida:", error)
      }
      
      setSearchResults(data || [])
  }

  const selectUser = (user: any) => { setQuickPayUser(user); setSearchTerm(''); setSearchResults([]) }

  const handleQuickPay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickPayUser || !quickPayAmount) return
    setProcessing(true)
    
    try {
        // 1. Buscamos los deportes y categorías actuales del socio en la base de datos
        const { data: userSportsCats } = await supabase
            .from('user_categories')
            .select('deportes(name), categories(name)')
            .eq('user_id', quickPayUser.id)

        let finalSport = 'Sin Deporte'
        let finalCategory = 'Sin Categoría'

        // 2. Si tiene registros, los extraemos y los unimos con " / "
        if (userSportsCats && userSportsCats.length > 0) {
            // Usamos Set para evitar que diga "Voley / Voley" si por error está dos veces
            const sportsList = Array.from(new Set(userSportsCats.map((uc: any) => uc.deportes?.name).filter(Boolean)))
            const catsList = Array.from(new Set(userSportsCats.map((uc: any) => uc.categories?.name).filter(Boolean)))
            
            if (sportsList.length > 0) finalSport = sportsList.join(' / ')
            if (catsList.length > 0) finalCategory = catsList.join(' / ')
        }

        // 3. Registramos el pago usando los snapshots recién calculados
        const amount = parseFloat(quickPayAmount)
        const { error } = await supabase.from('payments').insert({ 
            user_id: quickPayUser.id, 
            amount: amount, 
            method: 'cash', 
            date: new Date().toISOString(), 
            status: 'completed',
            category_snapshot: finalCategory, 
            sport_snapshot: finalSport 
        })

        if (error) throw error
        
        showToast(`Pago registrado para ${quickPayUser.name}`, 'success')
        setQuickPayUser(null)
        setQuickPayAmount('')
        fetchDashboardData() 
        
    } catch (error) { 
        console.error(error)
        showToast('Error al registrar pago.', 'error') 
    } finally { 
        setProcessing(false) 
    }
  }

  const periodLabel = dateFilter === 'current' ? 'Este Mes' : (dateFilter === 'last' ? 'Mes Anterior' : (dateFilter === 'year' ? 'Año Actual' : 'Personalizado'))

  const filteredCategories = dbCategories.filter(cat => {
    const matchSport = sportFilter === 'all' || cat.deporte_id?.toString() === sportFilter;
    const matchSede = sedeFilter === 'all' || cat.sede_id?.toString() === sedeFilter;
    
    let matchGender = true;
    if (genderFilter !== 'all') {
        const catGender = cat.gender?.toLowerCase() || '';
        if (genderFilter === 'male') matchGender = (catGender === 'm' || catGender === 'masculino' || catGender === 'male');
        if (genderFilter === 'female') matchGender = (catGender === 'f' || catGender === 'femenino' || catGender === 'female');
    }
    return matchSport && matchSede && matchGender;
  });

  if (loading && !selectedUserFilter && dateFilter !== 'custom') return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>

  return (
    <div className="space-y-6 font-sans text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left">
        <div className="text-left">
            <h1 className="text-2xl font-bold text-gray-800 text-left">Panel de Control</h1>
            <p className="text-gray-500 text-sm text-left">Resumen de movimientos: <span className="font-semibold text-indigo-600">{periodLabel}</span></p>
        </div>

        <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-xl border border-gray-200 shadow-sm text-left">
            <div className="relative border-r border-gray-100 pr-2 mr-1 text-left">
              {!selectedUserFilter ? (
                <div className="relative text-left">
                  <Search className="absolute left-2 top-2 text-gray-400 text-left" size={14}/>
                  <input 
                    type="text" 
                    placeholder="Filtrar por Socio..." 
                    className="pl-7 pr-3 py-1.5 bg-gray-50 rounded-lg text-xs font-bold text-gray-600 outline-none focus:ring-1 focus:ring-indigo-300 w-40 text-left"
                    value={userSearchTerm}
                    onChange={(e) => handleUserSearch(e.target.value)}
                  />
                  {userSearchResults.length > 0 && (
                    <div className="absolute z-[60] w-56 bg-white border border-gray-200 mt-2 rounded-lg shadow-xl max-h-48 overflow-y-auto text-left">
                      {userSearchResults.map(u => (
                        <div key={u.id} onClick={() => { setSelectedUserFilter(u); setUserSearchTerm(''); setUserSearchResults([]) }} className="p-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 text-left">
                          <p className="font-bold text-[10px] text-gray-800 text-left">{u.name}</p>
                          <p className="text-[9px] text-gray-500 text-left">CUIL: {u.cuil}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 text-left">
                  <User size={12} className="text-indigo-600 text-left"/>
                  <span className="text-[10px] font-black text-indigo-700 uppercase truncate max-w-[80px] text-left">{selectedUserFilter.name}</span>
                  <button onClick={() => setSelectedUserFilter(null)} className="text-indigo-400 hover:text-red-500 transition text-left"><XCircle size={14} className="text-left"/></button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-2 text-gray-400 border-r border-gray-100 mr-1 text-left">
                <Filter size={14} className="text-left"/>
                <span className="text-[10px] font-bold uppercase text-left">Filtros</span>
            </div>

            

            <select className="bg-gray-50 font-bold text-gray-600 outline-none text-xs cursor-pointer py-1.5 px-3 rounded-lg border border-gray-100 focus:border-indigo-300 text-left" value={sportFilter} onChange={(e) => { setSportFilter(e.target.value); setCategoryFilter('all'); }}>
                <option value="all">Todos los deportes</option>
                {dbSports.map(s => (
                    <option key={s.deporte_id} value={s.deporte_id}>{s.name}</option>
                ))}
            </select>

            <select className="bg-gray-50 font-bold text-gray-600 outline-none text-xs cursor-pointer py-1.5 px-3 rounded-lg border border-gray-100 focus:border-indigo-300 text-left" value={genderFilter} onChange={(e) => { setGenderFilter(e.target.value); setCategoryFilter('all'); }}>
                <option value="all">Todos los Sexos</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
            </select>

            <select className="bg-gray-50 font-bold text-gray-600 outline-none text-xs cursor-pointer py-1.5 px-3 rounded-lg border border-gray-100 focus:border-indigo-300 text-left" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">Todas las Categorías</option>
                {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.gender})</option>
                ))}
            </select>

            <div className="h-6 w-px bg-gray-100 mx-1 text-left"></div>

            <div className="flex items-center gap-2 text-left">
              <select className="bg-transparent font-black text-indigo-600 outline-none text-xs cursor-pointer py-1.5 px-2 text-left" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)}>
                  <option value="current">Este Mes</option>
                  <option value="last">Mes Anterior</option>
                  <option value="year">Todo el Año</option>
                  <option value="custom">Personalizado</option>
              </select>
              {dateFilter === 'custom' && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-1 text-left">
                      <input type="date" className="p-1 border border-gray-300 rounded text-[10px] font-bold outline-none focus:border-indigo-500 text-gray-900 opacity-100 text-left" value={customStart} onChange={e => setCustomStart(e.target.value)}/>
                      <span className="text-[10px] font-bold text-gray-400 text-left">al</span>
                      <input type="date" className="p-1 border border-gray-300 rounded text-[10px] font-bold outline-none focus:border-indigo-500 text-gray-900 opacity-100 text-left" value={customEnd} onChange={e => setCustomEnd(e.target.value)}/>
                  </div>
              )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-left">
              <div className="flex justify-between items-start text-left">
                  <div className="text-left">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Recaudación</p>
                      <h3 className="text-2xl font-bold text-gray-800 mt-1 text-left">${stats.revenue.toLocaleString()}</h3>
                  </div>
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg text-left"><DollarSign size={20} className="text-left"/></div>
              </div>
              <p className="text-xs text-green-600 mt-4 font-medium flex items-center gap-1 text-left">Cobrado en este periodo</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-left">
              <div className="flex justify-between items-start text-left">
                  <div className="text-left">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Morosidad</p>
                      <h3 className={`text-2xl font-bold mt-1 ${stats.debt > 0 ? 'text-red-600' : 'text-gray-400'} text-left`}>
                          ${stats.debt.toLocaleString()}
                      </h3>
                  </div>
                  <div className="p-2 bg-red-50 text-red-500 rounded-lg text-left"><AlertTriangle size={20} className="text-left"/></div>
              </div>
              <p className="text-xs text-gray-400 mt-4 font-medium text-left">Deuda neta del periodo</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-left">
              <div className="flex justify-between items-start text-left">
                  <div className="text-left">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Jugadores Morosos</p>
                      <h3 className={`text-2xl font-bold mt-1 ${stats.debtorCount > 0 ? 'text-orange-600' : 'text-gray-400'} text-left`}>
                          {stats.debtorCount}
                      </h3>
                  </div>
                  <div className="p-2 bg-orange-50 text-orange-500 rounded-lg text-left"><Users size={20} className="text-left"/></div>
              </div>
              <div className="mt-4 space-y-2 border-t border-gray-50 pt-3 text-left">
                  {stats.topDebtors.length > 0 ? (
                      stats.topDebtors.map((debtor, i) => (
                          <div key={i} className="flex justify-between items-center text-[11px] font-bold text-left">
                              <span className="text-gray-600 truncate max-w-[120px] text-left">{debtor.name}</span>
                              <span className="text-red-500 text-left">-${Math.abs(debtor.balance).toLocaleString()}</span>
                          </div>
                      ))
                  ) : (
                      <p className="text-[10px] text-gray-400 italic text-left">Sin morosidad detectada</p>
                  )}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full text-left">
              <h3 className="font-bold text-gray-700 mb-4 text-base text-left">Últimos Movimientos</h3>
              <div className="space-y-3 text-left">
                  {recentPayments.length === 0 ? <p className="text-sm text-gray-400 text-center py-8 text-left">No hay pagos registrados.</p> : recentPayments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-gray-100 text-left">
                          <div className="flex items-center gap-3 text-left">
                              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs text-left">$</div>
                              <div className="text-left"><p className="text-sm font-bold text-gray-700 text-left">{p.users?.name || 'Usuario Borrado'}</p><p className="text-xs text-gray-400 font-medium text-left">{format(parseISO(p.date), 'dd MMM - HH:mm')}</p></div>
                          </div>
                          <span className="font-bold text-green-600 text-sm text-left">+${p.amount.toLocaleString()}</span>
                      </div>
                  ))}
                  {recentPayments.length > 0 && <button onClick={() => window.location.href='/admin/payments'} className="w-full text-center text-xs text-indigo-600 font-bold mt-4 hover:text-indigo-800 uppercase tracking-wide text-left">Ver historial completo →</button>}
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full text-left">
              <div className="flex items-center gap-2 mb-4 text-gray-700 text-left"><CreditCard size={20} className="text-indigo-600 text-left"/><h3 className="font-bold text-base text-left">Caja Rápida (Efectivo)</h3></div>
              <div className="space-y-4 text-left">
                  {!quickPayUser ? (
                      <div className="relative text-left">
                          <label className="text-xs font-bold text-gray-500 uppercase ml-1 text-left">Buscar Jugador</label>
                          <div className="relative mt-1 text-left"><Search className="absolute left-3 top-3 text-gray-400 text-left" size={18}/><input type="text" placeholder="Escribí nombre o CUIL..." className="w-full pl-10 p-3 border border-gray-300 rounded-lg outline-none focus:border-indigo-500 transition font-medium text-gray-700 placeholder-gray-400 text-left" value={searchTerm} onChange={(e) => handleSearch(e.target.value)}/></div>
                          {searchResults.length > 0 && (
                              <div className="absolute z-10 w-full bg-white border border-gray-200 mt-2 rounded-lg shadow-xl max-h-48 overflow-y-auto text-left">
                                  {searchResults.map(u => (
                                      <div key={u.id} onClick={() => selectUser(u)} className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 group text-left">
                                          <div className="text-left"><p className="font-bold text-sm text-gray-800 group-hover:text-indigo-700 text-left">{u.name}</p><p className="text-xs text-gray-500 text-left">CUIL: {u.cuil}</p></div>
                                          <div className={`text-xs font-bold px-2 py-1 rounded border ${u.account_balance < 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'} text-left`}>{u.account_balance < 0 ? `Debe $${Math.abs(u.account_balance).toLocaleString()}` : 'Al día'}</div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="p-4 bg-white rounded-lg flex justify-between items-center border border-indigo-200 shadow-sm text-left">
                            <div className="flex items-center gap-3 text-left">
                                <div className="h-10 w-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg text-left">{quickPayUser.name.charAt(0)}</div>
                                <div className="text-left"><p className="font-bold text-gray-800 text-left">{quickPayUser.name}</p><p className={`text-xs font-semibold ${quickPayUser.account_balance < 0 ? 'text-red-500' : 'text-green-600'} text-left`}>Saldo actual: ${quickPayUser.account_balance.toLocaleString()}</p></div>
                            </div>
                            <button onClick={() => setQuickPayUser(null)} className="p-2 hover:bg-gray-100 text-gray-400 hover:text-red-500 rounded-lg transition text-left"><XCircle size={20} className="text-left"/></button>
                      </div>
                  )}
                  <form onSubmit={handleQuickPay} className="text-left">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1 text-left">Monto Recibido</label>
                      <div className="relative mt-1 text-left"><span className="absolute left-3 top-3 text-gray-400 font-bold text-lg text-left">$</span><input type="number" required min="1" disabled={!quickPayUser} className="w-full pl-8 p-3 border border-gray-300 rounded-lg outline-none focus:border-green-500 transition font-bold text-xl text-gray-800 placeholder-gray-300 disabled:bg-gray-50 text-left [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" value={quickPayAmount} onChange={(e) => setQuickPayAmount(e.target.value)} onWheel={(e) => (e.target as HTMLInputElement).blur()}/></div>
                      {quickPayUser && quickPayAmount && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300 text-left">
                          <p className="text-xs font-bold text-green-700 flex items-center gap-2 text-left">
<CheckCircle size={14} className="text-left"/> 
Usted está por ingresarle <span className="text-sm font-black text-left">${Number(quickPayAmount).toLocaleString()}</span> a {quickPayUser.name}                          </p>
                        </div>
                      )}
                      <button disabled={!quickPayUser || !quickPayAmount || processing} className="w-full mt-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition shadow-md uppercase tracking-wide text-sm text-left flex justify-center items-center">
                        {processing ? <Loader2 className="animate-spin text-left"/> : 'INGRESAR DINERO'}
                      </button>
                  </form>
              </div>
          </div>
      </div>

      {notification.show && (
            <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300 border-l-8 ${notification.type === 'success' ? 'bg-white border-green-500' : 'bg-white border-red-500'} text-left`}>
                <div className={`${notification.type === 'success' ? 'text-green-500' : 'text-red-500'} text-left`}>{notification.type === 'success' ? <CheckCircle size={28} className="text-left"/> : <XCircle size={28} className="text-left"/>}</div>
                <div className="text-left"><h4 className={`font-bold uppercase text-xs tracking-wider ${notification.type === 'success' ? 'text-green-600' : 'text-red-600'} text-left`}>{notification.type === 'success' ? '¡Éxito!' : 'Error'}</h4><p className="font-semibold text-gray-700 text-sm text-left">{notification.message}</p></div>
            </div>
      )}
    </div>
  )
}