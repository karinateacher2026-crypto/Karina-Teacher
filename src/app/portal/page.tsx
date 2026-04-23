'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CLIENT_CONFIG } from '@/conf/clientConfig';
import RoleSelector from '../../components/ui/RoleSelector'
import { 
  Loader2, User, Lock, LogIn, AlertCircle, LogOut, 
  CreditCard, Shield, UserCircle, Eye, EyeOff, Download, Share, X, ClipboardList 
} from 'lucide-react'

export default function PortalLogin() {
  const router = useRouter()
  
  const [identifier, setIdentifier] = useState('') 
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  
  const [sessionUser, setSessionUser] = useState<any>(null)
  const [detectedRole, setDetectedRole] = useState<any>(null) // Cambiado a any para aceptar array
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null) // Nuevo estado para la foto

  // --- LÓGICA DE INSTALACIÓN (ANDROID + IOS) ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false); 
  const [hideIOSBanner, setHideIOSBanner] = useState(false); 

  useEffect(() => {
    const checkSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session) {
                const user = session.user
                setSessionUser(user)
                localStorage.setItem('club_player_id', user.id)
                
                const { data: profileById } = await supabase
                    .from('users')
                    .select('role, avatar_url')
                    .eq('id', user.id)
                    .maybeSingle()

                if (profileById) {
                    setDetectedRole(profileById.role)
                    if (profileById.avatar_url) {
                        const { data: signedData } = await supabase.storage
                            .from('avatars')
                            .createSignedUrl(profileById.avatar_url, 3600);
                        if (signedData) setAvatarUrl(signedData.signedUrl);
                    }
                } else {
                    const { data: profileByEmail } = await supabase
                        .from('users')
                        .select('role, avatar_url')
                        .eq('email', user.email)
                        .maybeSingle()
                    
                    if (profileByEmail) {
                        setDetectedRole(profileByEmail.role)
                        if (profileByEmail.avatar_url) {
                            const { data: signedData } = await supabase.storage
                                .from('avatars')
                                .createSignedUrl(profileByEmail.avatar_url, 3600);
                            if (signedData) setAvatarUrl(signedData.signedUrl);
                        }
                    }
                }
            }
            setLoading(false)
        } catch (err) {
            console.error(err)
            setLoading(false)
        }
    }
    checkSession()

    // Lógica de Banner iOS y PWA
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const hasDismissed = localStorage.getItem('ios_banner_dismissed') === 'true';
    
    setIsIOS(isApple && !isStandalone);
    setHideIOSBanner(hasDismissed);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
}, []);

  const dismissIOSBanner = () => {
    setHideIOSBanner(true);
    localStorage.setItem('ios_banner_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };
  // -----------------------------------

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let emailToUse = identifier.trim()
      const isCuilFormat = /^[\d-]+$/.test(emailToUse)

      if (isCuilFormat) {
          const { data: userData } = await supabase.from('users').select('email').eq('cuil', emailToUse).maybeSingle()
          if (!userData) throw new Error('No existe usuario con ese CUIL.')
          emailToUse = userData.email
      }

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: password,
      })

      if (loginError) {
          const { data: socioDb } = await supabase
            .from('users')
            .select('*')
            .eq('email', emailToUse)
            .maybeSingle()

          if (socioDb && socioDb.cuil === password) {
              const { data: newAuth, error: signUpError } = await supabase.auth.signUp({
                email: emailToUse,
                password: socioDb.cuil,
                options: { data: { name: socioDb.name, role: 'player' } }
              })

              if (signUpError) throw new Error("Error al habilitar cuenta.")
              
              if (newAuth.user) {
                  await supabase.from('users').update({ id: newAuth.user.id }).eq('email', emailToUse)
                  await supabase.auth.signInWithPassword({
                    email: emailToUse,
                    password: socioDb.cuil
                  })
                  window.location.reload(); return;
              }
          }
          throw loginError
      }

      if (data.user) window.location.reload()

    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Contraseña incorrecta.' : err.message)
      setLoading(false)
    }
  }

  const forceLogout = async () => {
      setLoading(true)
      await supabase.auth.signOut()
      localStorage.clear()
      window.location.reload()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${CLIENT_CONFIG.colors.primary}, ${CLIENT_CONFIG.colors.secondary})` }}><Loader2 className="animate-spin text-white" size={40}/></div>

  if (sessionUser) {
      // --- CORRECCIÓN DE ROL (LÓGICA LA CANTERA) ---
      // Limpiamos llaves {}, corchetes [] y comillas para que 'player' sea detectado siempre
      const userRoles = Array.isArray(detectedRole) 
        ? detectedRole 
        : (typeof detectedRole === 'string' 
            ? detectedRole.replace(/[{}[\]]/g, '').split(',').map(r => r.trim().replace(/['"]/g, '')) 
            : (detectedRole ? [detectedRole] : []));

      const hasMultipleRoles = userRoles.length > 1;

      // Definimos los roles detectados mediante .includes()
      const isAdmin = userRoles.includes('admin');
      const isPlayer = userRoles.includes('player');
      const isTeacher = userRoles.includes('teacher');
      const isOrganizer = userRoles.includes('organizer');

      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4 font-sans text-left"
          style={{ background: `linear-gradient(to bottom right, ${CLIENT_CONFIG.colors.primary}, ${CLIENT_CONFIG.colors.secondary})` }}
        >            
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden text-center animate-in zoom-in-95">
            <div className="absolute top-0 left-0 w-full h-2" style={{ background: `linear-gradient(to right, ${CLIENT_CONFIG.colors.primary}, ${CLIENT_CONFIG.colors.secondary})` }}></div>
            <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm overflow-hidden">
                {avatarUrl ? (
                    <img src={avatarUrl} alt="Perfil" className="h-full w-full object-cover animate-in fade-in" />
                ) : (
                    <User size={40} />
                )}
            </div>
            <h2 className="text-xl font-black text-gray-900 uppercase leading-none">Hola, {sessionUser.email?.split('@')[0]}</h2>
            
            {!hasMultipleRoles && (
              <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-4 ${isAdmin ? 'bg-indigo-100 text-indigo-700' : (isPlayer ? 'bg-green-100 text-green-700' : (isTeacher ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'))}`}>
                  Rol: {isAdmin ? 'Administrador' : (isPlayer ? 'Estudiante' : (isTeacher ? 'Profesor' : 'Sin Asignar'))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 mt-4">
                {hasMultipleRoles ? (
                    <RoleSelector roles={userRoles} />
                ) : (
                    isAdmin || isOrganizer ? (
                        <button onClick={() => router.push('/admin/dashboard')} className="w-full py-4 bg-indigo-900 text-white font-bold rounded-xl hover:bg-black transition shadow-lg flex items-center justify-center gap-3 uppercase text-sm">
                            <Shield size={18}/> Ir al Panel Admin
                        </button>
                    ) : isTeacher ? (
                        <button onClick={() => router.push('/portal/teacher/dashboard')} className="w-full py-4 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition shadow-lg flex items-center justify-center gap-3 uppercase text-sm">
                            <ClipboardList size={18}/> Ir al Panel Profesor
                        </button>
                    ) : (
                         <button onClick={() => router.push('/portal/dashboard')} className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition shadow-lg flex items-center justify-center gap-3 uppercase text-sm">
                            <UserCircle size={18}/> Ir a Mi Perfil
                        </button>
                    )
                )}
                <button onClick={forceLogout} className="w-full py-3 bg-white border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 transition flex items-center justify-center gap-2 uppercase text-xs">
                    <LogOut size={16}/> Cerrar Sesión
                </button>
            </div>
          </div>
        </div>
      )
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans text-left"
      style={{ background: `linear-gradient(to bottom right, ${CLIENT_CONFIG.colors.primary}, ${CLIENT_CONFIG.colors.secondary})` }}
    >
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2" style={{ background: `linear-gradient(to right, ${CLIENT_CONFIG.colors.primary}, ${CLIENT_CONFIG.colors.secondary})` }}></div>
        <div className="text-center mb-8 mt-2">
            <div 
              className="h-24 w-24 bg-[#1e1b4b] rounded-full flex items-center justify-center mx-auto mb-4 border-4 shadow-md overflow-hidden"
              style={{ borderColor: CLIENT_CONFIG.colors.primary }}
            >
              <img 
                src={CLIENT_CONFIG.logoUrl}
                alt="Club" 
                className="h-full w-full object-cover scale-150" 
                onError={(e) => e.currentTarget.style.display = 'none'} 
              />
            </div>
            <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
              {CLIENT_CONFIG.name}
            </h1>
            {showInstallBtn && !isIOS && (
              <button 
                onClick={handleInstallClick}
                className="mt-4 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 mx-auto hover:bg-orange-200 transition-all animate-bounce border border-orange-200"
              >
                <Download size={14} /> Instalar App del Club
              </button>
            )}

            {isIOS && !hideIOSBanner && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-2xl relative animate-in fade-in zoom-in duration-500">
                <button 
                  onClick={dismissIOSBanner}
                  className="absolute -top-2 -right-2 bg-white border border-blue-200 text-blue-400 rounded-full p-1 shadow-sm hover:text-red-500 transition-colors"
                >
                    <X size={12} />
                </button>
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-tighter leading-tight flex items-center justify-center gap-2 pr-2">
                    <Share size={14} className="shrink-0" /> Instalá la App: Tocá compartir y "Agregar al inicio"
                </p>
              </div>
            )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-3 rounded-r-lg text-sm font-bold animate-in fade-in text-left">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-1 ml-1">Email</label>
            <div className="relative">
                {/^[\d-]+$/.test(identifier) && identifier.length > 0 ? (
                    <CreditCard className="absolute left-4 top-3.5 text-indigo-600" size={20}/>
                ) : (
                    <User className="absolute left-4 top-3.5 text-gray-400" size={20}/>
                )}
                <input type="text" required className="w-full pl-12 p-3.5 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-600 focus:ring-0 font-bold text-gray-800 transition-all placeholder-gray-300" placeholder="Ej:tu@email.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-1 ml-1">Contraseña</label>
            <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-gray-400" size={20}/>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="w-full pl-12 pr-12 p-3.5 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-600 focus:ring-0 font-bold text-gray-800 transition-all placeholder-gray-300" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-4 text-white font-black rounded-xl transition shadow-lg transform active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide hover:opacity-90"
            style={{ backgroundColor: CLIENT_CONFIG.colors.primary }}
          >
            {loading ? <Loader2 className="animate-spin" /> : <>INGRESAR <LogIn size={20}/></>}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link 
            href="/portal/recuperar" 
            className="text-[10px] md:text-xs font-bold text-indigo-600 hover:text-orange-500 transition-colors uppercase tracking-widest italic"
          >
            ¿Te olvidaste tu contraseña?
          </Link>
        </div>

        <div className="mt-8 text-center pt-6 border-t border-gray-100 text-left">
            <p className="text-gray-400 text-sm font-medium mb-2 text-center">¿Sos nuevo en el instituto?</p>
            <div className="text-center">
              <Link href="/portal/register" className="text-blue-600 font-black hover:text-blue-800 hover:underline uppercase text-sm">Crear mi cuenta de estudiante</Link>
            </div>
        </div>
      </div>
    </div>
  )
}