'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { CLIENT_CONFIG } from '@/conf/clientConfig';
import { 
  Upload, FileText, AlertTriangle, CheckCircle, 
  Loader2, Check 
} from 'lucide-react';

export default function InformarPagoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  // Estados del pago
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/portal');
        return;
      }
      setUser(session.user);

      // --- NUEVO: Traer Alias y CBUs ---
      const { data: configData } = await supabase
        .from('system_config')
        .select('*');
        
      if (configData) {
        // Filtramos solo los que son alias o cbu
        const methods = configData.filter(c => c.key.startsWith('alias') || c.key.startsWith('cbu'));
        setPaymentMethods(methods);
      }
      // ---------------------------------

      setLoading(false);
    };
    fetchUser();
  }, [router]);

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!amount || !file) return; 

    if (file.size > 2.5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'El comprobante debe pesar menos de 2.5MB' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    setShowPaymentConfirm(true);
  };

  const handlePaymentSubmit = async () => {
    setShowPaymentConfirm(false); 
    setUploading(true);
    try {
      let publicUrl = null;
      if (file) {
        const fileName = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file);
        if (uploadError) throw uploadError;
        publicUrl = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl;
      }

      // Buscar categorías actuales para dejar el registro histórico en el pago
      const { data: userSportsCats } = await supabase
        .from('user_categories')
        .select('deportes(name), categories(name)')
        .eq('user_id', user.id);

      let finalSport = 'Sin Deporte';
      let finalCategory = 'Sin Categoría';

      if (userSportsCats && userSportsCats.length > 0) {
        const sportsList = Array.from(new Set(userSportsCats.map((uc: any) => uc.deportes?.name).filter(Boolean)));
        const catsList = Array.from(new Set(userSportsCats.map((uc: any) => uc.categories?.name).filter(Boolean)));
        
        if (sportsList.length > 0) finalSport = sportsList.join(' / ');
        if (catsList.length > 0) finalCategory = catsList.join(' / ');
      }
      
      const { error: insertError } = await supabase.from('payments').insert({
        user_id: user.id, 
        amount: parseFloat(amount), 
        method: 'transfer', 
        status: 'pending', 
        date: new Date().toISOString(), 
        proof_url: publicUrl,
        category_snapshot: finalCategory,
        sport_snapshot: finalSport
      });

      if (insertError) throw insertError;
      
      setUploadSuccess(true);
      setAmount('');
      setFile(null);

    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Error al enviar el comprobante' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setMessage({ type: 'success', text: `${label} copiado al portapapeles` });
    setTimeout(() => setMessage(null), 2500);
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  }

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto py-6 md:py-10 animate-in fade-in slide-in-from-bottom-4 text-left relative">
      
      {/* ALERTAS TOAST */}
      {message && (
        <div className="absolute -top-4 left-0 right-0 z-50 flex justify-center animate-in fade-in slide-in-from-top-4">
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg font-bold text-sm">
            {message.text}
          </div>
        </div>
      )}

      {!uploadSuccess ? (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
          <div className="h-12 w-12 md:h-16 md:w-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload size={28} />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase mb-1">Informar Pago</h2>
          <p className="text-gray-500 text-xs md:text-sm mb-6 md:mb-8 italic">Informá el comprobante de tu transferencia aquí.</p>
          
          <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-left">
            <p className="text-[10px] font-black text-indigo-900/40 uppercase tracking-widest mb-3 text-center">Tocá los datos para copiarlos</p>
            {/* RENDERIZADO DINÁMICO DE CUENTAS */}
            <div className="grid grid-cols-1 gap-3">
              {paymentMethods.length > 0 ? paymentMethods.map((method) => {
                const isAlias = method.key.startsWith('alias');
                return (
                  <div 
                    key={method.key}
                    className="cursor-pointer bg-white border border-indigo-50 hover:bg-indigo-100/80 p-3.5 rounded-xl transition-all group relative active:scale-95 shadow-sm"
                    onClick={() => copyToClipboard(method.value, isAlias ? 'Alias' : 'CBU')}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">
                        {isAlias ? 'Alias' : 'CBU / CVU'}
                      </p>
                      {/* Título dinámico que cargó el admin */}
                      {method.description && (
                        <p className="text-[10px] font-bold text-purple-600 italic">
                          {method.description}
                        </p>
                      )}
                    </div>
                    
                    <p className="font-black text-indigo-950 text-sm md:text-base flex items-center justify-between">
                      {method.value}
                      <span className="text-indigo-400 group-active:text-orange-500 transition-colors bg-indigo-50 p-1.5 rounded-md">
                        <FileText size={16} />
                      </span>
                    </p>
                  </div>
                );
              }) : (
                <div className="text-center p-4 bg-white rounded-xl border border-indigo-50 text-xs font-bold text-gray-400">
                  No hay cuentas registradas.
                </div>
              )}
            </div>
          </div>

          <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg flex gap-3 text-left">
            <AlertTriangle className="text-amber-600 shrink-0" size={20} />
            <div className="space-y-1">
              <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Aviso Importante</h4>
              <p className="text-[11px] font-bold text-amber-700 leading-tight">
                Por este medio **SOLO** se reciben transferencias. Los pagos en efectivo se informan directamente en administración y se verán reflejados automáticamente.
              </p>
            </div>
          </div>

          <form onSubmit={handlePreSubmit} className="space-y-5 md:space-y-6 text-left">
            <div className="text-left">
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-2">Monto Transferido ($)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 md:p-4 text-xl md:text-2xl font-black border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 text-gray-900 placeholder-gray-400" placeholder="0.00" required/>
              {amount && (
                <p className="mt-2 text-[10px] font-bold text-orange-600 animate-pulse bg-orange-50 p-2 rounded-lg border border-orange-100 flex items-center gap-2">
                  ⚠️ Monto a informar: <span className="text-xs">${Number(amount).toLocaleString('es-AR')}</span>
                </p>
              )}
            </div>
            
            <div className={`border-2 border-dashed rounded-xl p-6 text-center relative cursor-pointer transition-all ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:bg-gray-50'}`}>
              <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer"/>
              {file ? (
                <span className="font-bold text-green-600 text-xs flex items-center justify-center gap-2 break-all">
                  <CheckCircle size={16} className="shrink-0"/> {file.name}
                </span>
              ) : (
                <div className="space-y-1">
                  <span className="text-gray-400 font-black text-xs uppercase block">Adjuntar Foto o PDF</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">(Obligatorio - Máx 2.5MB)</span>
                </div>
              )}
            </div>
            
            <button 
              type="submit" 
              disabled={uploading || !amount || !file} 
              className="w-full bg-orange-600 text-white py-4 rounded-xl font-black uppercase hover:bg-orange-700 transition shadow-lg disabled:bg-gray-300 disabled:shadow-none text-sm text-center flex justify-center items-center gap-2"
            >
              {uploading ? <Loader2 className="animate-spin"/> : 'ENVIAR COMPROBANTE'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl text-center border-t-4 border-green-500">
          <CheckCircle size={50} className="text-green-500 mx-auto mb-4"/>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase">¡Enviado!</h2>
          <p className="text-gray-500 text-sm mb-6">Tu pago está en revisión.</p>
          <button onClick={() => setUploadSuccess(false)} className="text-indigo-600 font-bold hover:underline text-sm">
            Nuevo pago
          </button>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {showPaymentConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm text-left">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="pt-8 pb-4 flex justify-center">
              <div className="h-20 w-20 bg-orange-50 rounded-full flex items-center justify-center relative">
                <div className="absolute inset-0 bg-orange-100 rounded-full animate-ping opacity-40"></div>
                <AlertTriangle size={36} className="text-orange-500 relative z-10" />
              </div>
            </div>
            <div className="px-6 text-center space-y-3">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Revisá el Monto</h3>
              <p className="text-gray-500 font-medium text-sm">Estás por informar un pago por:</p>
              <div className="py-4">
                <span className="text-5xl md:text-6xl font-black text-indigo-950 tracking-tighter">
                  ${Number(amount).toLocaleString('es-AR')}
                </span>
              </div>
              <p className="text-orange-600/80 text-[11px] font-bold uppercase tracking-wider px-2 leading-relaxed mt-2">
                ¿Coincide exactamente con el comprobante adjunto?
              </p>
            </div>
            <div className="p-6 mt-2 flex gap-3">
              <button 
                type="button"
                onClick={() => setShowPaymentConfirm(false)} 
                className="flex-1 py-3.5 bg-white text-gray-500 border border-gray-200 rounded-xl font-black uppercase text-[10px] hover:bg-gray-50 hover:text-gray-800 transition-all active:scale-95 tracking-widest"
              >
                Corregir
              </button>
              <button 
                type="button"
                onClick={handlePaymentSubmit}
                className="flex-1 py-3.5 bg-green-500 text-white rounded-xl font-black uppercase text-[10px] hover:bg-green-600 transition-all active:scale-95 shadow-lg shadow-green-200 tracking-widest flex items-center justify-center gap-2"
              >
                <Check size={16} strokeWidth={3} /> Sí, Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}