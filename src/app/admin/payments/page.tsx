'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { Search, Eye, Trash2, Loader2, X, Calendar, Filter, AlertTriangle, CheckCircle, Download, ExternalLink, Trophy } from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns'

export default function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  const [deleteModal, setDeleteModal] = useState<{ show: boolean, id: string, amount: number, userId: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // DATOS PARA FILTROS DINÁMICOS
  const [dbSports, setDbSports] = useState<any[]>([])

  const [dateFilter, setDateFilter] = useState<'current' | 'last' | 'year' | 'last_year' | 'all'>('current')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [sportFilter, setSportFilter] = useState<string>('all')

  // CARGAR OPCIONES DE FILTROS AL INICIAR
  useEffect(() => {
    const initDB = async () => {
      const { data: sports } = await supabase.from('deportes').select('name').order('name')
      if (sports) setDbSports(sports)
    }
    initDB()
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [dateFilter])

  const fetchPayments = async () => {
    setLoading(true)
    try {
        const now = new Date()
        let startDate = null
        let endDate = null

        if (dateFilter === 'current') {
            startDate = startOfMonth(now).toISOString()
            endDate = endOfMonth(now).toISOString()
        } else if (dateFilter === 'last') {
            const lastMonth = subMonths(now, 1)
            startDate = startOfMonth(lastMonth).toISOString()
            endDate = endOfMonth(lastMonth).toISOString()
        } else if (dateFilter === 'year') {
            startDate = startOfYear(now).toISOString()
            endDate = now.toISOString()
        } else if (dateFilter === 'last_year') {
            startDate = new Date(now.getFullYear() - 1, 0, 1).toISOString()
            endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString()
        }

        let query = supabase
            .from('payments')
            .select('*, users!inner(name, email, cuil, gender)')
            .neq('method', 'cuota')
            .or('status.eq.approved,status.eq.completed,method.eq.adjustment')
            .order('date', { ascending: false })

        if (dateFilter !== 'all' && startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate)
        }

        const { data, error } = await query.limit(1000)
        if (error) throw error
        setPayments(data || [])
    } catch (error) {
        console.error('Error al cargar pagos:', error)
    } finally {
        setLoading(false)
    }
  }

  const executeDelete = async () => {
      if (!deleteModal) return
      setIsDeleting(true)
      const { id } = deleteModal

      try {
          const { error: deleteError } = await supabase
              .from('payments')
              .delete()
              .eq('id', id)

          if (deleteError) throw deleteError

          setDeleteModal(null)
          fetchPayments()
      } catch (error: any) {
          alert('Error al eliminar: ' + error.message)
      } finally {
          setIsDeleting(false)
      }
  }

  const getMethodLabel = (method: string) => {
      const m = method?.toLowerCase() || ''
      if (m.includes('transfer')) return { text: 'Transferencia', color: 'text-green-700 bg-green-50 border-green-200' }
      if (m.includes('cash') || m.includes('efectivo')) return { text: 'Efectivo', color: 'text-green-700 bg-green-50 border-green-200' }
      if (m.includes('adjust') || m.includes('ajuste')) return { text: 'Ajuste Manual', color: 'text-blue-700 bg-blue-50 border-blue-200' }
      return { text: 'Efectivo', color: 'text-green-700 bg-green-50 border-green-200' }
  }

  const handleViewReceipt = async (proofUrl: string) => {
    if (!proofUrl) return;
    
    const path = proofUrl.split('receipts/').pop(); 
    
    if (path) {
        const { data, error } = await supabase.storage
            .from('receipts')
            .createSignedUrl(path, 3600); 
        
        if (data?.signedUrl) {
            setPreviewUrl(data.signedUrl);
        } else {
            setPreviewUrl(proofUrl);
        }
    } else {
        setPreviewUrl(proofUrl);
    }
  };

  const filteredPayments = payments.filter(p => {
      const user = Array.isArray(p.users) ? p.users[0] : p.users
      const name = user?.name?.toLowerCase() || ''
      const cuil = user?.cuil || ''
      
      const historicCategory = p.category_snapshot || ''
      const historicSport = p.sport_snapshot || ''
      
      const genderRaw = user?.gender ? String(user.gender).toLowerCase().trim() : ''
      const methodRaw = p.method?.toLowerCase() || ''

      const matchesSearch = name.includes(searchTerm.toLowerCase()) || cuil.includes(searchTerm)
      
      // Filtros por inclusión para abarcar selecciones múltiples guardadas con "/"
      const matchesSport = sportFilter === 'all' || historicSport.includes(sportFilter)
      
      const matchesGender = genderFilter === 'all' || 
        (genderFilter === 'Femenino' && (genderRaw === 'femenino' || genderRaw === 'female' || genderRaw === 'f')) ||
        (genderFilter === 'Masculino' && (genderRaw === 'masculino' || genderRaw === 'male' || genderRaw === 'm'))

      let matchesMethod = methodFilter === 'all'
      if (methodFilter === 'cash') matchesMethod = methodRaw.includes('cash') || methodRaw.includes('efectivo')
      if (methodFilter === 'transfer') matchesMethod = methodRaw.includes('transfer')
      if (methodFilter === 'adjustment') matchesMethod = methodRaw.includes('adjust') || methodRaw.includes('ajuste')

      return matchesSearch  && matchesGender && matchesMethod && matchesSport
  })

  const exportToExcel = () => {
      const headers = ['Fecha', 'Jugador', 'CUIL', 'Detalle', 'Deportes', 'Metodo', 'Monto'].join(';');
      const rows = filteredPayments.map(p => {
          const user = Array.isArray(p.users) ? p.users[0] : p.users;
          const date = format(parseISO(p.date), 'dd/MM/yyyy');
          const method = getMethodLabel(p.method).text;
          const category = p.category_snapshot || '-';
          const sports = p.sport_snapshot || '-';
          const name = user?.name || '';
          const cuil = user?.cuil || '';
          return [date, name.replace(/;/g, ''), cuil, category, sports, method, p.amount].join(';');
      }).join('\n');

      const content = headers + '\n' + rows;
      const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Planilla_Pagos_${format(new Date(), 'dd-MM-yyyy')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
  };

  const totalRevenue = filteredPayments
    .filter(p => p.amount > 0 && p.method !== 'adjustment')
    .reduce((acc, curr) => acc + curr.amount, 0)

  return (
    <div className="space-y-6 min-h-screen pb-10 font-sans text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="text-left w-full md:w-auto">
            <h1 className="text-2xl font-bold text-gray-900">Historial de Pagos</h1>
            <p className="text-gray-500 text-sm mt-1">
                Total recaudado: <span className="text-green-600 font-bold">${totalRevenue.toLocaleString()}</span>
            </p>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={exportToExcel} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition shadow-sm">
                <Download size={18} /><span className="hidden md:inline">Exportar Excel</span>
            </button>
            <div className="bg-white border border-gray-300 rounded-lg flex items-center px-3 py-2 shadow-sm hover:border-gray-400 transition">
                <Calendar size={16} className="text-gray-500 mr-2"/><select className="bg-transparent font-bold text-gray-700 outline-none text-sm cursor-pointer pr-2" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)}>
                    <option value="current">Este Mes</option><option value="last">Mes Pasado</option><option value="year">Todo el Año</option><option value="last_year">Año Pasado</option><option value="all">Todo el Historial</option>
                </select>
            </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-3 text-gray-500" size={18} /><input type="text" className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-gray-900 placeholder-gray-500" placeholder="Buscar por nombre o CUIL..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
                      <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="bg-transparent text-xs font-bold text-gray-600 outline-none cursor-pointer">
                          <option value="all">Sexo</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option>
                      </select>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
                      <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="bg-transparent text-xs font-bold text-gray-600 outline-none cursor-pointer">
                          <option value="all">Modalidad</option>
                          <option value="cash">Efectivo</option>
                          <option value="transfer">Transferencia</option>
                          <option value="adjustment">Ajuste Manual</option>
                      </select>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
                      <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)} className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer">
                          <option value="all">Todos los deportes</option>
                          {dbSports.map(s => (
                              <option key={s.name} value={s.name}>{s.name}</option>
                          ))}
                      </select>
                  </div>
                  <div className="px-4 py-2 bg-indigo-50 text-xs font-bold text-indigo-600 rounded-lg border border-indigo-100">{filteredPayments.length} Registros</div>
              </div>
          </div>
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
              <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="p-4">Fecha</th><th className="p-4">Jugador</th><th className="p-4">Detalle / Deportes</th><th className="p-4">Método</th><th className="p-4 text-right">Monto</th><th className="p-4 text-center">Acciones</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {loading ? (<tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600"/></td></tr>) : filteredPayments.length === 0 ? (<tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm">No se encontraron pagos.</td></tr>) : (
                      filteredPayments.map((payment) => {
                          const user = Array.isArray(payment.users) ? payment.users[0] : payment.users;
                          const style = getMethodLabel(payment.method);
                          const isPositive = payment.amount > 0;
                          
                          const amountColor = payment.method === 'adjustment' ? 'text-blue-600' : 'text-green-600';
                          
                          const rawGender = user?.gender ? String(user.gender).toUpperCase().trim() : '';
                          const isMale = rawGender.startsWith('M');
                          const hasGender = rawGender.length > 0;
                          const showEye = payment.method?.toLowerCase().includes('transfer') && payment.proof_url;
                          const historicSport = payment.sport_snapshot || '-';

                          return (
                              <tr key={payment.id} className="hover:bg-gray-50 transition">
                                  <td className="p-4 text-xs font-medium text-gray-500">{format(parseISO(payment.date), 'dd/MM/yyyy')}</td>
                                  <td className="p-4">
                                      <p className="font-bold text-gray-900 text-sm">{user?.name || 'Usuario Eliminado'}</p>
                                      <p className="text-xs text-gray-400">{user?.email}</p>
                                  </td>
                                  <td className="p-4">
                                      <div className="flex flex-col gap-1">
                                        <div className="flex gap-1 flex-wrap">
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold border border-gray-200">{payment.category_snapshot || '-'}</span>
                                            {hasGender && (<span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isMale ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-pink-50 text-pink-600 border-pink-100'}`}>{isMale ? 'M' : 'F'}</span>)}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-semibold italic">
                                            <Trophy size={10} className="text-amber-500"/> {historicSport}
                                        </div>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <div className="flex items-center gap-2">
                                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${style.color}`}>{style.text}</span>
                                          {showEye && (
                                              <button onClick={() => handleViewReceipt(payment.proof_url)} className="text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 p-1 rounded-full"><Eye size={14}/></button>
                                          )}
                                      </div>
                                  </td>
<td className={`p-4 text-right font-black text-sm ${amountColor}`}>{isPositive ? '+' : '-'}${Math.abs(payment.amount).toLocaleString()}</td>
<td className="p-4 text-center">
                                      <button onClick={() => setDeleteModal({ show: true, id: payment.id, amount: payment.amount, userId: payment.user_id })} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={16}/></button>
                                  </td>
                              </tr>
                          )
                      })
                  )}
              </tbody>
          </table>
      </div>

      {/* VERSION MOBILE */}
      <div className="md:hidden space-y-4">
        {loading ? (<div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600"/></div>) : filteredPayments.length === 0 ? (<div className="p-8 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200">No se encontraron pagos.</div>) : (
          filteredPayments.map((payment) => {
            const user = Array.isArray(payment.users) ? payment.users[0] : payment.users;
            const style = getMethodLabel(payment.method);
            const isPositive = payment.amount > 0;
            
            const amountColor = payment.method === 'adjustment' ? 'text-blue-600' : 'text-green-600';
            
            const rawGender = user?.gender ? String(user.gender).toUpperCase().trim() : '';
            const isMale = rawGender.startsWith('M');
            const hasGender = rawGender.length > 0;
            const showEye = payment.method?.toLowerCase().includes('transfer') && payment.proof_url;
            const historicSport = payment.sport_snapshot || '-';

            return (
              <div key={payment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3 text-left">
                <div className="flex justify-between items-start">
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{format(parseISO(payment.date), 'dd/MM/yyyy')}</p>
                    <h3 className="font-bold text-gray-900 text-sm leading-tight mt-0.5">{user?.name || 'Usuario Eliminado'}</h3>
                  </div>
<div className={`text-right font-black text-base ${amountColor}`}>{isPositive ? '+' : '-'}${Math.abs(payment.amount).toLocaleString()}</div>                </div>
                <div className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                    <Trophy size={10} className="text-amber-500"/> {historicSport}
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5">
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-white text-gray-600 rounded text-[10px] font-bold border border-gray-200">{payment.category_snapshot || '-'}</span>
                    {hasGender && (<span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isMale ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-pink-50 text-pink-600 border-pink-100'}`}>{isMale ? 'M' : 'F'}</span>)}
                    <span className={`px-2 py-1 rounded text-[10px] font-bold border ${style.color}`}>{style.text}</span>
                  </div>
                  <div className="flex gap-2">
                    {showEye && (<button onClick={() => handleViewReceipt(payment.proof_url)} className="text-indigo-600 bg-white border border-indigo-100 p-1.5 rounded-lg shadow-sm"><Eye size={16}/></button>)}
                    <button onClick={() => setDeleteModal({ show: true, id: payment.id, amount: payment.amount, userId: payment.user_id })} className="text-gray-400 bg-white border border-gray-100 p-1.5 rounded-lg shadow-sm"><Trash2 size={16}/></button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setPreviewUrl(null)}>
            <div className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 text-left">
                    <h3 className="font-bold text-gray-900 text-sm uppercase">Comprobante</h3>
                    <div className="flex items-center gap-4">
                        <a href={previewUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 text-xs font-bold bg-indigo-50 px-2 py-1 rounded"><ExternalLink size={12}/> Abrir original</a>
                        <button onClick={() => setPreviewUrl(null)} className="p-1 hover:bg-gray-200 rounded-full transition"><X size={20}/></button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center">
                    <img src={previewUrl} className="max-w-full max-h-full object-contain rounded-lg shadow-sm" alt="Comprobante"/>
                </div>
            </div>
        </div>
      )}

      {deleteModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 text-center">
                <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={32}/></div>
                    <h3 className="text-xl font-black text-gray-900 mb-2 uppercase italic tracking-tight">¿Eliminar Pago?</h3>
                    <p className="text-gray-500 text-sm mb-6 font-medium">Esta acción borrará el registro y ajustará el saldo automáticamente.</p>
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <button disabled={isDeleting} onClick={() => setDeleteModal(null)} className="py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition text-sm text-center">Cancelar</button>
                        <button disabled={isDeleting} onClick={executeDelete} className="py-3 px-4 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition flex justify-center items-center gap-2 text-sm text-center">{isDeleting ? <Loader2 className="animate-spin h-4 w-4"/> : 'Sí, Eliminar'}</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}