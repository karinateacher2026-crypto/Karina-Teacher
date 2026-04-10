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
  const [notification, setNotification] = useState<{ show: boolean, type: 'success' | 'error', message: string }>({ show: false, type: 'success', message: '' })

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`*, users (name, payer_name, payer_cuil)`)
        .eq('status', 'pending')
        .order('date', { ascending: false })
      
      if (error) throw error
      setReviews(data || [])
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

        if (updateError) throw updateError
        showToast(`¡Pago de ${item.users?.name} aprobado!`, 'success')
      } else {
        const { error: rejectError } = await supabase
          .from('payments')
          .update({ status: 'rejected' })
          .eq('id', item.id)
        
        if (rejectError) throw rejectError
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

  return (
    <div className="space-y-6 relative min-h-screen text-left">
      <h1 className="text-3xl font-bold text-gray-900 text-left uppercase italic">Bandeja de Entrada</h1>
      <p className="text-gray-500 font-medium text-left">Comprobantes pendientes de revisión.</p>
      
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

            return (
              <div key={review.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition text-left">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-start">
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

                <div className="p-3 grid grid-cols-2 gap-3 bg-gray-50/50">
                  <button 
                    onClick={() => setConfirmModal({ show: true, type: 'reject', item: review })}
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