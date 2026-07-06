'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { Check, X, Loader2, Calendar, FileText, AlertTriangle, CheckCircle, XCircle, ExternalLink, CreditCard } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function InboxPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image')
  const [processing, setProcessing] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, type: 'approve' | 'reject', item: any } | null>(null)
  const [rejectModal, setRejectModal] = useState<{ show: boolean, item: any } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [notification, setNotification] = useState<{ show: boolean, type: 'success' | 'error', message: string }>({ show: false, type: 'success', message: '' })

  const [duplicateMap, setDuplicateMap] = useState<Record<string, { userName: string, date: string, status: string }>>({})
  const [playerInfoMap, setPlayerInfoMap] = useState<Record<string, { balance: number, lastPaymentDate: string | null, lastPaymentAmount: number | null }>>({})

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`*, users (name, payer_name, payer_cuil)`)
        .eq('status', 'pending')
        .order('date', { ascending: false })

      if (error) throw error
      const pending = data || []
      setReviews(pending)

      // Detectar duplicados: dentro de la bandeja + en pagos anteriores
      const hashes = pending.map(r => r.file_hash).filter(Boolean)
      if (hashes.length > 0) {
        const map: Record<string, { userName: string, date: string, status: string }> = {}

        // 1. Duplicados dentro de la propia bandeja (dos pendientes con mismo hash)
        const seenInBox: Record<string, { userName: string, date: string, status: string }> = {}
        pending.forEach(r => {
          if (!r.file_hash) return
          if (seenInBox[r.file_hash]) {
            map[r.file_hash] = seenInBox[r.file_hash]
          } else {
            seenInBox[r.file_hash] = { userName: r.users?.name || 'otro socio', date: r.date, status: 'pending' }
          }
        })

        // 2. Duplicados contra pagos ya procesados (aprobados/rechazados)
        const pendingIds = pending.map(r => r.id)
        const { data: dupes } = await supabase
          .from('payments')
          .select('file_hash, status, date, users(name)')
          .in('file_hash', hashes)
          .not('id', 'in', `(${pendingIds.join(',')})`)

        dupes?.forEach((d: any) => {
          if (d.file_hash && !map[d.file_hash]) {
            map[d.file_hash] = { userName: d.users?.name || 'otro socio', date: d.date, status: d.status }
          }
        })

        setDuplicateMap(map)
      } else {
        setDuplicateMap({})
      }

      // Cargar saldo y último pago aprobado de cada socio en bandeja
      const userIds = [...new Set(pending.map(r => r.user_id).filter(Boolean))]
      if (userIds.length > 0) {
        const [{ data: usersData }, { data: lastPayments }] = await Promise.all([
          supabase.from('users').select('id, account_balance').in('id', userIds),
          supabase.from('payments').select('user_id, date, amount').in('status', ['approved', 'completed']).in('method', ['cash', 'transfer']).in('user_id', userIds).order('date', { ascending: false })
        ])

        const infoMap: Record<string, { balance: number, lastPaymentDate: string | null, lastPaymentAmount: number | null }> = {}
        userIds.forEach(uid => {
          const u = usersData?.find((x: any) => x.id === uid)
          const lp = lastPayments?.find((x: any) => x.user_id === uid)
          infoMap[uid] = {
            balance: u?.account_balance ?? 0,
            lastPaymentDate: lp?.date || null,
            lastPaymentAmount: lp?.amount || null
          }
        })
        setPlayerInfoMap(infoMap)
      }
    } catch (err) {
      console.error("Error al cargar pagos:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReviews() }, [])

  const executeAction = async () => {
    if (!confirmModal) return
    setProcessing(true)
    const { type, item } = confirmModal

    try {
      if (type === 'approve') {
        const { error: updateError } = await supabase
          .from('payments')
          .update({ status: 'approved' })
          .eq('id', item.id)
          .eq('status', 'pending')

        if (updateError) throw updateError

        showToast(`¡Pago de ${item.users?.name} aprobado!`, 'success')
      } else {
        const updateData: any = { status: 'rejected' }
        if (rejectReason.trim()) updateData.notes = `Rechazado: ${rejectReason.trim()}`
        const { error: rejectError } = await supabase
          .from('payments')
          .update(updateData)
          .eq('id', item.id)

        if (rejectError) throw rejectError

        setRejectReason('')
        showToast('Comprobante rechazado.', 'error')
      }

      setReviews(reviews.filter(r => r.id !== item.id))
      setConfirmModal(null)
    } catch (error: any) {
      showToast('Error: ' + error.message, 'error')
    } finally {
      setProcessing(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000)
  }

  const openPreview = async (url: string) => {
    if (!url) return
    const isPdf = url.toLowerCase().includes('.pdf')
    setFileType(isPdf ? 'pdf' : 'image')

    try {
      const path = url.split('receipts/').pop()
      if (path) {
        const { data } = await supabase.storage
          .from('receipts')
          .createSignedUrl(path, 3600)

        if (data?.signedUrl) {
          setPreviewUrl(data.signedUrl)
        } else {
          setPreviewUrl(url)
        }
      } else {
        setPreviewUrl(url)
      }
    } catch (err) {
      console.error("Error al generar vista previa:", err)
      setPreviewUrl(url)
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>

  const suspiciousReviews = reviews.filter(r => {
    const amt = Number(r.amount)
    return amt === 0 || amt < 1000 || amt > 1000000
  })

  return (
    <div className="space-y-6 relative min-h-screen text-left">
      <h1 className="text-3xl font-bold text-gray-900 text-left uppercase italic">Bandeja de Entrada</h1>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-gray-500 font-medium text-left">Comprobantes pendientes de revisión.</p>
        {reviews.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 bg-indigo-600 text-white text-xs font-black rounded-full shadow-sm">
            {reviews.length}
          </span>
        )}
      </div>

      {suspiciousReviews.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black text-red-800 uppercase tracking-wide">
              Montos sospechosos en bandeja
            </p>
            <p className="text-xs text-red-700 font-medium">
              Los siguientes comprobantes tienen un monto de $0, menor a $1.000 o mayor a $1.000.000. Verificá antes de aprobar.
            </p>
            <ul className="mt-2 space-y-1">
              {suspiciousReviews.map(r => (
                <li key={r.id} className="flex items-center gap-2 text-xs font-bold text-red-900">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {r.users?.name || 'Socio desconocido'}
                  <span className="font-black text-red-600">— ${Number(r.amount).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border-2 border-dashed border-gray-300">
          <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3"><Check size={24}/></div>
          <h3 className="text-lg font-bold text-gray-900">¡Todo al día!</h3>
          <p className="text-gray-500">No hay comprobantes pendientes.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => {
            // Lógica para procesar pagadores
            const payerNames = review.users?.payer_name ? review.users.payer_name.split(' / ') : [];
            const payerCuils = review.users?.payer_cuil ? review.users.payer_cuil.split(' / ') : [];
            const isSuspicious = Number(review.amount) === 0 || Number(review.amount) < 1000 || Number(review.amount) > 1000000;
            const isDuplicate = !!duplicateMap[review.file_hash];

            let cardBorder = 'border border-gray-200';
            if (isDuplicate && isSuspicious) cardBorder = 'border-2 border-red-400 ring-2 ring-yellow-300';
            else if (isDuplicate) cardBorder = 'border-2 border-red-400';
            else if (isSuspicious) cardBorder = 'border-2 border-yellow-400';

            return (
              <div key={review.id} className={`rounded-xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition text-left ${isSuspicious ? 'bg-yellow-50' : 'bg-white'} ${cardBorder}`}>
                {isDuplicate && (
                  <div className="bg-red-500 px-4 py-2 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-white flex-shrink-0" />
                    <p className="text-white text-[10px] font-black uppercase tracking-wide">
                      Comprobante duplicado — este archivo ya fue subido por {duplicateMap[review.file_hash].userName} ({duplicateMap[review.file_hash].status === 'approved' ? 'aprobado' : duplicateMap[review.file_hash].status === 'rejected' ? 'rechazado' : 'pendiente'} el {format(parseISO(duplicateMap[review.file_hash].date), 'dd/MM')})
                    </p>
                  </div>
                )}
                {isSuspicious && (
                  <div className="bg-yellow-400 px-4 py-2 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-yellow-900 flex-shrink-0" />
                    <p className="text-yellow-900 text-[10px] font-black uppercase tracking-wide">
                      Monto sospechoso — verificá antes de aprobar
                    </p>
                  </div>
                )}
                <div className={`p-4 border-b flex justify-between items-start ${isSuspicious ? 'bg-yellow-100' : 'bg-gray-50'}`}>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900 text-left">{review.users?.name || 'Socio'}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 font-bold">
                      <Calendar size={12}/> {format(parseISO(review.date), 'dd/MM HH:mm')}
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-700 text-xs font-black px-2 py-1 rounded-md">
                    ${Number(review.amount).toLocaleString()}
                  </span>
                </div>

                {/* BARRA AZUL DE PAGADORES */}
                {payerNames.length > 0 && (
                  <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 space-y-1 text-left">
                    <p className="text-[10px] font-black text-indigo-700 uppercase tracking-tight flex items-center gap-1.5 mb-1 text-left">
                      <CreditCard size={12}/> Pagadores registrados:
                    </p>
                    {payerNames.map((name: string, idx: number) => (
                      <div key={idx} className="text-[9px] font-bold text-indigo-600 border-l-2 border-indigo-200 pl-2 ml-1 text-left">
                        <span className="uppercase">{name}</span>
                        <span className="text-indigo-400 block text-left font-medium">CUIL: {payerCuils[idx] || 'Sin CUIL'}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-12 flex-1 flex items-center justify-center bg-white border-b border-gray-100">
                  <button
                    onClick={() => openPreview(review.proof_url)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 hover:border-indigo-300 transition-all shadow-sm text-sm"
                  >
                    <FileText size={18} className="text-gray-500" />
                    Ver Comprobante
                  </button>
                </div>

                {playerInfoMap[review.user_id] && (
                  <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between gap-4">
                    <div className="text-left">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide">Saldo actual</p>
                      <p className={`text-[11px] font-black ${playerInfoMap[review.user_id].balance < 0 ? 'text-red-500' : playerInfoMap[review.user_id].balance === 0 ? 'text-gray-400' : 'text-green-600'}`}>
                        {playerInfoMap[review.user_id].balance < 0 ? '-' : playerInfoMap[review.user_id].balance > 0 ? '+' : ''}${Math.abs(playerInfoMap[review.user_id].balance).toLocaleString()}
                      </p>
                    </div>
                    {playerInfoMap[review.user_id].lastPaymentDate && (
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide">Último pago aprobado</p>
                        <p className="text-[11px] font-black text-gray-600">
                          {format(parseISO(playerInfoMap[review.user_id].lastPaymentDate!), 'dd/MM/yy')} — ${playerInfoMap[review.user_id].lastPaymentAmount?.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-3 grid grid-cols-2 gap-3 bg-gray-50/50">
                  <button
                    onClick={() => { setRejectReason(''); setRejectModal({ show: true, item: review }) }}
                    className="flex items-center justify-center gap-2 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition text-sm"
                  >
                    <X size={18}/> Rechazar
                  </button>
                  <button
                    onClick={() => setConfirmModal({ show: true, type: 'approve', item: review })}
                    className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition text-sm"
                  >
                    <Check size={18}/> Aprobar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL MOTIVO DE RECHAZO */}
      {rejectModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 text-left border-t-8 border-red-500">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle size={32} className="text-red-600"/>
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase italic">¿Rechazar Pago?</h3>
              <p className="text-gray-500 text-sm mt-1 font-medium">Socio: <strong>{rejectModal.item.users?.name}</strong></p>
            </div>
            <div className="space-y-2 mb-6">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Motivo del rechazo <span className="text-gray-400 font-medium normal-case">(opcional)</span></label>
              <textarea
                rows={3}
                autoFocus
                placeholder="Ej: Comprobante ilegible, monto incorrecto..."
                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-sm text-gray-900 resize-none"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition uppercase text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setRejectModal(null)
                  setConfirmModal({ show: true, type: 'reject', item: rejectModal.item })
                }}
                className="py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition uppercase text-xs"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALES Y DEMÁS COMPONENTES SE MANTIENEN IGUAL --- */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 text-left border-t-8 border-indigo-600">
            <div className="flex flex-col items-center text-center">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${confirmModal.type === 'approve' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {confirmModal.type === 'approve' ? <CheckCircle size={32}/> : <AlertTriangle size={32}/>}
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase italic">
                {confirmModal.type === 'approve' ? '¿Confirmar Pago?' : '¿Rechazar Pago?'}
              </h3>
              <p className="text-gray-500 text-sm mb-6 font-medium">
                Socio: <strong>{confirmModal.item.users?.name}</strong><br/>
                Monto: <strong>${confirmModal.item.amount.toLocaleString()}</strong>
              </p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button disabled={processing} onClick={() => setConfirmModal(null)} className="py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition uppercase text-xs">Cancelar</button>
                <button
                  disabled={processing}
                  onClick={executeAction}
                  className={`py-3 px-4 text-white font-bold rounded-xl shadow-lg transition flex justify-center items-center gap-2 uppercase text-xs ${confirmModal.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {processing ? <Loader2 className="animate-spin" size={16}/> : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setPreviewUrl(null)}>
          <div className="relative bg-white rounded-xl max-w-4xl w-full h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <span className="font-black text-sm uppercase text-gray-700">Comprobante de Pago</span>
              <button onClick={() => setPreviewUrl(null)} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20}/></button>
            </div>
            <div className="flex-1 bg-gray-100 p-4 overflow-auto flex justify-center">
              {fileType === 'image' ? (
                <img src={previewUrl} alt="Comprobante" className="max-w-full object-contain shadow-lg rounded-lg" />
              ) : (
                <iframe src={previewUrl} className="w-full h-full rounded-lg" title="Comprobante" />
              )}
            </div>
          </div>
        </div>
      )}

      {notification.show && (
        <div className="fixed bottom-8 right-8 z-[60] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 border-l-8 bg-white border-green-500 text-left">
          <div className={`${notification.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
            {notification.type === 'success' ? <CheckCircle size={28} /> : <XCircle size={28} />}
          </div>
          <div className="text-left">
            <h4 className={`font-black uppercase text-xs tracking-wider ${notification.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {notification.type === 'success' ? '¡Éxito!' : 'Atención'}
            </h4>
            <p className="font-bold text-gray-800 text-sm">{notification.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
