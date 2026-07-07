'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Loader2, Mic, Square, Play, RefreshCw, Save, X, Check } from 'lucide-react';

const MAX_SECONDS = 300;
const TRIMESTRES = ['1er Trimestre', '2do Trimestre', '3er Trimestre', '4to Trimestre'];

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
  const [year, setYear] = useState(new Date().getFullYear());
  const [trimestre, setTrimestre] = useState(TRIMESTRES[0]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [recordingFor, setRecordingFor] = useState<any>(null);
  const [existingFb, setExistingFb] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const mimeRef = useRef('');

  const period = `${trimestre} ${year}`;

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

  useEffect(() => {
    if (!selectedCatId) return;
    const loadCat = async () => {
      const { data: relData } = await supabase
        .from('user_categories')
        .select('users:user_id (id, name, status, role)')
        .eq('category_id', selectedCatId);
      const ps = (relData || [])
        .map((r: any) => r.users)
        .filter((u: any) => u && u.role?.includes('player') && u.status === 'active')
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      setPlayers(ps);
      const { data: fbs } = await supabase.from('feedbacks').select('*').eq('category_id', selectedCatId);
      setFeedbacks(fbs || []);
    };
    loadCat();
  }, [selectedCatId]);

  const fbFor = (playerId: string) => feedbacks.find(f => f.player_id === playerId && f.period === period) || null;
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };

  const cleanupStream = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const openRecorder = async (player: any) => {
    const existing = fbFor(player.id);
    setRecordingFor(player);
    setExistingFb(existing);
    setMessage(existing?.notes || '');
    setRecordedBlob(null);
    setRecordedUrl(null);
    setSeconds(0);
    setExistingAudioUrl(null);
    if (existing?.audio_url) {
      const { data } = await supabase.storage.from('devoluciones').createSignedUrl(existing.audio_url, 3600);
      if (data?.signedUrl) setExistingAudioUrl(data.signedUrl);
    }
  };

  const closeRecorder = () => {
    cleanupStream();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordingFor(null);
    setExistingFb(null);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setExistingAudioUrl(null);
    setMessage('');
    setIsRecording(false);
    setSeconds(0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      mimeRef.current = mime;
      const mr = mime
        ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 })
        : new MediaRecorder(stream);
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
        setSeconds(prev => {
          if (prev + 1 >= MAX_SECONDS) { stopRecording(); return MAX_SECONDS; }
          return prev + 1;
        });
      }, 1000);
    } catch {
      showToast('No se pudo acceder al micrófono. Revisá los permisos.');
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
  };

  const saveFeedback = async () => {
    if (!recordedBlob && !existingFb) { showToast('Grabá un audio primero.'); return; }
    setSaving(true);
    try {
      let audioPath = existingFb?.audio_url || null;
      if (recordedBlob) {
        const ext = extFor(mimeRef.current || 'audio/webm');
        const path = `${recordingFor.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('devoluciones').upload(path, recordedBlob, { contentType: mimeRef.current || 'audio/webm' });
        if (upErr) throw upErr;
        if (existingFb?.audio_url) await supabase.storage.from('devoluciones').remove([existingFb.audio_url]);
        audioPath = path;
      }
      if (existingFb) {
        const { error } = await supabase.from('feedbacks')
          .update({ audio_url: audioPath, notes: message.trim() || null, professor_id: myId, player_name: recordingFor.name, created_at: new Date().toISOString() })
          .eq('id', existingFb.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('feedbacks')
          .insert({ player_id: recordingFor.id, professor_id: myId, category_id: selectedCatId, period, audio_url: audioPath, notes: message.trim() || null, player_name: recordingFor.name });
        if (error) throw error;
      }
      const { data: fbs } = await supabase.from('feedbacks').select('*').eq('category_id', selectedCatId);
      setFeedbacks(fbs || []);
      showToast('Devolución guardada');
      closeRecorder();
    } catch (err: any) {
      showToast('Error: ' + (err?.message || 'no se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const playAudio = async (path: string) => {
    const { data } = await supabase.storage.from('devoluciones').createSignedUrl(path, 3600);
    if (data?.signedUrl) { const a = new Audio(data.signedUrl); a.play().catch(() => {}); }
  };

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(new Set([
    currentYear,
    ...feedbacks.map((f: any) => { const m = String(f.period || '').match(/(\d{4})/); return m ? Number(m[1]) : 0; }).filter(Boolean)
  ])).sort((a, b) => b - a);

  const currentIds = new Set(players.map(p => p.id));
  const historical = Array.from(new Map(
    feedbacks
      .filter((f: any) => f.period === period && !currentIds.has(f.player_id))
      .map((f: any) => [f.player_id, { id: f.player_id, name: f.player_name || 'Alumno', __historical: true }])
  ).values());
  const displayList: any[] = [...players, ...historical];

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 text-left w-full">
      {toast && (
        <div className="fixed bottom-8 right-8 z-[70] bg-[#1e1b4b] text-white px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-xl animate-in slide-in-from-bottom-5">{toast}</div>
      )}

      <div className="mb-6 mt-2 px-4 md:px-0">
        <h2 className="text-2xl md:text-3xl font-black text-[#1e1b4b] uppercase tracking-tighter">Devoluciones</h2>
        <p className="text-slate-500 text-sm">Grabá una devolución en audio para cada alumno.</p>
      </div>

      <div className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-4 md:p-6 mx-4 md:mx-0 mb-4 space-y-5">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Curso</p>
          {cats.length === 0 ? (
            <span className="text-xs text-slate-400 font-bold">No tenés cursos asignados.</span>
          ) : (
            <select value={selectedCatId ?? ''} onChange={e => setSelectedCatId(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-xs uppercase tracking-wide text-slate-600 outline-none cursor-pointer focus:border-indigo-400">
              {cats.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Período</p>
            <div className="flex gap-2 flex-wrap">
              {TRIMESTRES.map(t => (
                <button key={t} onClick={() => setTrimestre(t)}
                  className={`px-3 py-2 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${trimestre === t ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-emerald-300'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Año</p>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-black text-xs text-slate-600 outline-none cursor-pointer">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="mx-4 md:mx-0 space-y-2">
        {selectedCatId && displayList.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 font-bold text-sm">No hay alumnos activos en este curso.</div>
        )}
        {displayList.map(p => {
          const fb = fbFor(p.id);
          return (
            <div key={p.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-3 md:p-4 shadow-sm">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${fb ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>{initialsOf(p.name)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-[#1e1b4b] truncate uppercase tracking-tight">{p.name}</p>
                {fb ? (
                  <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1"><Check size={12} /> Devolución grabada{p.__historical && <span className="text-amber-500 ml-1">· ya no cursa</span>}</p>
                ) : (
                  <p className="text-[11px] font-bold text-slate-400">Sin devolución todavía</p>
                )}
              </div>
              {fb?.audio_url && (
                <button onClick={() => playAudio(fb.audio_url)} className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center shrink-0" title="Escuchar"><Play size={16} /></button>
              )}
              <button onClick={() => openRecorder(p)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider shrink-0 flex items-center gap-1.5 transition ${fb ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'}`}>
                <Mic size={14} /> {fb ? 'Editar' : 'Grabar'}
              </button>
            </div>
          );
        })}
      </div>

      {recordingFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#1e1b4b] px-6 py-4 flex justify-between items-center">
              <div className="min-w-0">
                <p className="text-white font-black text-sm uppercase tracking-tight truncate">{recordingFor.name}</p>
                <p className="text-indigo-300 text-[10px] font-bold uppercase truncate">{cats.find(c => c.id === selectedCatId)?.name} · {period}</p>
              </div>
              <button onClick={closeRecorder} className="text-indigo-200 hover:text-white shrink-0"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center gap-2 py-2">
                <div className={`h-20 w-20 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-indigo-50 text-indigo-500'}`}>
                  <Mic size={34} />
                </div>
                <p className="text-3xl font-black text-[#1e1b4b] tabular-nums">{fmt(seconds)}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Máximo 5 minutos</p>
              </div>

              <div className="flex gap-2 justify-center">
                {!isRecording && !recordedBlob && (
                  <button onClick={startRecording} className="px-6 py-3 rounded-2xl bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-red-600 shadow-lg shadow-red-200"><Mic size={16} /> Grabar</button>
                )}
                {isRecording && (
                  <button onClick={stopRecording} className="px-6 py-3 rounded-2xl bg-[#1e1b4b] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2"><Square size={14} /> Parar</button>
                )}
                {!isRecording && recordedBlob && (
                  <button onClick={startRecording} className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-slate-200"><RefreshCw size={14} /> Regrabar</button>
                )}
              </div>

              {recordedUrl && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Escuchar antes de guardar</p>
                  <audio controls src={recordedUrl} className="w-full h-10" />
                </div>
              )}
              {!recordedUrl && existingAudioUrl && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Devolución actual</p>
                  <audio controls src={existingAudioUrl} className="w-full h-10" />
                </div>
              )}

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mensaje (opcional)</p>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Ej: muy buen avance en speaking, seguí reforzando writing." className="w-full border border-slate-200 rounded-2xl p-3 text-sm text-slate-700 outline-none focus:border-indigo-400 resize-none" />
              </div>

              <div className="flex gap-2">
                <button onClick={closeRecorder} disabled={saving} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200">Cancelar</button>
                <button onClick={saveFeedback} disabled={saving || isRecording} className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:shadow-none">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={14} /> Guardar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
