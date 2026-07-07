'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { Loader2, Mic } from 'lucide-react';

export default function DevolucionesSocioPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: fbs } = await supabase
        .from('feedbacks')
        .select('*, categories(name, deportes(name))')
        .eq('player_id', session.user.id)
        .order('created_at', { ascending: false });

      const withUrls = await Promise.all((fbs || []).map(async (f: any) => {
        let signedUrl = null;
        if (f.audio_url) {
          const { data } = await supabase.storage.from('devoluciones').createSignedUrl(f.audio_url, 3600);
          signedUrl = data?.signedUrl || null;
        }
        return { ...f, signedUrl };
      }));

      setItems(withUrls);
      setLoading(false);
    };
    load();
  }, []);

  const yearOf = (d: any) => d ? new Date(d).getFullYear() : 0;
  const availableYears = Array.from(new Set([new Date().getFullYear(), ...items.map(f => yearOf(f.created_at)).filter(Boolean)])).sort((a, b) => b - a);
  const shown = items.filter(f => yearOf(f.created_at) === selectedYear);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="max-w-2xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 text-left w-full">
      <div className="mb-6 mt-2">
        <h2 className="text-2xl md:text-3xl font-black text-[#1e1b4b] uppercase tracking-tighter">Devoluciones</h2>
        <p className="text-slate-500 text-sm">Escuchá las devoluciones de tus profes.</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-10 text-center">
          <div className="mx-auto w-12 h-12 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mb-3"><Mic size={22} /></div>
          <p className="font-black text-slate-500 uppercase text-sm">Todavía no hay devoluciones</p>
          <p className="text-slate-400 text-xs mt-1">Cuando tu profe grabe una, va a aparecer acá.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Año</span>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 font-black text-xs text-slate-600 outline-none cursor-pointer">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {shown.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8 text-center text-slate-400 font-bold text-sm">No hay devoluciones en {selectedYear}.</div>
          ) : (
            <div className="space-y-3">
              {shown.map(f => (
                <div key={f.id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-[#1e1b4b] uppercase text-sm tracking-tight leading-tight break-words">{f.period || 'Devolución'}</p>
                      <p className="text-[11px] font-bold text-indigo-500 uppercase truncate">{f.categories?.name || 'Curso'}{f.categories?.deportes?.name ? ` · ${f.categories.deportes.name}` : ''}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold shrink-0 whitespace-nowrap">{f.created_at ? new Date(f.created_at).toLocaleDateString('es-AR') : ''}</p>
                  </div>

                  {f.signedUrl ? (
                    <audio controls src={f.signedUrl} className="w-full min-w-0 h-11" />
                  ) : (
                    <p className="text-xs text-slate-400 font-bold">Audio no disponible.</p>
                  )}

                  {f.notes && (
                    <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-3">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Mensaje de la profe</p>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line">{f.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
