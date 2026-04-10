'use client'

import { useState, useEffect } from 'react' // 1. Agregamos useEffect aquí
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, ShieldCheck, X, FileText, User, HeartPulse, ShieldAlert, MapPin, Phone, Calendar, Eye, EyeOff, CreditCard, Plus, Trash2, Trophy, Check, Mail, ExternalLink } from 'lucide-react'
import { CLIENT_CONFIG } from '@/conf/clientConfig';

export default function Register() {
  const router = useRouter()
  
  // --- AGREGAMOS ESTO PARA IPHONE ---
  const [showIosBanner, setShowIosBanner] = useState(false);

  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !isStandalone) {
      setShowIosBanner(true);
    }
  }, []);
  // ----------------------------------

  const [formData, setFormData] = useState({
      email: '', password: '', firstName: '', lastName: '', cuil: '', phone: '',
      birth_date: '', address: '', gender: '',
      emergency_contact_name: '', emergency_contact: '', medical_notes: ''
  })
  // ESTADO PARA DEPORTES (DINÁMICO DESDE BASE DE DATOS)
  const [dbSports, setDbSports] = useState<any[]>([]) // Guardamos los deportes completos (id y nombre)
  const [sportsList, setSportsList] = useState<string[]>([]) // Guardamos solo los nombres para los botones
  const [selectedSports, setSelectedSports] = useState<string[]>([])

  // CARGAMOS LOS DEPORTES AL ABRIR LA PÁGINA
  useEffect(() => {
    const fetchSports = async () => {
      const { data } = await supabase.from('deportes').select('*').order('name');
      if (data) {
        setDbSports(data);
        // Extraemos solo los nombres para que tu diseño de botones siga funcionando igual
        setSportsList(data.map(sport => sport.name)); 
      }
    };
    fetchSports();
  }, []);
  // ESTADO PARA PAGADORES DINÁMICOS
  const [payers, setPayers] = useState([{ name: '', cuil: '' }])
  
  const [loading, setLoading] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false) // NUEVO ESTADO PARA ÉXITO
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false) 
  
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  const [isThirdPartyPayer, setIsThirdPartyPayer] = useState(false)

  const formatCuil = (value: string) => {
    let val = value.replace(/\D/g, ""); 
    if (val.length > 11) val = val.slice(0, 11);
    let formatted = val;
    if (val.length > 2) formatted = `${val.slice(0, 2)}-${val.slice(2)}`;
    if (val.length > 10) formatted = `${formatted.slice(0, 11)}-${val.slice(10, 11)}`;
    return formatted;
  }

  const handleCuilChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, cuil: formatCuil(e.target.value) });
  }

  // MANEJO DE SELECCIÓN DE DEPORTES
  const toggleSport = (sport: string) => {
    setSelectedSports(prev => 
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    )
  }

  // MANEJO DE FILAS DINÁMICAS
  const addPayerRow = () => {
    setPayers([...payers, { name: '', cuil: '' }])
  }

  const removePayerRow = (index: number) => {
    if (payers.length > 1) {
      const newPayers = payers.filter((_, i) => i !== index)
      setPayers(newPayers)
    }
  }

  const handlePayerChange = (index: number, field: 'name' | 'cuil', value: string) => {
    const newPayers = [...payers]
    newPayers[index][field] = field === 'cuil' ? formatCuil(value) : value
    setPayers(newPayers)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // VALIDACIÓN DE CUIL SOCIO (11 números)
    const cuilDigits = formData.cuil.replace(/\D/g, "");
    if (cuilDigits.length !== 11) {
        setError("El CUIL del socio debe tener 11 dígitos. Revisá el formato (XX-XXXXXXXX-X).")
        return
    }

    // VALIDACIÓN DE CUIL PAGADORES TERCEROS
    if (isThirdPartyPayer) {
      for (const p of payers) {
        const pCuilDigits = p.cuil.replace(/\D/g, "");
        if (pCuilDigits.length !== 11) {
          setError(`El CUIL de ${p.name || 'un pagador'} está incompleto. Debe tener 11 dígitos.`)
          return
        }
      }
    }

    if (selectedSports.length === 0) {
        setError("Debés seleccionar al menos un deporte.")
        return
    }

    if (!acceptedTerms) {
        setError("Debés aceptar los Términos y la Política de Privacidad para continuar.")
        return
    }

    setLoading(true)
    // 1. Validamos si el CUIL ya existe en la tabla 'users'
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('cuil', formData.cuil)
      .maybeSingle();

    // 2. Si hay un usuario con ese CUIL, cortamos el proceso
    if (existingUser) {
      setError("Este CUIL ya se encuentra registrado. Si ya sos socio, intentá recuperar tu contraseña.");
      setLoading(false);
      return; 
    }
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: 'https://www.clublacantera.com.ar/portal',
        },
      })

      if (authError) throw authError;

      if (authData.user) {
        const combinedPayerNames = isThirdPartyPayer ? payers.map(p => p.name).filter(n => n !== "").join(' / ') : null
        const combinedPayerCuils = isThirdPartyPayer ? payers.map(p => p.cuil).filter(c => c !== "").join(' / ') : null
        const fullName = `${formData.lastName.trim()}, ${formData.firstName.trim()}`;
        
        // 1. INSERTAR DATOS PERSONALES EN 'users' (Sin sport ni category)
        const { error: profileError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: formData.email,
          name: fullName,
          cuil: formData.cuil,
          phone: formData.phone,
          role: '{player}',
          status: 'active',
          account_balance: 0,
          terms_accepted_at: new Date().toISOString(),
          birth_date: formData.birth_date,
          address: formData.address,
          gender: formData.gender,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact: formData.emergency_contact,
          medical_notes: formData.medical_notes,
          payer_name: combinedPayerNames,
          payer_cuil: combinedPayerCuils
        })

        if (profileError) throw profileError

        // 2. INSERTAR DEPORTES EN 'user_categories' (X filas según selección)
        // Buscamos el ID del deporte directamente en la lista que trajimos de la base de datos
        const userCategoriesRows = selectedSports.map(sportName => {
          const sportObj = dbSports.find(s => s.name === sportName);
          return {
            user_id: authData.user!.id,
            deporte_id: sportObj?.deporte_id, // ¡Atención acá! Cambiá '.id' por '.deporte_id' si tu columna en la tabla deportes se llama así.
            category_id: null
          };
        }).filter(row => row.deporte_id != null); // Filtramos por las dudas para no mandar datos nulos

        const { error: categoriesError } = await supabase
          .from('user_categories')
          .insert(userCategoriesRows);

        if (categoriesError) throw categoriesError

        setIsRegistered(true)
        window.scrollTo(0, 0)
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrarse. Verificá los datos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
  className="min-h-screen flex items-center justify-center p-4 font-sans py-12 text-left"
  style={{ background: `linear-gradient(to bottom right, ${CLIENT_CONFIG.colors.primary}, ${CLIENT_CONFIG.colors.secondary})` }}
