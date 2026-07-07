'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Loader2, Mic, Square, RefreshCw, Save, X, Play, Trash2, Plus, MessageSquare } from 'lucide-react';

const MAX_SECONDS = 300;

function pickMime() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];
  if (typeof MediaRecorder === 'undefined') return '';
  for (const c of candidates) { if (MediaRecorder.isTypeSupported(c)) return c; }
  return '';
}
function extFor(mime: string) { return mime.includes('webm') ? 'webm' : 'm4a'; }
function fmt(s: number) { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${String(sec).padStart(2, '0')}`; }
function initialsOf(name: string) {
  const parts = (name || '?').replace(',', ' ').split(' ').map(x => x.trim()).filter(Boolean);
  return (parts.slice(0, 2).map(p => p[0]).join('') || '?').toUpperCase();
}

export default function DevolucionesProfePage() {
  const router = useRouter();
  const [myId, setMyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [fbByPlayer, setFbByPlayer] = useState<Record<string, any[]>>({});
  const [toast, setToast] = useState<string | null>(null);

  const [openStudent, setOpenStudent] = useState<any>(null);
  const [recordMode, setRecordMode] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const mimeRef = useRef('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/portal'); return; }
      setMyId(session.user.id);
      const { data: assignments } = await supabase
        .from('professor_assignments')
        .select('category_id, categories (id, name)')
        .eq('professor_id', session.user.id);
      const profeCats = (assignments || []).map((a: any) => a.categories).filter(Boolean);
      const uniq = Array.from(new Map(profeCats.map((c: any) => [c.id, c])).values()) as any[];
      setCats(uniq);
      if (uniq.length > 0) setSelectedCatId(uniq[0].id);
      setLoading(false);
    };
    load();
  }, [router]);

  const loadCat = async (catId: number) => {
    const { data: relData } = await supabase
      .from('user_categories')
      .select('users:user_id (id, name, status, role)')
      .eq('category_id', catId);
    const ps = (relData || [])
      .map((r: any) => r.users)
      .filter((u: any) => u && u.role?.includes('player') && u.status === 'active')
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    setPlayers(ps);
    const ids = ps.map((p: any) => p.id);
    if (ids.length > 0) {
      const { data: fbs } = await supabase
        .from('feedbacks')
        .select('*, categories(name)')
        .in('player_id', ids)
        .order('created_at', { ascending: false });
      const map: Record<string, any[]> = {};
      (fbs || []).forEach((f: any) => { (map[f.player_id] = map[f.player_id] || []).push(f); });
      setFbByPlayer(map);
    } else {
      setFbByPlayer({});
    }
  };

  useEffect(() => { if (selectedCatId) loadCat(selectedCatId); }, [selectedCatId]);

  const cleanupStream = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const resetRecorder = () => {
    cleanupStream();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setSeconds(0);
    setIsRecording(false);
    setTitle('');
    setMessage('');
  };

  const openStudentModal = (p: any) => { setOpenStudent(p); setRecordMode(false); resetRecorder(); };
  const closeModal = () => { resetRecorder(); setRecordMode(false); setOpenStudent(null); };
  const startNew = () => { resetRecorder(); setRecordMode(true); };
  const cancelNew = () => { resetRecorder(); setRecordMode(false); };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      mimeRef.current = mime;
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 }) : new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeRef.current || 'audio/webm' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        cleanupStream();
        setIsRecording(false);
      };
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedBlob(null);
      setRecordedUrl(null);
      setSeconds(0);
      mr.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds(prev => { if (prev + 1 >= MAX_SECONDS) { stopRecording(); return MAX_SECONDS; } return prev + 1; });
      }, 1000);
    } catch {
      showToast('No se pudo acceder al micrófono. Revisá los permisos.');
    }
  };

  const stopRecording = () => { if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop(); };

  const saveNew = async () => {
    if (!recordedBlob) { showToast('Grabá un audio primero.'); return; }
    if (!title.trim()) { showToast('Ponele un título a la devolución.'); return; }
    setSaving(true);
    try {
      const ext = extFor(mimeRef.current || 'audio/webm');
      const path = `${openStudent.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('devoluciones').upload(path, recordedBlob, { contentType: mimeRef.current || 'audio/webm' });
      if (upErr) throw upErr;
      const { error } = await supabase.from('feedbacks').insert({
        player_id: openStudent.id, professor_id: myId, category_id: selectedCatId,
        period: title.trim(), audio_url: path, notes: message.trim() || null, player_name: openStudent.name
      });
      if (error) throw error;
      await loadCat(selectedCatId!);
      showToast('Devolución guardada');
      setRecordMode(false);
      resetRecorder();
    } catch (err: any) {
      showToast('Error: ' + (err?.message || 'no se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const deleteFb = async (fb: any) => {
    setDeletingId(fb.id);
    try {
      if (fb.audio_url) await supabase.storage.from('devoluciones').remove([fb.audio_url]);
      const { error } = await supabase.from('feedbacks').delete().eq('id', fb.id);
      if (error) throw error;
      await loadCat(selectedCatId!);
      showToast('Devolución eliminada');
    } catch {
      showToast('Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const playAudio = async (path: string) => {
    const { data } = await supabase.storage.from('devoluciones').createSignedUrl(path, 3600);
    if (data?.signedUrl) { const a = new Audio(data.signedUrl); a.play().catch(() => {}); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  const studentFbs = openStudent ? (fbByPlayer[openStudent.id] || []) : [];

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 text-left w-full">
      {toast && <div className="fixed bottom-8 right-8 z-[80] bg-[#1e1b4b] text-white px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-xl animate-in slide-in-from-bottom-5">{toast}</div>}

      <div className="mb-6 mt-2 px-4 md:px-0">
        <h2 className="text-2xl md:text-3xl font-black text-[#1e1b4b] uppercase tracking-tighter">Devoluciones</h2>
        <p className="text-slate-500 text-sm">Dejá devoluciones en audio en el historial de cada alumno.</p>
      </div>

      <div className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-4 md:p-6 mx-4 md:mx-0 mb-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Curso</p>
        {cats.length === 0 ? (
          <span className="text-xs text-slate-400 font-bold">No tenés cursos asignados.</span>
        ) : (
          <select value={selectedCatId ?? ''} onChange={e => setSelectedCatId(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-xs uppercase tracking-wide text-slate-600 outline-none cursor-pointer focus:border-indigo-400">
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      <div className="mx-4 md:mx-0 space-y-2">
        {selectedCatId && players.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 font-bold text-sm">No hay alumnos activos en este curso.</div>
        )}
        {players.map(p => {
          const count = (fbByPlayer[p.id] || []).length;
          return (
            <button key={p.id} onClick={() => openStudentModal(p)} className="w-full flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-3 md:p-4 shadow-sm hover:border-indigo-200 transition text-left">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${count > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>{initialsOf(p.name)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-[#1e1b4b] truncate uppercase tracking-tight">{p.name}</p>
                <p className="text-[11px] font-bold text-slate-400">{count === 0 ? 'Sin devoluciones' : `${count} ${count === 1 ? 'devolución' : 'devoluciones'}`}</p>
              </div>
              <span className="px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider shrink-0 flex items-center gap-1.5 bg-indigo-600 text-white shadow-md"><MessageSquare size={14} /> Devoluciones</span>
            </button>
          );
        })}
      </div>

      {openStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="bg-[#1e1b4b] px-6 py-4 flex justify-between items-center shrink-0">
              <div className="min-w-0">
                <p className="text-white font-black text-sm uppercase tracking-tight truncate">{openStudent.name}</p>
                <p className="text-indigo-300 text-[10px] font-bold uppercase truncate">{cats.find(c => c.id === selectedCatId)?.name}</p>
              </div>
              <button onClick={closeModal} className="text-indigo-200 hover:text-white shrink-0"><X size={20} /></button>
            </div>

            {recordMode ? (
              <div className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Título</p>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Devolución trimestre 1" className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400" />
                </div>
                <div className="flex flex-col items-center gap-2 py-1">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-indigo-50 text-indigo-500'}`}><Mic size={28} /></div>
                  <p className="text-2xl font-black text-[#1e1b4b] tabular-nums">{fmt(seconds)}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Máximo 5 minutos</p>
                </div>
                <div className="flex gap-2 justify-center">
                  {!isRecording && !recordedBlob && <button onClick={startRecording} className="px-6 py-3 rounded-2xl bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-red-600 shadow-lg shadow-red-200"><Mic size={16} /> Grabar</button>}
                  {isRecording && <button onClick={stopRecording} className="px-6 py-3 rounded-2xl bg-[#1e1b4b] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2"><Square size={14} /> Parar</button>}
                  {!isRecording && recordedBlob && <button onClick={startRecording} className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-slate-200"><RefreshCw size={14} /> Regrabar</button>}
                </div>
                {recordedUrl && <audio controls src={recordedUrl} className="w-full min-w-0 h-10" />}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mensaje (opcional)</p>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder="Ej: muy buen avance en speaking." className="w-full border border-slate-200 rounded-2xl p-3 text-sm text-slate-700 outline-none focus:border-indigo-400 resize-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={cancelNew} disabled={saving} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200">Cancelar</button>
                  <button onClick={saveNew} disabled={saving || isRecording} className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:shadow-none">{saving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={14} /> Guardar</>}</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col overflow-hidden">
                <div className="p-4 shrink-0 border-b border-slate-100">
                  <button onClick={startNew} className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2"><Plus size={16} /> Grabar nueva devolución</button>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto">
                  {studentFbs.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold text-xs py-6">Todavía no tiene devoluciones.</p>
                  ) : studentFbs.map(fb => (
                    <div key={fb.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-[#1e1b4b] text-xs uppercase tracking-tight break-words">{fb.period || 'Devolución'}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{fb.categories?.name || ''} · {fb.created_at ? new Date(fb.created_at).toLocaleDateString('es-AR') : ''}</p>
                        </div>
                        <button onClick={() => deleteFb(fb)} disabled={deletingId === fb.id} className="text-slate-300 hover:text-red-500 shrink-0 p-1">{deletingId === fb.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}</button>
                      </div>
                      {fb.audio_url && (
                        <button onClick={() => playAudio(fb.audio_url)} className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl py-2 px-3 text-indigo-600 font-black text-[11px] uppercase tracking-wide hover:bg-indigo-50"><Play size={14} /> Escuchar</button>
                      )}
                      {fb.notes && <p className="text-xs text-slate-600 font-medium mt-2 leading-relaxed whitespace-pre-line">{fb.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
