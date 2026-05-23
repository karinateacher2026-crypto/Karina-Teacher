'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  User, Edit2, Loader2, Save, X, Camera, ShieldCheck, 
  CreditCard, Trash2, Plus, Trophy, Check, Shield, XCircle, CheckCircle, Phone, Mail
} from 'lucide-react';

export default function PerfilSocioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Estados para Edición
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Estados para Deportes
  const [allSports, setAllSports] = useState<any[]>([]);
  const [selectedDeportes, setSelectedDeportes] = useState<number[]>([]);
  
  // Estados para Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Estados para Responsable de Pagos
  const [payers, setPayers] = useState<{ name: string; cuil: string }[]>([{ name: '', cuil: '' }]);
  const [paymentResponsible, setPaymentResponsible] = useState('self');

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/portal');
        return;
      }

      const storedId = session.user.id;
      const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', storedId).single();
      
      if (userError || !userData) throw new Error('No se encontró el perfil del usuario');

      setUser(userData);

      // Traer todos los deportes disponibles en el club
      const { data: deportesClub } = await supabase.from('deportes').select('*').order('name');
      if (deportesClub) setAllSports(deportesClub);

      // Traer deportes asociados al usuario
      const { data: relData } = await supabase
        .from('user_categories')
        .select('deporte_id')
        .eq('user_id', storedId);

      if (relData) {
        const ids = relData.map((item: any) => item.deporte_id).filter(Boolean);
        setSelectedDeportes(ids);
      }

      // Cargar Avatar
      if (userData.avatar_url) {
        const { data } = await supabase.storage
          .from('avatars')
          .createSignedUrl(userData.avatar_url, 3600); 
        if (data) setAvatarUrl(data.signedUrl);
      }

      // Formateo de datos iniciales
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

      // Configurar pagadores
      if (userData.payer_name) {
        const names = userData.payer_name.split(' / ');
        const cuils = (userData.payer_cuil || "").split(' / ');
        const parsedPayers = names.map((name: string, i: number) => ({
          name: name,
          cuil: cuils[i] || ''
        }));
        setPayers(parsedPayers);
        setPaymentResponsible('third_party');
      } else {
        setPaymentResponsible('self');
      }

    } catch (error) { 
      router.replace('/portal');
    } finally { 
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchUserData(); 
  }, []);

  // Utilidades de CUIL y Pagadores
  const formatCuil = (val: string) => {
    let value = val.replace(/\D/g, ""); 
    if (value.length > 11) value = value.slice(0, 11);
    let formatted = value;
    if (value.length > 2) formatted = `${value.slice(0, 2)}-${value.slice(2)}`;
    if (value.length > 10) formatted = `${formatted.slice(0, 11)}-${value.slice(10, 11)}`;
    return formatted;
  };

  const handleCuilChange = (val: string) => {
    setFormData({ ...formData, cuil: formatCuil(val) });
  };

  const handleAddPayer = () => setPayers([...payers, { name: '', cuil: '' }]);
  const handleRemovePayer = (index: number) => {
    if (payers.length > 1) {
      setPayers(payers.filter((_, i) => i !== index));
    }
  };
  
  const handlePayerChange = (index: number, field: 'name' | 'cuil', value: string) => {
    const newPayers = [...payers];
    newPayers[index][field] = field === 'cuil' ? formatCuil(value) : value;
    setPayers(newPayers);
  };

  const toggleSport = (deporteId: number) => {
      setSelectedDeportes(prev => 
          prev.includes(deporteId) 
              ? prev.filter(id => id !== deporteId) 
              : [...prev, deporteId]
      );
  };

  // Subida de Avatar
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
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al subir la imagen' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Guardado de Perfil
  const handleSaveProfile = async () => {
    if (!formData.email) return setFormError('Falta completar: Email');
    if (!formData.last_name) return setFormError('Falta completar: Apellido');
    if (!formData.first_name) return setFormError('Falta completar: Nombre');
    if (!formData.cuil) return setFormError('Falta completar: CUIL');
    if (!formData.birth_date) return setFormError('Falta completar: Fecha de Nacimiento');
    if (!formData.gender) return setFormError('Falta completar: Género');
    if (selectedDeportes.length === 0) return setFormError('Debes elegir al menos un idioma');
    if (!formData.emergency_contact_name) return setFormError('Falta completar: Contacto de Emergencia');
    if (!formData.emergency_contact) return setFormError('Falta completar: Teléfono de Emergencia');

    setSaveLoading(true);
    setFormError(null);

    if (formData.email !== user.email) {
      const { error: authError } = await supabase.auth.updateUser({ email: formData.email });
      if (authError) {
        setSaveLoading(false);
        return setFormError(`Error de acceso: ${authError.message}`);
      }
    }

    try {
      const deportesAFijar = Array.from(new Set(selectedDeportes.map(id => Number(id))));
      const { error: rpcError } = await supabase.rpc('sync_user_sports', {
          p_user_id: user.id,
          p_deporte_ids: deportesAFijar
      });

      if (rpcError) throw rpcError;
      
      let combinedPayerNames = null;
      let combinedPayerCuils = null;

      if (paymentResponsible === 'third_party') {
        combinedPayerNames = payers.map(p => p.name).filter(n => n !== "").join(' / ');
        combinedPayerCuils = payers.map(p => p.cuil).filter(c => c !== "").join(' / ');
      }

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
        payer_name: combinedPayerNames, 
        payer_cuil: combinedPayerCuils,
        updated_at: new Date().toISOString()
      };

      const { error: userUpdateError } = await supabase.from('users').update(updates).eq('id', user.id);
      if (userUpdateError) throw userUpdateError;

      setIsEditing(false);
      setMessage({ type: 'success', text: '¡Datos actualizados con éxito!' });
      
      setTimeout(() => {
        fetchUserData();
        setMessage(null);
      }, 2000);
      
    } catch (error: any) {
      console.error("Error en sincronización:", error);
      setMessage({ type: 'error', text: 'Error al procesar los cambios.' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePreSubmit = () => {
    if (paymentResponsible === 'third_party') {
      const incompleto = payers.some(p => !p.name?.trim() || !p.cuil?.trim());
      if (incompleto) {
        setFormError("Nombre y CUIL son obligatorios para terceros.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const cuilInvalido = payers.some(p => p.cuil.replace(/\D/g, '').length !== 11);
      if (cuilInvalido) {
        setFormError("El CUIL debe tener exactamente 11 dígitos (XX-XXXXXXXX-X).");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    setFormError(null);
    handleSaveProfile();
  };

  if (loading) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;
  }

  if (!user) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 p-4 md:p-8">
      {/* HEADER CENTRAL */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 max-w-4xl mx-auto">
        <div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Panel del Profesor</p>
          <h2 className="text-3xl md:text-5xl font-black text-indigo-950 uppercase italic tracking-tighter leading-none">
            MI PERFIL
          </h2>
        </div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="w-full md:w-auto bg-[#4f46e5] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg text-left">
            <Edit2 size={18}/> Editar
          </button>
        ) : (
          <div className="flex gap-3 w-full md:w-auto text-left">
            <button onClick={() => { setIsEditing(false); setFormError(null); }} className="flex-1 md:flex-none bg-white border border-gray-300 px-5 py-2.5 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-50 shadow-sm text-left">
              Cancelar
            </button>
            <button 
              onClick={handlePreSubmit} 
              disabled={saveLoading} 
              className="flex-1 md:flex-none bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg text-left"
            >
              {saveLoading ? <Loader2 className="animate-spin text-left" size={18}/> : <Save size={18}/>} Confirmar
            </button>
          </div>
        )}
      </header>
      
      <div className="space-y-8 text-left max-w-4xl mx-auto">
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

        {/* FOTO DE PERFIL (SOLUCIONADO: Ajuste del botón de cámara y proporciones de imagen) */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center">
          <div className="relative inline-block group">
            {/* Contenedor estricto con tamaño fijo y rounded-full */}
            <div className="h-28 w-28 md:h-32 md:w-32 rounded-full overflow-hidden border-4 border-indigo-50 bg-gray-50 flex items-center justify-center shadow-inner relative z-10">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  className="h-full w-full object-cover animate-in fade-in" 
                  alt="Perfil" 
                  style={{ objectPosition: 'center', display: 'block' }} 
                />
              ) : (
                <User size={64} className="text-gray-300 translate-y-3" strokeWidth={1.5} />
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                  <Loader2 className="animate-spin text-white" size={24} />
                </div>
              )}
            </div>
            {/* Botón de cámara */}
            <label className="absolute bottom-0 right-0 z-30 p-2 md:p-2.5 bg-indigo-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-indigo-700 transition transform hover:scale-110 border-4 border-white flex items-center justify-center">
              <Camera size={16} />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            </label>
          </div>
          <div className="mt-4">
            <h3 className="font-black text-gray-800 uppercase text-lg md:text-xl mt-2 tracking-tight">{user.name}</h3>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">MÁXIMO 2.5MB</p>
          </div>
        </div>

        {/* FORMULARIO */}
        <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 p-6 md:p-10 text-left">
          
          {/* CUENTA */}
          <section>
            <h4 className="flex items-center gap-2 text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em] mb-4"><ShieldCheck size={16} /> Datos de Acceso</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-gray-700 uppercase ml-1">Email</label>
                <input disabled={!isEditing} type="email" value={isEditing ? formData.email : user.email} onChange={e => setFormData({...formData, email: e.target.value})} className={`w-full p-3.5 border-2 rounded-2xl font-bold text-sm transition-all outline-none text-left ${isEditing ? 'border-gray-300 focus:border-indigo-600 text-gray-900 bg-white' : 'border-gray-100 bg-gray-50 text-gray-500'}`}/>
              </div>
            </div>
            {isEditing && (
              <p className="mt-2 ml-1 text-[10px] font-bold text-indigo-600 uppercase tracking-tight animate-in fade-in slide-in-from-top-1">
                  IMPORTANTE: Si modificás tu email, deberás validarlo desde tu nueva casilla para mantener el acceso al sistema.
              </p>
            )}
          </section>

          {/* INFORMACIÓN PERSONAL Y DEPORTES */}
          <section className="mt-8">
            <h4 className="flex items-center gap-2 text-[10px] font-black text-gray-700 uppercase tracking-[0.2em] mb-4"><User size={16} /> Información Personal</h4>
            <div className="space-y-4 text-left">
              
              <div className={`p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 mb-2 transition-all ${isEditing ? 'opacity-100' : 'opacity-80'} text-left`}>
                <h4 className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">
                  <Trophy size={16}/> Idiomas Asignados <span className="text-red-500 font-black text-xs">*</span>
                </h4>
                <div className="flex flex-wrap gap-2 text-left">
                  {allSports.map((sport) => (
                    <button
                      key={sport.deporte_id}
                      type="button" 
                      disabled={!isEditing}
                      onClick={() => toggleSport(sport.deporte_id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border ${
                        selectedDeportes.includes(sport.deporte_id)
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
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
                    * Al seleccionar un idioma nuevo, la administración te asignará un curso a la brevedad.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-gray-700 uppercase ml-1 text-left flex items-center gap-1">Apellido <span className="text-red-500 font-black text-xs">*</span></label>
                  <input disabled={!isEditing} type="text" value={formData.last_name || ''} onChange={e => setFormData({...formData, last_name: e.target.value})} className={`w-full p-3.5 border-2 rounded-2xl font-bold text-sm transition-all outline-none text-left ${isEditing ? 'bg-white border-gray-300 focus:border-indigo-600 text-gray-900' : 'bg-gray-50 border-gray-100 text-gray-900'}`}/>
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-gray-700 uppercase ml-1 text-left flex items-center gap-1">Nombre <span className="text-red-500 font-black text-xs">*</span></label>
                  <input disabled={!isEditing} type="text" value={formData.first_name || ''} onChange={e => setFormData({...formData, first_name: e.target.value})} className={`w-full p-3.5 border-2 rounded-2xl font-bold text-sm transition-all outline-none text-left ${isEditing ? 'bg-white border-gray-300 focus:border-indigo-600 text-gray-900' : 'bg-gray-50 border-gray-100 text-gray-900'}`}/>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-gray-700 uppercase ml-1 text-left flex items-center gap-1">CUIL <span className="text-red-500 font-black text-xs">*</span></label>
                  <input disabled={!isEditing} type="text" value={isEditing ? formData.cuil : user.cuil} onChange={e => handleCuilChange(e.target.value)} className={`w-full p-3.5 border-2 rounded-2xl font-bold text-sm transition-all outline-none text-left ${isEditing ? 'bg-white border-gray-300 focus:border-indigo-600 text-gray-900' : 'bg-gray-50 border-gray-100 text-gray-900'}`}/>
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-gray-700 uppercase ml-1 text-left flex items-center gap-1">Nacimiento <span className="text-red-500 font-black text-xs">*</span></label>
                  <input disabled={!isEditing} type="date" value={isEditing ? (formData.birth_date || '') : (user.birth_date || '')} onChange={e => setFormData({...formData, birth_date: e.target.value})} className={`w-full p-3.5 border-2 rounded-2xl font-bold text-sm transition-all outline-none text-left ${isEditing ? 'bg-white border-gray-300 focus:border-indigo-600 text-gray-900' : 'bg-gray-50 border-gray-100 text-gray-900'}`}/>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-gray-700 uppercase ml-1 text-left">Teléfono</label>
                  <input disabled={!isEditing} type="text" value={isEditing ? formData.phone : user.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={`w-full p-3.5 border-2 rounded-2xl font-bold text-sm transition-all outline-none text-left ${isEditing ? 'bg-white border-gray-300 focus:border-indigo-600 text-gray-900' : 'bg-gray-50 border-gray-100 text-gray-900'}`}/>
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-gray-700 uppercase ml-1 text-left flex items-center gap-1">Género <span className="text-red-500 font-black text-xs">*</span></label>
                  {isEditing ? (
                    <select value={formData.gender || ''} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full p-3.5 border-2 border-gray-300 focus:border-indigo-600 rounded-2xl font-bold text-gray-900 text-sm outline-none bg-white text-left transition-all">
                      <option value="">Seleccionar...</option><option value="M">Masculino</option><option value="F">Femenino</option><option value="Otro">Otro</option>
                    </select>
                  ) : ( 
                    <div className="w-full p-3.5 border-2 border-gray-100 bg-gray-50 rounded-2xl font-bold text-gray-900 text-sm text-left">{formData.gender || '-'}</div> 
                  )}
                </div>
              </div>
              
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-gray-700 uppercase ml-1 text-left">Dirección</label>
                <input disabled={!isEditing} type="text" value={isEditing ? formData.address : user.address} onChange={e => setFormData({...formData, address: e.target.value})} className={`w-full p-3.5 border-2 rounded-2xl font-bold text-sm transition-all outline-none text-left ${isEditing ? 'bg-white border-gray-300 focus:border-indigo-600 text-gray-900' : 'bg-gray-50 border-gray-100 text-gray-900'}`}/>
              </div>
            </div>
          </section>

          {/* SECCIÓN: EMERGENCIA Y SALUD */}
          <section className="bg-red-50 p-6 rounded-2xl border-2 border-red-100 mt-8">
            <h4 className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-4"><Shield size={16} /> Emergencia y Salud</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-left">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-red-700 uppercase ml-1 flex items-center gap-1">Contacto <span className="text-red-500 font-black text-xs">*</span></label>
                <input disabled={!isEditing} type="text" value={formData.emergency_contact_name || ''} onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})} className={`w-full p-3.5 border-2 rounded-2xl font-bold text-sm transition-all outline-none text-left ${isEditing ? 'bg-white border-red-300 focus:border-red-600 text-gray-900' : 'bg-red-50 border-red-200 text-gray-900'}`}/>
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-red-700 uppercase ml-1 flex items-center gap-1">Tel. Emergencia <span className="text-red-500 font-black text-xs">*</span></label>
                <input disabled={!isEditing} type="text" value={formData.emergency_contact || ''} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} className={`w-full p-3.5 border-2 rounded-2xl font-bold text-sm transition-all outline-none text-left ${isEditing ? 'bg-white border-red-300 focus:border-red-600 text-gray-900' : 'bg-red-50 border-red-200 text-gray-900'}`}/>
              </div>
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-red-700 uppercase ml-1 text-left">Observaciones Médicas</label>
              <textarea disabled={!isEditing} rows={3} value={formData.medical_notes || ''} onChange={e => setFormData({...formData, medical_notes: e.target.value})} className={`w-full p-3.5 border-2 rounded-2xl font-bold text-sm transition-all outline-none transition resize-none text-left ${isEditing ? 'bg-white border-red-300 focus:border-red-600 text-gray-900' : 'bg-red-50 border-red-200 text-gray-900'}`}></textarea>
            </div>
          </section>
        </div> {/* FIN DEL FORMULARIO */}
      </div> {/* FIN DEL CONTENEDOR SPACE-Y-8 */}

      {/* TOAST NOTIFICACIONES */}
      {message && (
        <div className={`fixed bottom-8 right-8 z-[60] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 border-l-8 ${message.type === 'success' ? 'bg-white border-green-500' : 'bg-white border-red-500'} text-left`}>
            <div className={`${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {message.type === 'success' ? <CheckCircle size={28}/> : <XCircle size={28}/>}
            </div>
            <div className="text-left">
                <h4 className={`font-bold uppercase text-[10px] tracking-wider ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {message.type === 'success' ? '¡Éxito!' : 'Atención'}
                </h4>
                <p className="font-semibold text-gray-700 text-xs">{message.text}</p>
            </div>
        </div>
      )}
    </div>
  );
}