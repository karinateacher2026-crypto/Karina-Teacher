'use client';

import React from 'react';
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  LayoutDashboard, User, LogOut, Menu, Loader2, Edit2, Timer, Save, Upload, 
  CheckCircle, Clock, ArrowUpRight,FileText, ArrowDownLeft, X, Eye, EyeOff, Activity, ExternalLink, Settings, ChevronLeft, ChevronRight,
  ShieldCheck, Lock, Shield, Mail, Phone, Bell, MapPin, Calendar, CreditCard, Plus, Trash2,RotateCw, Key, XCircle, Trophy, Check, Camera, AlertTriangle
} from 'lucide-react'
import { format, parseISO, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'
import { CLIENT_CONFIG } from '@/conf/clientConfig';

export default function PortalDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [showAllPayments, setShowAllPayments] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard') 
  const [sidebarOpen, setSidebarOpen] = useState(false) 
  const [realRoles, setRealRoles] = useState<string[]>([]);
  const [allSports, setAllSports] = useState<any[]>([]); 
  const [calendarSportFilter, setCalendarSportFilter] = useState<string>('Todos');
  const [selectedDeportes, setSelectedDeportes] = useState<number[]>([]); 
  
  const [userSportsInfo, setUserSportsInfo] = useState<any[]>([]);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('users') 
        .select('role')
        .eq('id', user.id)
        .single();

      if (data?.role) {
        setRealRoles(Array.isArray(data.role) ? data.role : [data.role]);
      }
    };
    fetchRoles();
  }, [user?.id]);

  const displayCategory = userSportsInfo.length > 0 ? userSportsInfo[0].category : 'Sin Categoría';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image') 

  const [showNotifyOption, setShowNotifyOption] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [payers, setPayers] = useState<{ name: string; cuil: string }[]>([{ name: '', cuil: '' }])
  const [paymentResponsible, setPaymentResponsible] = useState(payers[0]?.name ? 'third_party' : 'self');

  const [saveLoading, setSaveLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvaluaciones = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('physical_evaluations')
          .select('*')
          .eq('user_id', user.id)
          .order('test_date', { ascending: false });

        if (!error) setEvaluaciones(data);
      }
    };
    fetchEvaluaciones();
  }, []);

  const handleRequestPermission = async () => {
    return;
  };

  useEffect(() => {
    if (!user?.id) return;
    setShowNotifyOption(false);
  }, [user?.id]);

  const [passwords, setPasswords] = useState({ new: '', confirm: '' })
  const [passLoading, setPassLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [scheduledPractices, setScheduledPractices] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);

  // --- LÓGICA CORREGIDA Y APLANADA ---
  // --- LÓGICA DE ASISTENCIA CORREGIDA ---
  useEffect(() => {
    const fetchAttendanceAndPractices = async () => {
      if (!user?.id) return;
      try {
        setCalendarLoading(true);

        // 1. Traemos las prácticas (esto está bien)
        const { data: practicesData, error: pracError } = await supabase
          .from('practices')
          .select('id, scheduled_date, observations, categories(name, deportes(name))');

        if (!pracError && practicesData) {
          setScheduledPractices(practicesData);
        }

        // 2. Traemos la asistencia FILTRANDO POR EL USUARIO ACTUAL
        const { data: attData, error: attError } = await supabase
          .from('attendance')
          .select('practice_id, status')
          .eq('player_id', user.id); // <--- CAMBIAMOS 'user_id' POR 'player_id'

        if (!attError && attData) {
          setAttendanceData(attData);
        } else if (attError) {
          console.error("Error fetching attendance:", attError);
        }

      } catch (err: any) {
        console.error('Error al cargar calendario:', err.message, err);
      } finally {
        setCalendarLoading(false);
      }
    };

    fetchAttendanceAndPractices();
  }, [user?.id, currentDate]);

  const renderAttendanceCalendar = () => {
    if (calendarLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    const todayStr = getTodayArgentina();

    // 1. Identificamos qué deportes hace este socio en particular
    const availableSports = Array.from(new Set(userSportsInfo.map(info => info.sport).filter(Boolean)));

    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-20 md:h-24 border border-slate-50" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      // 2. Filtramos cruzando Fecha + Deporte Seleccionado
      const practicesForDay = scheduledPractices.filter(p => {
          if (!p.scheduled_date) return false;
          if (p.scheduled_date.split('T')[0] !== dayStr) return false;
          
          const practiceSport = p.categories?.deportes?.name;
          if (calendarSportFilter !== 'Todos' && practiceSport !== calendarSportFilter) return false;
          
          return true;
      });
      
      const isPast = dayStr < todayStr;
      const isToday = dayStr === todayStr;

      days.push(
        <div key={d} className="h-20 md:h-24 border border-slate-100 p-1 md:p-2 relative flex flex-col justify-between bg-white">
          <span className={`text-[10px] font-bold ${isToday ? 'text-indigo-600' : 'text-slate-300'}`}>{d}</span>

          <div className="flex flex-col gap-0.5 overflow-hidden">
            {practicesForDay.map((practice, idx) => {
              const record = attendanceData.find(r => r.practice_id === practice.id);
              const hasData = record && (record.status === 'present' || record.status === 'absent');

              let statusLabel = '';
              let statusClass = '';

              if (hasData) {
                if (record.status === 'present') {
                    statusLabel = 'Presente';
                    statusClass = 'bg-emerald-100 text-emerald-700';
                } else {
                    statusLabel = 'Ausente';
                    statusClass = 'bg-red-100 text-red-700';
                }
              } else {
                if (isToday) {
                    statusLabel = 'HOY';
                    statusClass = 'bg-indigo-600 text-white shadow-md';
                } else if (isPast) {
                    statusLabel = 'Sin datos';
                    statusClass = 'bg-slate-100 text-slate-500';
                } else {
                    statusLabel = 'Próximo';
                    statusClass = 'bg-orange-50 text-orange-400';
                }
              }

              const practiceName = practice.observations?.replace('Turno: ', '').trim() || 
                                   practice.categories?.deportes?.name || 
                                   practice.categories?.name || 
                                   'Práctica';

              return (
                <div key={practice.id || idx} className="flex flex-col mb-1">
                  <div className={`p-0.5 md:p-1 rounded-[4px] text-[6px] md:text-[7px] font-black text-center transition-all ${statusClass}`}>
                    {statusLabel}
                  </div>
                  {!hasData && (
                    <div className="text-[5px] md:text-[9px] font-black text-slate-500 text-center uppercase truncate leading-none mt-0.5 md:mt-1" title={practiceName}>
                      {practiceName}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-10 text-left">
        <div className="mb-6 mt-2 text-left px-4 md:px-0">
          <h2 className="text-2xl md:text-3xl font-black text-[#1e1b4b] uppercase tracking-tighter">Mi Asistencia</h2>
          <p className="text-slate-500 text-sm">Calendario de clases y registro de presencias.</p>
          
          {/* 3. ACÁ SE DIBUJAN LAS PÍLDORAS SI HACE MÁS DE 1 DEPORTE */}
          {availableSports.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button 
                onClick={() => setCalendarSportFilter('Todos')}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${calendarSportFilter === 'Todos' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
              >
                Todos
              </button>
              {availableSports.map((sport: any) => (
                <button 
                  key={sport}
                  onClick={() => setCalendarSportFilter(sport)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${calendarSportFilter === sport ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {sport}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-xl border border-slate-100 overflow-hidden mx-4 md:mx-0">
          <div className="p-4 md:p-8 bg-slate-50 flex justify-between items-center border-b">
              <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))} className="p-2 hover:bg-white rounded-full"><ChevronLeft/></button>
              <span className="font-black text-[10px] md:text-sm uppercase tracking-[0.2em] text-indigo-950">{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>
              <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))} className="p-2 hover:bg-white rounded-full"><ChevronRight/></button>
          </div>
          <div className="grid grid-cols-7">
            {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => <div key={d} className="bg-slate-50 py-3 md:py-4 text-center text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
            {days}
          </div>
        </div>
      </div>
    );
  };
  // ------------------------------------------

  useEffect(() => { fetchUserData() }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true)
      else setSidebarOpen(false)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getTodayArgentina = () => {
    const now = new Date();
    const argentinaTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    return argentinaTime;
  };

  const formatCuil = (val: string) => {
    let value = val.replace(/\D/g, ""); 
    if (value.length > 11) value = value.slice(0, 11);
    let formatted = value;
    if (value.length > 2) formatted = `${value.slice(0, 2)}-${value.slice(2)}`;
    if (value.length > 10) formatted = `${formatted.slice(0, 11)}-${value.slice(10, 11)}`;
    return formatted;
  }

  const handleCuilChange = (val: string) => {
    setFormData({ ...formData, cuil: formatCuil(val) });
  }

  const handleAddPayer = () => setPayers([...payers, { name: '', cuil: '' }])
  const handleRemovePayer = (index: number) => {
    if (payers.length > 1) {
      setPayers(payers.filter((_, i) => i !== index))
    }
  }
  const handlePayerChange = (index: number, field: 'name' | 'cuil', value: string) => {
    const newPayers = [...payers]
    newPayers[index][field] = field === 'cuil' ? formatCuil(value) : value
    setPayers(newPayers)
  }

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/portal')
        return
      }

      const storedId = session.user.id
      const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', storedId).single()
      
      if (userError || !userData) {
        throw new Error('No se encontró el perfil del usuario')
      }

      if (userData) { 
        setUser(userData); 

        const { data: deportesClub } = await supabase.from('deportes').select('*').order('name');
        if (deportesClub) setAllSports(deportesClub);

        const { data: relData } = await supabase
          .from('user_categories')
          .select(`
            category_id,
            deporte_id,
            deportes!deporte_id ( name ),
            categories (
              name
            )
          `)
          .eq('user_id', storedId);

        if (relData) {
            const formatted = relData.map((item: any) => ({
                sport: item.deportes?.name || 'S/D',
                category: item.categories?.name || 'S/D'
            }));
            setUserSportsInfo(formatted);

            const ids = relData.map((item: any) => item.deporte_id).filter(Boolean);
            setSelectedDeportes(ids);
        }

        if (userData.avatar_url) {
            const { data } = await supabase.storage
                .from('avatars')
                .createSignedUrl(userData.avatar_url, 3600); 
            if (data) setAvatarUrl(data.signedUrl);
        }

        const dbGender = (userData.gender || "").toLowerCase().trim();
        let normalizedGender = "";

        if (dbGender === 'm') normalizedGender = "M";
        else if (dbGender === 'f') normalizedGender = "F";
        else if (dbGender === 'otro' || dbGender === 'other' || dbGender === 'x') normalizedGender = "Otro";

        const full = (userData.name || "").trim();
        const hasComma = full.includes(',');

        const lastName = hasComma ? full.split(',')[0].trim() : full.split(' ')[0];
        const firstName = hasComma ? full.split(',')[1].trim() : full.substring(full.indexOf(' ') + 1).trim();

        setFormData({ 
          ...userData, 
          gender: normalizedGender,
          last_name: lastName,
          first_name: firstName,
          emergency_contact_name: userData.emergency_contact_name || '',
          emergency_contact: userData.emergency_contact || '',
          medical_notes: userData.medical_notes || ''
        }); 

        if (userData.payer_name) {
          const names = userData.payer_name.split(' / ')
          const cuils = (userData.payer_cuil || "").split(' / ')
          const parsedPayers = names.map((name: string, i: number) => ({
            name: name,
            cuil: cuils[i] || ''
          }))
          setPayers(parsedPayers)
        }
      }

      const { data: paymentsData } = await supabase.from('payments').select('*').eq('user_id', storedId).order('date', { ascending: false })
      setPayments(paymentsData || [])

    } catch (error) { 
      router.replace('/portal') 
    } finally { 
      setLoading(false)
    }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); localStorage.clear(); router.replace('/portal') }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'La foto debe pesar menos de 2.5MB' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const { data: existingFiles } = await supabase.storage.from('avatars').list(user.id);
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/profile-picture.${fileExt}`; 
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase.from('users').update({ avatar_url: filePath }).eq('id', user.id);
      if (updateError) throw updateError;

      const { data } = await supabase.storage.from('avatars').createSignedUrl(filePath, 3600);
      
      setAvatarUrl(data?.signedUrl || null);
      setUser({ ...user, avatar_url: filePath });
      setMessage({ type: 'success', text: '¡Foto actualizada!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al subir la imagen' });
    } finally {
      setUploadingAvatar(false);
    }
  }

  const toggleSport = (deporteId: number) => {
      setSelectedDeportes(prev => 
          prev.includes(deporteId) 
              ? prev.filter(id => id !== deporteId) 
              : [...prev, deporteId]
      );
  };

  const handleSaveProfile = async () => {
    if (!formData.email) return setMessage({ type: 'error', text: 'Falta completar: Email' });
    if (!formData.last_name) return setMessage({ type: 'error', text: 'Falta completar: Apellido' });
    if (!formData.first_name) return setMessage({ type: 'error', text: 'Falta completar: Nombre' });
    if (!formData.cuil) return setMessage({ type: 'error', text: 'Falta completar: CUIL' });
    if (!formData.birth_date) return setMessage({ type: 'error', text: 'Falta completar: Fecha de Nacimiento' });
    if (!formData.gender) return setMessage({ type: 'error', text: 'Falta completar: Género' });
    
    if (selectedDeportes.length === 0) return setMessage({ type: 'error', text: 'Debes elegir al menos un deporte' });
    
    if (!formData.emergency_contact_name) return setMessage({ type: 'error', text: 'Falta completar: Contacto de Emergencia' });
    if (!formData.emergency_contact) return setMessage({ type: 'error', text: 'Falta completar: Teléfono de Emergencia' });

    setSaveLoading(true);
    setMessage(null);

    if (formData.email !== user.email) {
      const { error: authError } = await supabase.auth.updateUser({ email: formData.email });
      if (authError) {
        setSaveLoading(false);
        return setMessage({ type: 'error', text: `Error de acceso: ${authError.message}` });
      }
    }

    try {
      const deportesAFijar = Array.from(new Set(selectedDeportes.map(id => Number(id))));

      const { error: rpcError } = await supabase.rpc('sync_user_sports', {
          p_user_id: user.id,
          p_deporte_ids: deportesAFijar
      });

      if (rpcError) throw rpcError;
      
      const combinedPayerNames = payers.map(p => p.name).filter(n => n !== "").join(' / ');
      const combinedPayerCuils = payers.map(p => p.cuil).filter(c => c !== "").join(' / ');

      const updates = {
        name: `${formData.last_name}, ${formData.first_name}`.trim(),
        cuil: formData.cuil, 
        email: formData.email, 
        phone: formData.phone || null, 
        address: formData.address || null,
        gender: formData.gender, 
        birth_date: formData.birth_date || null,
        emergency_contact_name: formData.emergency_contact_name, 
        emergency_contact: formData.emergency_contact, 
        medical_notes: formData.medical_notes || null,
        payer_name: combinedPayerNames || null, 
        payer_cuil: combinedPayerCuils || null,
        updated_at: new Date().toISOString()
      };

      const { error: userUpdateError } = await supabase.from('users').update(updates).eq('id', user.id);
      if (userUpdateError) throw userUpdateError;

      setIsEditing(false);
      setMessage({ type: 'success', text: '¡Datos actualizados con éxito!' });
      
      setTimeout(() => {
        fetchUserData();
        setMessage(null);
      }, 500);
      
    } catch (error: any) {
      console.error("Error en sincronización:", error);
      setMessage({ type: 'error', text: 'Error al procesar los cambios.' });
    } finally {
      setSaveLoading(false);
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) return setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' })
    if (passwords.new.length < 6) return setMessage({ type: 'error', text: 'Mínimo 6 caracteres.' })

    setPassLoading(true)
    try {
      const { error } = await supabase.from('users').update({ 
        password_plain: passwords.new,
        updated_at: new Date().toISOString()
      }).eq('id', user.id)
      
      if (error) throw error
      
      setMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' })
      setPasswords({ new: '', confirm: '' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) { 
      setMessage({ type: 'error', text: 'Error al actualizar la contraseña.' }) 
    } finally { setPassLoading(false) }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
      e.preventDefault(); 
      if (!amount || !file) return; 

      if (file.size > 2.5 * 1024 * 1024) {
          setMessage({ type: 'error', text: 'El comprobante debe pesar menos de 2.5MB' });
          return;
      }

      setUploading(true)
      try {
          let publicUrl = null
          if (file) {
              const fileName = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`
              const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file)
              if (uploadError) throw uploadError
              publicUrl = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl
          }

          const { data: userSportsCats } = await supabase
              .from('user_categories')
              .select('deportes(name), categories(name)')
              .eq('user_id', user.id)

          let finalSport = 'Sin Deporte'
          let finalCategory = 'Sin Categoría'

          if (userSportsCats && userSportsCats.length > 0) {
              const sportsList = Array.from(new Set(userSportsCats.map((uc: any) => uc.deportes?.name).filter(Boolean)))
              const catsList = Array.from(new Set(userSportsCats.map((uc: any) => uc.categories?.name).filter(Boolean)))
              
              if (sportsList.length > 0) finalSport = sportsList.join(' / ')
              if (catsList.length > 0) finalCategory = catsList.join(' / ')
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
          })

          if (insertError) throw insertError
          setUploadSuccess(true)
          setAmount('')
          setFile(null)
          fetchUserData()

      } catch (error) {
          console.error(error)
          setMessage({ type: 'error', text: 'Error al enviar el comprobante' })
      } finally {
          setUploading(false)
      }
  }

  const handleOpenPreview = async (url: string) => {
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
                  return
              }
          }
          setPreviewUrl(url)
      } catch (err) {
          setPreviewUrl(url)
      }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#1e1b4b]"><Loader2 className="animate-spin text-white" size={40}/></div>
  
  if (!user) return null;

  const visualBalance = user?.account_balance || 0;
  const displayedPayments = showAllPayments ? payments : payments?.slice(0, 5);
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans relative text-left">
      <aside className={`bg-[#1e1b4b] text-white transition-all duration-300 ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'} fixed h-full z-30 flex flex-col shadow-xl overflow-hidden text-left`}>
        <div className="p-6 flex items-center justify-between border-b border-white/10 min-w-[256px] lg:min-w-0 text-left">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 text-left">
              <div className="h-12 w-12 bg-[#1e1b4b] rounded-full flex items-center justify-center border-2 overflow-hidden shadow-md min-w-[3rem]"
                style={{ borderColor: CLIENT_CONFIG.colors.primary }}
              >
                <img 
                  src={CLIENT_CONFIG.logoUrl}
                  alt={CLIENT_CONFIG.name} 
                  className="h-full w-full object-cover scale-110" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              
              <div className="flex flex-col justify-center overflow-hidden">
                <h1 className="font-bold text-sm leading-tight uppercase tracking-tight text-white truncate">
                  {CLIENT_CONFIG.name}</h1>
              </div>
            </div>
          ) : (
            <div className="h-10 w-10 mx-auto bg-[#1e1b4b] rounded-full flex items-center justify-center border-2 border-orange-500 overflow-hidden shrink-0">
              <img   src={CLIENT_CONFIG.logoUrl} className="h-full w-full object-cover scale-125" />
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white lg:hidden text-left">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-6 min-w-[256px] lg:min-w-0 text-left">
<button onClick={() => { setActiveTab('dashboard'); if(window.innerWidth < 1024) setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${activeTab === 'dashboard' ? 'bg-[#4f46e5] text-white font-bold shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}><LayoutDashboard size={20} /> {sidebarOpen && <span>Estado de cuenta</span>}</button>
<button onClick={() => { setActiveTab('profile'); if(window.innerWidth < 1024) setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${activeTab === 'profile' ? 'bg-[#4f46e5] text-white font-bold shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}><User size={20} /> {sidebarOpen && <span>Mi Perfil</span>}</button>
<button onClick={() => { setActiveTab('payment'); if(window.innerWidth < 1024) setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${activeTab === 'payment' ? 'bg-[#4f46e5] text-white font-bold shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}><Upload size={20} /> {sidebarOpen && <span>Informar Pago</span>}</button>
          <button onClick={() => { setActiveTab('asistencia'); if(window.innerWidth < 1024) setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${activeTab === 'asistencia' ? 'bg-[#4f46e5] text-white font-bold shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}><Calendar size={20} /> {sidebarOpen && <span>Asistencia</span>}</button>
          <button 
            onClick={() => { setActiveTab('terms'); if(window.innerWidth < 1024) setSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${activeTab === 'terms' ? 'bg-[#4f46e5] text-white font-bold shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <Shield size={20} /> {sidebarOpen && <span>Términos y Condiciones</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-white/10 min-w-[256px] lg:min-w-0 text-left">
          {/* SECCIÓN DE CAMBIO DE ROL - CONECTADO A BASE DE DATOS */}
          {(() => {
            const hasAdmin = realRoles.includes('admin');
            const hasTeacher = realRoles.includes('teacher');

            if (!hasAdmin && !hasTeacher) return null;

            return (
              <>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-4">Cambiar Perfil</p>
                
                {/* BOTÓN GESTIÓN */}
                {hasAdmin && (
                  <button 
                    onClick={() => router.push('/admin/dashboard')} 
                    className="w-full flex items-center gap-3 px-4 py-3 mb-2 text-indigo-400 hover:bg-indigo-500/10 rounded-xl font-bold transition text-left group border border-indigo-500/10"
                  >
                    <Shield size={20} className="group-hover:rotate-12 transition-transform" /> 
                    {sidebarOpen && <span>Ir a Gestión</span>}
                  </button>
                )}

                {/* BOTÓN PROFESOR */}
                {hasTeacher && (
                  <button 
                    onClick={() => router.push('/portal/teacher/dashboard')} 
                    className="w-full flex items-center gap-3 px-4 py-3 mb-2 text-amber-400 hover:bg-amber-500/10 rounded-xl font-bold transition text-left group border border-amber-500/10"
                  >
                    <User size={20} className="group-hover:rotate-12 transition-transform" /> 
                    {sidebarOpen && <span>Ir a Panel Profe</span>}
                  </button>
                )}
                <div className="my-2 border-t border-white/5"></div>
              </>
            );
          })()}

          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-bold transition text-left">
            <LogOut size={20} /> {sidebarOpen && <span>Salir</span>}
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden text-left" onClick={() => setSidebarOpen(false)}></div>}

      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} p-4 md:p-8 text-left`}>
        <div className="lg:hidden mb-4 flex items-center gap-3 text-left">
          <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-[#1e1b4b] text-left"><Menu size={24}/></button>
          <h1 className="font-black italic text-sm text-[#1e1b4b] uppercase text-left">{CLIENT_CONFIG.name}</h1>
        </div>
        {activeTab === 'asistencia' && renderAttendanceCalendar()}

            {activeTab === 'dashboard' && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 text-left">
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
              <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-8 mb-8 relative overflow-hidden text-left">
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${visualBalance < 0 ? 'bg-red-500' : (visualBalance === 0 ? 'bg-gray-300' : 'bg-green-500')} text-left`}></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                    <div className="text-left">
                        <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-2 text-left">ESTADO DE CUENTA (CONFIRMADO)</p>
                        <h3 className={`text-2xl md:text-4xl font-black break-words text-left ${visualBalance < 0 ? 'text-red-600' : (visualBalance === 0 ? 'text-gray-400' : 'text-green-600')} text-left`}>
                            {visualBalance < 0 ? 'Debe: ' : (visualBalance === 0 ? 'Saldo: ' : 'A favor: ')} 
                            ${Math.abs(visualBalance).toLocaleString()}
                        </h3>
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
            onClick={() => window.location.reload()} 
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
                                const isAdjustment = p.method === 'adjustment' 
                                const isDebit = p.amount < 0
                                const isPending = p.status === 'pending'
                                const isRejected = p.status === 'rejected'
                                const isFee = p.method === 'cuota'
                                const hasProof = p.method === 'transfer' && p.proof_url

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
                                )
                            })}
                        </div>
                    ) : ( <div className="p-8 text-center text-gray-400 text-[10px] uppercase font-bold text-left">Sin movimientos registrados</div> )}
                </div>
              </div>
          </div>
        )}

        {previewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 md:p-4 backdrop-blur-sm text-left" onClick={() => setPreviewUrl(null)}>
              <div className={`relative bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] w-full text-left ${fileType === 'pdf' ? 'max-w-4xl h-[80vh]' : 'max-w-5xl h-auto'}`} onClick={e => e.stopPropagation()}>
                  <div className="p-3 bg-gray-50 border-b flex justify-between items-center shrink-0 text-left">
                       <div className="flex items-center gap-3 text-left"><h3 className="font-bold text-gray-800 text-[10px] md:text-sm uppercase text-left">Comprobante</h3><a href={previewUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 text-[9px] md:text-xs font-bold bg-indigo-50 px-2 py-1 rounded text-left"><ExternalLink size={12}/> Abrir original</a></div>
                      <button onClick={() => setPreviewUrl(null)} className="p-1.5 text-gray-600 hover:bg-gray-300 rounded-full transition text-left"><X size={20} /></button>
                  </div>
                  <div className="flex-1 bg-gray-200 relative flex items-center justify-center p-2 overflow-auto text-left">
                      {fileType === 'image' ? <img src={previewUrl} className="max-w-full max-h-[85vh] object-contain rounded shadow-sm bg-white text-left" /> : <iframe src={previewUrl} className="w-full h-full border-0 rounded bg-white shadow-sm text-left" />}
                  </div>
              </div>
          </div>
        )}

        {activeTab === 'profile' && (
  <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-10 text-left">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4 text-left">
      <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase text-left">MI FICHA</h2>
      {!isEditing ? (
        <button onClick={() => setIsEditing(true)} className="w-full md:w-auto bg-[#4f46e5] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg text-left"><Edit2 size={18}/> Editar</button>
      ) : (
        <div className="flex gap-3 w-full md:w-auto text-left">
          <button onClick={() => { setIsEditing(false); setFormError(null); }} className="flex-1 md:flex-none bg-white border border-gray-300 px-5 py-2.5 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-50 shadow-sm text-left">Cancelar</button>
          <button 
            onClick={() => {
              if (paymentResponsible === 'third_party') {
                const incompleto = payers.some(p => !p.name?.trim() || !p.cuil?.trim());
                if (incompleto) {
                  setFormError("Nombre y CUIL son obligatorios para terceros.");
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  return;
                }

                const cuilInvalido = payers.some(p => {
                  const numbersOnly = p.cuil.replace(/\D/g, '');
                  return numbersOnly.length !== 11;
                });

                if (cuilInvalido) {
                  setFormError("El CUIL debe tener exactamente 11 dígitos (XX-XXXXXXXX-X).");
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  return;
                }
              }
              setFormError(null);
              handleSaveProfile();
            }} 
            disabled={saveLoading} 
            className="flex-1 md:flex-none bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg text-left"
          >
            {saveLoading ? <Loader2 className="animate-spin text-left" size={18}/> : <Save size={18}/>} Confirmar
          </button>
        </div>
      )}
    </div>
    
    <div className="space-y-8 text-left">
      {formError && (
        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl animate-in zoom-in duration-300 flex items-center gap-3">
          <div className="bg-red-500 text-white p-1 rounded-full">
            <X size={16} strokeWidth={3} />
          </div>
          <p className="text-red-800 font-black uppercase text-xs tracking-tight">
            {formError}
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden p-6 md:p-8 flex flex-col items-center text-center">
        <div className="relative group">
          <div className="h-24 w-24 md:h-32 md:w-32 rounded-full overflow-hidden border-4 border-indigo-50 bg-gray-100 flex items-center justify-center shadow-inner relative">
            {avatarUrl ? (
              <img src={avatarUrl} className="h-full w-full object-cover animate-in fade-in" alt="Perfil" />
            ) : (
              <User size={48} className="text-gray-300" />
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={24} />
              </div>
            )}
          </div>
          <label className="absolute bottom-0 right-0 p-2 bg-[#4f46e5] text-white rounded-full shadow-lg cursor-pointer hover:bg-indigo-700 transition transform hover:scale-110">
            <Camera size={16} />
            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
          </label>
        </div>
        <div className="mt-4">
          <h3 className="font-black text-gray-800 uppercase tracking-tight text-lg">{user.name}</h3>
          <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Máximo 2.5MB</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden p-5 md:p-8 text-left">
        <div className="mb-6 border-b border-gray-200 pb-2 text-left">
          <h3 className="flex items-center gap-2 text-[10px] md:text-xs font-black text-indigo-700 uppercase tracking-widest text-left"><ShieldCheck size={16} /> Datos de Cuenta</h3>
        </div>
        <div className="mb-6 text-left">
        <label className="block text-[10px] font-bold text-gray-700 mb-1.5 uppercase ml-1 text-left flex items-center gap-1">Email <span className="text-red-500 font-black text-xs">*</span></label>
        <input disabled={!isEditing} type="email" value={isEditing ? formData.email : user.email} onChange={e => setFormData({...formData, email: e.target.value})} className={`w-full p-3 border rounded-xl font-bold text-sm outline-none transition text-left ${isEditing ? 'border-gray-400 focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white' : 'border-gray-200 bg-gray-50 text-gray-900'}`}/>
        
        {isEditing && (
          <p className="mt-2 ml-1 text-[10px] font-bold text-indigo-600 uppercase tracking-tight animate-in fade-in slide-in-from-top-1">
              IMPORTANTE: Si modificás tu email, deberás validarlo desde tu nueva casilla para mantener el acceso al sistema.
          </p>
        )}
      </div>

        <div className="mb-6 border-b border-gray-200 pb-2 text-left">
          <h3 className="flex items-center gap-2 text-[10px] md:text-xs font-black text-indigo-700 uppercase tracking-widest text-left"><CreditCard size={16} /> Responsable de Pagos</h3>
        </div>
        
        <div className="space-y-4 text-left">
          <div className="flex flex-wrap gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100 mb-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                disabled={!isEditing}
                type="radio"
                name="payment_type"
                value="self"
                checked={paymentResponsible === 'self'}
                onChange={() => setPaymentResponsible('self')}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">
                Yo realizaré las transferencias
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                disabled={!isEditing}
                type="radio"
                name="payment_type"
                value="third_party"
                checked={paymentResponsible === 'third_party'}
                onChange={() => setPaymentResponsible('third_party')}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">
                Un tercero (Padre/Madre/Tutor)
              </span>
            </label>
          </div>

          {paymentResponsible === 'third_party' && (
            <div className="space-y-4">
              {payers.map((payer, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end bg-gray-50/50 p-4 rounded-xl border border-gray-100 text-left">
                  <div className="space-y-1 text-left">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase ml-1 text-left flex items-center gap-1">
                      Nombre Responsable {index + 1} <span className="text-red-500 font-black text-xs">*</span>
                    </label>
                    <input 
                      disabled={!isEditing} 
                      type="text" 
                      required 
                      value={payer.name} 
                      onChange={e => handlePayerChange(index, 'name', e.target.value)} 
                      className={`w-full p-3 border rounded-xl font-bold text-sm outline-none transition text-left ${isEditing ? 'border-gray-400 focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white' : 'border-gray-200 bg-gray-50 text-gray-900'}`} 
                      placeholder="Ej: Padre/Madre/Tutor"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase ml-1 text-left flex items-center gap-1">
                      CUIL Responsable {index + 1} <span className="text-red-500 font-black text-xs">*</span>
                    </label>
                    <input 
                      disabled={!isEditing} 
                      type="text" 
                      required 
                      value={payer.cuil} 
                      onChange={e => handlePayerChange(index, 'cuil', e.target.value)} 
                      className={`w-full p-3 border rounded-xl font-bold text-sm outline-none transition text-left ${isEditing ? 'border-gray-400 focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white' : 'border-gray-200 bg-gray-50 text-gray-900'}`} 
                      placeholder="20-XXXXXXXX-X"
                    />
                  </div>
                  {isEditing && payers.length > 1 && (
                    <button type="button" onClick={() => handleRemovePayer(index)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition text-left"><Trash2 size={18} /></button>
                  )}
                </div>
              ))}
              {isEditing && (
                <button type="button" onClick={handleAddPayer} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-black text-[10px] uppercase hover:bg-indigo-100 transition border border-indigo-200 shadow-sm text-left"><Plus size={16} /> Agregar otro responsable de pagos</button>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 mb-6 border-b border-gray-200 pb-2 text-left">
          <h3 className="flex items-center gap-2 text-[10px] md:text-xs font-black text-indigo-700 uppercase tracking-widest text-left"><User size={16} /> Información Personal</h3>
        </div>
        <div className="space-y-4 text-left">
          <div className={`p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 mb-2 transition-all ${isEditing ? 'opacity-100' : 'opacity-80'} text-left`}>
  <label className="flex items-center gap-2 text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-3 ml-1 text-left">
    <Trophy size={14}/> Idiomas Ofrecidos <span className="text-red-500 font-black text-xs">*</span>
  </label>
  <div className="flex flex-wrap gap-2 text-left">
    {allSports.map((sport) => (
      <button
        key={sport.deporte_id}
        type="button" 
        disabled={!isEditing}
        onClick={() => toggleSport(sport.deporte_id)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border ${
          selectedDeportes.includes(sport.deporte_id)
          ? 'bg-[#4f46e5] text-white border-[#4f46e5] shadow-md shadow-indigo-200' 
          : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
        } disabled:cursor-default text-left`}
      >
        {sport.name}
        {selectedDeportes.includes(sport.deporte_id) && (
          <Check size={14} className="animate-in zoom-in text-left"/>
        )}
      </button>
    ))}
  </div>
  {isEditing && (
    <p className="mt-3 ml-1 text-[9px] font-bold text-indigo-400 uppercase italic">
      * Al seleccionar un deporte nuevo, la administración te asignará una categoría a la brevedad.
    </p>
  )}
</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="space-y-1 text-left">
              <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 text-left flex items-center gap-1">Apellido <span className="text-red-500 font-black text-xs">*</span></label>
              <input disabled={!isEditing} type="text" value={formData.last_name || ''} onChange={e => setFormData({...formData, last_name: e.target.value})} className={`w-full p-3 border rounded-xl font-bold text-sm outline-none text-left ${isEditing ? 'bg-white border-gray-400 text-gray-900' : 'bg-gray-50 border-gray-200 text-gray-900'}`}/>
            </div>
            <div className="space-y-1 text-left">
              <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 text-left flex items-center gap-1">Nombre <span className="text-red-500 font-black text-xs">*</span></label>
              <input disabled={!isEditing} type="text" value={formData.first_name || ''} onChange={e => setFormData({...formData, first_name: e.target.value})} className={`w-full p-3 border rounded-xl font-bold text-sm outline-none text-left ${isEditing ? 'bg-white border-gray-400 text-gray-900' : 'bg-gray-50 border-gray-200 text-gray-900'}`}/>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="space-y-1 text-left">
              <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 text-left flex items-center gap-1">CUIL <span className="text-red-500 font-black text-xs">*</span></label>
              <input disabled={!isEditing} type="text" value={isEditing ? formData.cuil : user.cuil} onChange={e => handleCuilChange(e.target.value)} className={`w-full p-3 border rounded-xl font-bold text-sm outline-none text-left ${isEditing ? 'bg-white border-gray-400 text-gray-900' : 'bg-gray-50 border-gray-200 text-gray-900'}`}/>
            </div>
            <div className="space-y-1 text-left">
              <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 text-left flex items-center gap-1">Fecha de Nacimiento <span className="text-red-500 font-black text-xs">*</span></label>
              <input disabled={!isEditing} type="date" value={isEditing ? (formData.birth_date || '') : (user.birth_date || '')} onChange={e => setFormData({...formData, birth_date: e.target.value})} className={`w-full p-3 border rounded-xl font-bold text-sm outline-none text-left ${isEditing ? 'bg-white border-gray-400 text-gray-900' : 'bg-gray-50 border-gray-200 text-gray-900'}`}/>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="space-y-1 text-left">
              <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 text-left">Teléfono</label>
              <input disabled={!isEditing} type="text" value={isEditing ? formData.phone : user.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={`w-full p-3 border rounded-xl font-bold text-sm outline-none text-left ${isEditing ? 'bg-white border-gray-400 text-gray-900' : 'bg-gray-50 border-gray-200 text-gray-900'}`}/>
            </div>
            <div className="space-y-1 text-left">
              <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 text-left flex items-center gap-1">Género <span className="text-red-500 font-black text-xs">*</span></label>
              {isEditing ? (
                <select value={formData.gender || ''} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl font-bold text-gray-900 text-sm outline-none bg-white text-left">
                  <option value="">Seleccionar...</option><option value="M">Masculino</option><option value="F">Femenino</option><option value="Otro">Otro</option>
                </select>
              ) : ( <div className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl font-bold text-gray-900 text-sm text-left">{formData.gender || '-'}</div> )}
            </div>
          </div>
          <div className="space-y-1 text-left">
            <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 text-left">Dirección</label>
            <input disabled={!isEditing} type="text" value={isEditing ? formData.address : user.address} onChange={e => setFormData({...formData, address: e.target.value})} className={`w-full p-3 border rounded-xl font-bold text-sm outline-none text-left ${isEditing ? 'bg-white border-gray-400 text-gray-900' : 'bg-gray-50 border-gray-200 text-gray-900'}`}/>
          </div>
        </div>

        <div className="mt-8 mb-6 border-b border-red-200 pb-2 text-left">
          <h3 className="flex items-center gap-2 text-[10px] md:text-xs font-black text-red-600 uppercase tracking-widest text-left"><Shield size={16} /> Emergencia y Salud</h3>
        </div>
        <div className="p-4 bg-red-50 rounded-xl border border-red-100 mb-6 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-left">
            <div className="space-y-1 text-left">
              <label className="block text-[10px] font-bold text-red-900 uppercase ml-1 text-left flex items-center gap-1">Contacto <span className="text-red-500 font-black text-xs">*</span></label>
              <input disabled={!isEditing} type="text" value={formData.emergency_contact_name || ''} onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})} className={`w-full p-3 border rounded-xl font-bold text-sm outline-none text-left ${isEditing ? 'bg-white border-red-400 text-gray-900' : 'bg-red-100/50 border-red-200 text-gray-900'}`}/>
            </div>
            <div className="space-y-1 text-left">
              <label className="block text-[10px] font-bold text-red-900 uppercase ml-1 text-left flex items-center gap-1">Tel. Emergencia <span className="text-red-500 font-black text-xs">*</span></label>
              <input disabled={!isEditing} type="text" value={formData.emergency_contact || ''} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} className={`w-full p-3 border rounded-xl font-bold text-sm outline-none text-left ${isEditing ? 'bg-white border-red-400 text-gray-900' : 'bg-red-100/50 border-red-200 text-gray-900'}`}/>
            </div>
          </div>
          <div className="space-y-1 text-left">
            <label className="block text-[10px] font-bold text-red-900 uppercase ml-1 text-left">Observaciones Médicas</label>
            <textarea disabled={!isEditing} rows={3} value={formData.medical_notes || ''} onChange={e => setFormData({...formData, medical_notes: e.target.value})} className={`w-full p-3 border rounded-xl font-bold text-sm outline-none transition resize-none text-left ${isEditing ? 'bg-white border-red-400 text-gray-900' : 'bg-red-100/50 border-red-200 text-gray-900'}`}></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

        {activeTab === 'payment' && (
    <div className="max-w-lg mx-auto py-6 md:py-10 animate-in fade-in slide-in-from-bottom-4 text-left">
        {!uploadSuccess ? (
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
                <div className="h-12 w-12 md:h-16 md:w-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4"><Upload size={28} /></div>
                <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase mb-1">Informar Pago</h2>
                <p className="text-gray-500 text-xs md:text-sm mb-6 md:mb-8 italic">Informá el comprobante de tu transferencia aquí.</p>
                
                <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-left">
                    <p className="text-[10px] font-black text-indigo-900/40 uppercase tracking-widest mb-3 text-center">Tocá los datos para copiarlos</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div 
                            className="cursor-pointer hover:bg-indigo-100/80 p-3 rounded-xl transition-all group relative active:scale-95"
                            onClick={() => {
                                const text = CLIENT_CONFIG.alias_club;
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
                                console.log('Alias copiado');
                            }}
                        >
                            <p className="text-[9px] font-bold text-indigo-400 uppercase mb-0.5">Alias</p>
                            <p className="text-sm font-black text-indigo-950 tracking-tight flex items-center justify-between">
                                {CLIENT_CONFIG.alias_club}
                                <span className="text-indigo-400 group-active:text-orange-500 transition-colors">
                                    <FileText size={14} />
                                </span>
                            </p>
                        </div>
                        <div 
                            className="md:border-l md:border-indigo-100 md:pl-4 cursor-pointer hover:bg-indigo-100/80 p-3 rounded-xl transition-all group relative active:scale-95"
                            onClick={() => {
                                const text = CLIENT_CONFIG.cbu_club;
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
                                console.log('CBU copiado');
                            }}
                        >
                            <p className="text-[9px] font-bold text-indigo-400 uppercase mb-0.5">CBU</p>
                            <p className="text-[11px] font-bold text-indigo-950 leading-tight flex items-center justify-between">
                                {CLIENT_CONFIG.cbu_club}
                                <span className="text-indigo-400 group-active:text-orange-500 transition-colors">
                                    <FileText size={14} />
                                </span>
                            </p>
                        </div>
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

                <form onSubmit={handlePaymentSubmit} className="space-y-5 md:space-y-6 text-left">
                    <div className="text-left">
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-2">Monto Transferido ($)</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 md:p-4 text-xl md:text-2xl font-black border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 text-gray-900 placeholder-gray-400" placeholder="0.00" required/>
                        {amount && (
                            <p className="mt-2 text-[10px] font-bold text-orange-600 animate-pulse bg-orange-50 p-2 rounded-lg border border-orange-100 flex items-center gap-2">
                                ⚠️ Monto a informar: <span className="text-xs">${Number(amount).toLocaleString()}</span>
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
                        className="w-full bg-orange-600 text-white py-4 rounded-xl font-black uppercase hover:bg-orange-700 transition shadow-lg disabled:bg-gray-300 disabled:shadow-none text-sm text-center"
                    >
                        {uploading ? <Loader2 className="animate-spin mx-auto"/> : 'ENVIAR COMPROBANTE'}
                    </button>
                </form>
            </div>
        ) : (
            <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl text-center border-t-4 border-green-500"><CheckCircle size={50} className="text-green-500 mx-auto mb-4"/><h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase">¡Enviado!</h2><p className="text-gray-500 text-sm mb-6">Tu pago está en revisión.</p><button onClick={() => setUploadSuccess(false)} className="text-indigo-600 font-bold hover:underline text-sm">Nuevo pago</button></div>
        )}
    </div>
)}
        {/* SECCIÓN TÉRMINOS Y CONDICIONES */}
        {activeTab === 'terms' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-10 text-left">
                <div className="mb-6">
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase">Términos y Condiciones</h2>
                    <p className="text-gray-500 text-sm">Acuerdo legal del socio con {CLIENT_CONFIG.name}.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-left">
                    <div className="p-6 md:p-10 space-y-6 text-sm md:text-base text-gray-700 leading-relaxed overflow-y-auto max-h-[70vh]">
                        <section>
                            <h3 className="font-black text-gray-900 uppercase mb-2">1. Aceptación de los Términos</h3>
                            <p>Al registrarse como socio, el usuario acepta cumplir con el estatuto interno de {CLIENT_CONFIG.name} y las normas de convivencia establecidas.</p>
                        </section>
                        <section>
                            <h3 className="font-black text-gray-900 uppercase mb-2">2. Pago de Cuotas</h3>
                            <p>El socio se compromete al pago mensual de la cuota social. La mora prolongada facultará a la administración a revisar la continuidad en las actividades.</p>
                        </section>

                        <div className="mt-8 pt-6 border-t border-gray-100 italic text-gray-400 text-xs">
                            Última actualización: Febrero 2026. {CLIENT_CONFIG.name}.
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>

      {/* MENSAJES DE ÉXITO/ERROR CON OPERADOR DE SEGURIDAD */}
      {message && (
            <div className={`fixed bottom-8 right-8 z-[60] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 border-l-8 ${message?.type === 'success' ? 'bg-white border-green-500' : 'bg-white border-red-500'} text-left`}>
                <div className={`${message?.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                    {message?.type === 'success' ? <CheckCircle size={28}/> : <XCircle size={28}/>}
                </div>
                <div className="text-left">
                    <h4 className={`font-bold uppercase text-[10px] tracking-wider ${message?.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {message?.type === 'success' ? '¡Éxito!' : 'Atención'}
                    </h4>
                    <p className="font-semibold text-gray-700 text-xs">{message?.text}</p>
                </div>
            </div>
      )}
    </div>
  )
}