>
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl animate-in zoom-in-95 duration-300 text-left">
        
        {isRegistered ? (
          <div className="text-center py-10 animate-in fade-in duration-500 text-center">
            <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-center">
              <Mail size={48} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 uppercase italic mb-4 text-center">¡Registro Exitoso!</h2>
            <p className="text-gray-600 text-lg mb-8 text-center">
              Hemos enviado un enlace de confirmación a <span className="font-bold text-indigo-600">{formData.email}</span>. 
              Por favor, activá tu cuenta desde tu correo para poder ingresar al portal.
            </p>
            <Link 
              href="/portal" 
              className="inline-block px-8 py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition shadow-lg uppercase tracking-wide text-center"
            >
              Ir al Inicio de Sesión
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-10 text-center">
    <div 
  className="h-24 w-24 bg-[#1e1b4b] rounded-full flex items-center justify-center mx-auto mb-4 border-4 shadow-sm overflow-hidden text-center relative"
  style={{ borderColor: CLIENT_CONFIG.colors.primary }}
>
        <img 
            src={CLIENT_CONFIG.logoUrl}
            alt="Club" 
            className="h-full w-full object-cover text-center" 
            onError={(e) => e.currentTarget.style.display = 'none'}
        />
    </div>
    <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tight text-center">Alta de Socio</h1>
    <p className="text-gray-500 mt-2 text-lg text-center">Completá tu ficha para unirte al club.</p>
</div>

            {error && (
              <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-3 rounded-r-lg text-left">
                <AlertCircle size={20} />
                <span className="text-sm font-bold text-left">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8 text-left">
              
              <div className="space-y-4 text-left">
                  <h3 className="flex items-center gap-2 font-black text-gray-900 uppercase text-sm border-b pb-2 mb-4 text-left">
                      <ShieldCheck size={18} className="text-indigo-600 text-left"/> Datos de Cuenta
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="text-left">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 text-left">Email <span className="text-red-500">*</span></label>
                        <input type="email" required className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-gray-900 text-left" placeholder="tu@email.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div className="text-left">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 text-left">Contraseña <span className="text-red-500">*</span></label>
                        <div className="relative text-left">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                required 
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-gray-900 pr-12 text-left" 
                                placeholder="Mínimo 6 caracteres" 
                                value={formData.password} 
                                onChange={(e) => setFormData({...formData, password: e.target.value})} 
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors text-left"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                  </div>
              </div>

              <div className="space-y-4 text-left">
                  <h3 className="flex items-center gap-2 font-black text-gray-900 uppercase text-sm border-b pb-2 mb-4 mt-8 text-left">
                      <User size={18} className="text-indigo-600 text-left"/> Información Personal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="text-left">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1 text-left">Apellido <span className="text-red-500">*</span></label>
                      <input type="text" required className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-gray-900 text-left" placeholder="Ej: Messi" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                    </div>
                    <div className="text-left">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1 text-left">Nombre <span className="text-red-500">*</span></label>
                      <input type="text" required className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-gray-900 text-left" placeholder="Ej: Lionel" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 p-5 rounded-2xl border-2 border-indigo-100 mt-4 text-left">
                      <label className="block text-xs font-black text-indigo-900 uppercase mb-3 flex items-center gap-2 text-left">
                        <Trophy size={16}/> Deportes que practica <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                          {sportsList.map(sport => (
                              <button
                                key={sport}
                                type="button"
                                onClick={() => toggleSport(sport)}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm text-left ${
                                    selectedSports.includes(sport) 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300'
                                }`}
                              >
                                {sport}
                                {selectedSports.includes(sport) && <Check size={16} className="animate-in zoom-in-50 text-left" />}
                              </button>
                          ))}
                      </div>
                      <p className="text-[10px] text-indigo-400 mt-3 font-bold uppercase tracking-tight italic text-left">* Podés seleccionar más de uno si realizas varias actividades.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="text-left">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 text-left">CUIL <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          required 
                          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-gray-900 text-left" 
                          placeholder="20-44667874-5" 
                          value={formData.cuil} 
                          onChange={handleCuilChange} 
                        />
                        <a 
                          href="https://servicioswww.anses.gob.ar/C2-ConstaCUIL" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-tight italic"
                        >
                          ¿No sabés tu CUIL? Consultalo acá <ExternalLink size={10} />
                        </a>
                    </div>
                    <div className="text-left">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1 text-left"><Calendar size={14}/> Fecha de Nacimiento <span className="text-red-500">*</span></label>
                        <input type="date" required className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-gray-900 text-left" value={formData.birth_date} onChange={(e) => setFormData({...formData, birth_date: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="text-left">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1 text-left"><Phone size={14}/> Teléfono / Celular <span className="text-red-500">*</span></label>
                        <input type="text" required className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-gray-900 text-left" placeholder="Ej: 223 555..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="text-left">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1 text-left"><User size={14}/> Género <span className="text-red-500">*</span></label>
                        <select required className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-gray-900 bg-white text-left" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            <option value="M">Masculino</option>
                            <option value="F">Femenino</option>
                            <option value="X">Otro</option>
                        </select>
                    </div>
                  </div>
                  <div className="text-left">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1 text-left"><MapPin size={14}/> Dirección / Domicilio <span className="text-red-500">*</span></label>
                    <input type="text" required className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-gray-900 text-left" placeholder="Ej: Av. Luro 1234" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                  </div>
              </div>

              <div className="space-y-4 text-left">
                  <h3 className="flex items-center gap-2 font-black text-gray-900 uppercase text-sm border-b pb-2 mb-4 mt-8 text-left text-left">
                      <CreditCard size={18} className="text-indigo-600 text-left"/> Responsable de Pagos
                  </h3>
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 text-left">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 text-sm text-left">
                          <input 
                            type="radio" 
                            name="payer_type" 
                            checked={!isThirdPartyPayer} 
                            onChange={() => setIsThirdPartyPayer(false)}
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 text-left" 
                          />
                          Yo realizaré las transferencias
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 text-sm text-left">
                          <input 
                            type="radio" 
                            name="payer_type" 
                            checked={isThirdPartyPayer} 
                            onChange={() => setIsThirdPartyPayer(true)}
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 text-left" 
                          />
                          Un tercero (Padre/Madre/Tutor)
                      </label>
                  </div>

                  {isThirdPartyPayer && (
                    <div className="space-y-4 animate-in fade-in duration-300 text-left">
                        {payers.map((payer, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end bg-gray-50/50 p-4 rounded-2xl border border-gray-100 relative text-left">
                            <div className="text-left">
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 text-left">Nombre Responsable {index + 1} <span className="text-red-500">*</span></label>
                              <input 
                                type="text" 
                                required 
                                className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-sm text-gray-900 text-left" 
                                placeholder="Nombre completo" 
                                value={payer.name} 
                                onChange={(e) => handlePayerChange(index, 'name', e.target.value)} 
                              />
                            </div>
                            <div className="text-left">
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 text-left">CUIL Responsable {index + 1} <span className="text-red-500">*</span></label>
                              <input 
                                type="text" 
                                required 
                                className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-sm text-gray-900 text-left" 
                                placeholder="20-XXXXXXXX-X" 
                                value={payer.cuil} 
                                onChange={(e) => handlePayerChange(index, 'cuil', e.target.value)} 
                              />
                            </div>
                            {payers.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removePayerRow(index)} 
                                className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition text-left"
                              >
                                <Trash2 size={18}/>
                              </button>
                            )}
                          </div>
                        ))}
                        
                        <button 
                          type="button" 
                          onClick={addPayerRow} 
                          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-black text-xs uppercase hover:bg-indigo-100 transition border border-indigo-200 text-left"
                        >
                          <Plus size={16}/> Agregar otro responsable
                        </button>
                    </div>
                  )}
              </div>

              <div className="space-y-4 bg-red-50 p-4 rounded-xl border border-red-100 text-left">
                  <h3 className="flex items-center gap-2 font-black text-red-700 uppercase text-sm border-b border-red-200 pb-2 mb-4 text-left text-left">
                      <ShieldAlert size={18} className="text-red-600 text-left"/> Emergencia y Salud
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-left">
                      <div className="text-left">
                          <label className="block text-xs font-bold text-red-700 uppercase mb-1 text-left">Contacto de Emergencia (Nombre) <span className="text-red-500">*</span></label>
                          <input type="text" required className="w-full p-3 border-2 border-red-200 rounded-xl focus:border-red-500 outline-none font-bold text-gray-900 bg-white text-left" placeholder="Ej: Padre/Madre/Tutor" value={formData.emergency_contact_name} onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})} />
                      </div>
                      <div className="text-left">
                          <label className="block text-xs font-bold text-red-700 uppercase mb-1 text-left">Teléfono de Emergencia <span className="text-red-500">*</span></label>
                          <input type="text" required className="w-full p-3 border-2 border-red-200 rounded-xl focus:border-red-500 outline-none font-bold text-gray-900 bg-white text-left" placeholder="Ej: 223 155..." value={formData.emergency_contact} onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})} />
                      </div>
                  </div>
                  <div className="text-left">
                      <label className="block text-xs font-bold text-red-700 uppercase mb-1 flex items-center gap-1 text-left"><HeartPulse size={14}/> Observaciones Médicas / Alergias</label>
                      <textarea className="w-full p-3 border-2 border-red-200 rounded-xl focus:border-red-500 outline-none font-bold text-gray-900 bg-white text-left" rows={3} placeholder="Opcional: Alergias, condiciones, etc." value={formData.medical_notes} onChange={(e) => setFormData({...formData, medical_notes: e.target.value})} />
                  </div>
              </div>

              <div className="flex items-start gap-3 bg-gray-100 p-4 rounded-xl border border-gray-200 text-left text-left">
                  <input id="terms" type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer mt-1 text-left" />
                  <div className="text-sm text-left">
                    <label htmlFor="terms" className="font-bold text-gray-800 cursor-pointer text-left">
                      Declaro que los datos son reales y acepto la <span className="text-indigo-600 underline text-left" onClick={(e) => {e.preventDefault(); setShowTermsModal(true)}}>Política de Privacidad y Tratamiento de Datos Personales y de Salud.</span> <span className="text-red-500">*</span>
                    </label>
                  </div>
              </div>

              <button type="submit" disabled={loading || !acceptedTerms} className="w-full py-5 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 transition shadow-xl disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed uppercase tracking-wide text-lg flex justify-center items-center gap-3 text-center">
                {loading ? <Loader2 className="animate-spin text-center" size={24} /> : 'Confirmar Registro'}
              </button>
            </form>

            <div className="mt-8 text-center text-center">
              <Link href="/portal" className="text-base font-bold text-gray-500 hover:text-indigo-600 transition text-center">
                ¿Ya tenés cuenta? <span className="underline text-center">Iniciá Sesión</span>
              </Link>
            </div>
          </>
        )}
      </div>

      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in text-left">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-left text-left">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center text-left text-left">
                    <h3 className="font-black text-gray-900 flex items-center gap-2 text-left"><FileText size={20} className="text-indigo-600 text-left"/> TÉRMINOS Y CONDICIONES</h3>
                    <button onClick={() => setShowTermsModal(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 text-left"><X size={20}/></button>
                </div>
                <div className="p-6 overflow-y-auto text-sm text-gray-600 space-y-4 leading-relaxed text-left text-left">
                    <p className="font-bold text-gray-900 text-left">1. RESPONSABLE DE LOS DATOS</p>
                    <p className="text-left">Los datos personales recabados serán incorporados a una base de datos bajo la responsabilidad del <strong>{CLIENT_CONFIG.name}</strong>.</p>
                    <p className="font-bold text-gray-900 text-left">2. FINALIDAD Y DATOS SENSIBLES</p>
                    <p className="text-left">Se recolectan datos personales y de salud (ficha médica, alergias, contactos de emergencia) con la única finalidad de la gestión administrativa, deportiva y para la atención de emergencias médicas durante las actividades del Club.</p>
                    <p className="font-bold text-gray-900 text-left">3. CONSENTIMIENTO</p>
                    <p className="text-left">Al aceptar, usted presta su <strong>consentimiento expreso e informado</strong> para el tratamiento de sus datos personales y sensibles conforme a la Ley 25.326 de Protección de Datos Personales.</p>
                </div>
                <div className="p-4 border-t bg-gray-50 text-center text-center">
                  <button onClick={() => {setAcceptedTerms(true); setShowTermsModal(false)}} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition text-center">Entendido, Aceptar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}