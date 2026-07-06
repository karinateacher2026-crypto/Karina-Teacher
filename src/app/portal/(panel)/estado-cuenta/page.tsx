'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { CLIENT_CONFIG } from '@/conf/clientConfig';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Loader2, Clock, RotateCw, XCircle, Settings, 
  ArrowDownLeft, ArrowUpRight, Eye, X, ExternalLink, CreditCard
} from 'lucide-react';

export default function EstadoCuentaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [userSportsInfo, setUserSportsInfo] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image');

  const fetchPageData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/portal');
        return;
      }

      const storedId = session.user.id;

      // 1. Obtener datos clave del usuario (saldo, nombre)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', storedId)
        .single();
      
      if (userError || !userData) throw new Error('No se encontró el usuario');
      setUser(userData);

      // 2. Obtener categorías y deportes del socio asignados
      const { data: relData } = await supabase
        .from('user_categories')
        .select(`
          category_id,
          deporte_id,
          deportes!deporte_id ( name ),
          categories ( name )
        `)
        .eq('user_id', storedId);

      if (relData) {
        const formatted = relData.map((item: any) => ({
          sport: item.deportes?.name || 'S/D',
          category: item.categories?.name || 'S/D'
        }));
        setUserSportsInfo(formatted);
      }

      // 3. Obtener el historial de pagos del socio
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', storedId)
        .order('date', { ascending: false });
      
      setPayments(paymentsData || []);

    } catch (error) {
      console.error('Error al cargar la información del estado de cuenta:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const handleOpenPreview = async (url: string) => {
    if (!url) return;
    const isPdf = url.toLowerCase().includes('.pdf');
    setFileType(isPdf ? 'pdf' : 'image');
    
    try {
      const path = url.split('receipts/').pop();
      if (path) {
        const { data } = await supabase.storage
          .from('receipts')
          .createSignedUrl(path, 3600);
        if (data?.signedUrl) {
          setPreviewUrl(data.signedUrl);
          return;
        }
      }
      setPreviewUrl(url);
    } catch (err) {
      setPreviewUrl(url);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12 min-h-[50vh]">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (!user) return null;

  const visualBalance = user?.account_balance || 0;
  const displayedPayments = showAllPayments ? payments : payments?.slice(0, 5);

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 text-left">
      {/* SECCIÓN BIENVENIDA */}
      <div className="mb-6 text-left">
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase">
          HOLA, {
            user.first_name || 
            (user.name?.includes(',') 
              ? user.name.split(',')[1].trim().split(' ')[0] 
              : user.name?.split(' ')[1] || user.name?.split(' ')[0])
          }
        </h2>
        <p className="text-gray-500 text-sm">Bienvenido a tu panel personal.</p>
      </div>              
      
      {/* TARGETA DE BALANCE GLOBAL */}
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-8 mb-8 relative overflow-hidden text-left">
        <div className={`absolute left-0 top-0 bottom-0 w-2 ${visualBalance < 0 ? 'bg-red-500' : (visualBalance === 0 ? 'bg-gray-300' : 'bg-green-500')} text-left`}></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
            {/* Contenedor del Estado de Cuenta + Botón Pagar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left w-full md:w-auto">
                <div className="text-left">
                    <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-2 text-left">ESTADO DE CUENTA (CONFIRMADO)</p>
                    <h3 className={`text-2xl md:text-4xl font-black break-words text-left ${visualBalance < 0 ? 'text-red-600' : (visualBalance === 0 ? 'text-gray-400' : 'text-green-600')} text-left`}>
                        {visualBalance < 0 ? 'Debe: ' : (visualBalance === 0 ? 'Saldo: ' : 'A favor: ')} 
                        ${Math.abs(visualBalance).toLocaleString()}
                    </h3>
                </div>

                {/* BOTÓN PAGAR: Solo aparece si está en rojo (debe) */}
                {visualBalance < 0 && (
                    <button
                        onClick={() => router.push('/portal/informar-pago')}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-sm transition-all duration-200 group active:scale-95 sm:mt-5 w-full sm:w-auto"
                    >
                        <CreditCard size={14} className="group-hover:animate-pulse" />
                        <span>Pagar</span>
                        <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                )}
            </div>

            <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto text-left">
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase text-left mb-2">TU CATEGORÍA</p>
              <div className="flex flex-wrap gap-4 md:justify-end">
                {userSportsInfo.length > 0 ? userSportsInfo.map((info, idx) => (
                  <div key={idx} className="flex flex-col border-l-2 border-orange-500 pl-3 md:border-l-0 md:border-r-2 md:pl-0 md:pr-3 text-left md:text-right">
                    <span className="text-[10px] font-black text-indigo-900 uppercase leading-none mb-1">{info.sport}</span>
                    <span className="text-sm md:text-lg font-black text-gray-800 leading-tight">{info.category}</span>
                  </div>
                )) : (
                  <p className="text-sm font-black text-gray-400 italic text-left">Sin categorías asignadas</p>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* RECUADRO DE MOVIMIENTOS */}
      <div className="w-full max-w-5xl text-left">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
          <h3 className="text-sm font-black text-gray-500 uppercase flex items-center gap-2 text-left">
              <Clock size={16}/> {showAllPayments ? 'Historial Completo' : 'Últimos Movimientos'}
          </h3>
          
          <div className="flex gap-2">
            {payments?.length > 5 && (
              <button 
                  onClick={() => setShowAllPayments(!showAllPayments)} 
                  className="flex items-center gap-2 text-[10px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all active:scale-95 border border-gray-200"
              >
                  {showAllPayments ? 'VER MENOS' : 'VER TODOS'}
              </button>
            )}
            
            <button 
                onClick={() => fetchPageData()} 
                className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all active:scale-95 border border-indigo-100"
            >
                <RotateCw size={12} />
                ACTUALIZAR
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-left">
          {displayedPayments?.length > 0 ? (
              <div className="divide-y divide-gray-100 text-left">
                  {displayedPayments.map((p) => {
                      const isAdjustment = p.method === 'adjustment';
                      const isDebit = p.amount < 0;
                      const isPending = p.status === 'pending';
                      const isRejected = p.status === 'rejected';
                      const isFee = p.method === 'cuota';
                      const hasProof = p.method === 'transfer' && p.proof_url;

                      let displayTitle = '';
                      if (isAdjustment) {
                          displayTitle = 'Ajuste Administrativo';
                      } else if (isFee) {
                          displayTitle = p.proof_url || 'Cuota Mensual';
                      } else if (p.method === 'transfer') {
                          displayTitle = 'Pago (Transferencia)';
                      } else if (p.method === 'cash') {
                          displayTitle = 'Pago (Efectivo)';
                      } else {
                          displayTitle = 'Pago';
                      }

                      let amountColor = '';
                      if (isRejected) {
                          amountColor = 'text-gray-400';
                      } else if (isFee) {
                          amountColor = 'text-red-600';
                      } else if (isPending) {
                          amountColor = 'text-orange-500';
                      } else if (isAdjustment) {
                          amountColor = 'text-blue-600';
                      } else if (isDebit) {
                          amountColor = 'text-red-500';
                      } else {
                          amountColor = 'text-green-500';
                      }

                      return (
                          <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition gap-3 text-left">
                            <div className="flex flex-1 items-center gap-3 md:gap-4 min-w-0 text-left">
                                <div className={`h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center shrink-0 ${isRejected ? 'bg-gray-100 text-gray-400' : isAdjustment ? 'bg-blue-100 text-blue-600' : (isDebit || isFee ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600')} text-left`}>
                                    {isRejected ? <XCircle size={16} /> : isAdjustment ? <Settings size={16} /> : (isDebit || isFee ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />)}
                                </div>
                                
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="font-bold text-xs md:text-sm text-gray-800 whitespace-normal break-words text-left">
                                        {displayTitle}
                                    </p>
                                    {isAdjustment && p.notes && (
                                        <p className="text-[10px] text-blue-500 italic font-medium truncate max-w-[200px]">{p.notes}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-0.5 text-left">
                                        <p className="text-[10px] text-gray-500 font-medium text-left">{format(parseISO(p.date), 'dd/MM/yy', { locale: es })}</p>
                                        {isPending && <span className="text-orange-500 text-[9px] font-bold uppercase tracking-wider text-left">Pendiente</span>}
                                        {isRejected && <span className="text-gray-400 text-[9px] font-bold uppercase tracking-wider text-left">Rechazado</span>}
                                        {isRejected && p.notes && <span className="text-red-400 text-[9px] font-medium italic text-left">— {p.notes.replace(/^Rechazado:\s*/i, '')}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 md:gap-6 shrink-0 text-left">
                                <p className={`text-sm md:text-base font-black text-left ${amountColor}`}>
                                    {isDebit || isFee ? '-' : '+'}${Math.abs(p.amount).toLocaleString()}
                                </p>
                                {hasProof && p.method === 'transfer' && (
                                    <button onClick={() => handleOpenPreview(p.proof_url)} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition text-left"><Eye size={18} /></button>
                                )}
                            </div>
                          </div>
                      );
                  })}
              </div>
          ) : ( 
            <div className="p-8 text-center text-gray-400 text-[10px] uppercase font-bold text-left">Sin movimientos registrados</div> 
          )}
        </div>
      </div>

      {/* MODAL DETALLE COMPROBANTE COMPARTIDO */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 md:p-4 backdrop-blur-sm text-left" onClick={() => setPreviewUrl(null)}>
            <div className={`relative bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] w-full text-left ${fileType === 'pdf' ? 'max-w-4xl h-[80vh]' : 'max-w-5xl h-auto'}`} onClick={e => e.stopPropagation()}>
                <div className="p-3 bg-gray-50 border-b flex justify-between items-center shrink-0 text-left">
                     <div className="flex items-center gap-3 text-left">
                       <h3 className="font-bold text-gray-800 text-[10px] md:text-sm uppercase text-left">Comprobante</h3>
                       <a href={previewUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 text-[9px] md:text-xs font-bold bg-indigo-50 px-2 py-1 rounded text-left"><ExternalLink size={12}/> Abrir original</a>
                     </div>
                    <button onClick={() => setPreviewUrl(null)} className="p-1.5 text-gray-600 hover:bg-gray-300 rounded-full transition text-left"><X size={20} /></button>
                </div>
                <div className="flex-1 bg-gray-200 relative flex items-center justify-center p-2 overflow-auto text-left">
                    {fileType === 'image' ? <img src={previewUrl} className="max-w-full max-h-[85vh] object-contain rounded shadow-sm bg-white text-left" alt="Comprobante" /> : <iframe src={previewUrl} className="w-full h-full border-0 rounded bg-white shadow-sm text-left" title="PDF Comprobante" />}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}