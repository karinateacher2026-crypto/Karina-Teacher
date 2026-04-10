'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

export default function ActualizarPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const router = useRouter()

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: password })

    if (error) {
      alert("Error: " + error.message)
    } else {
      setExito(true)
      // Redirigir al login después de 3 segundos
      setTimeout(() => router.push('/portal'), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-indigo-950 flex items-center justify-center px-6">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border-t-8 border-indigo-600">
        {!exito ? (
          <>
            <h2 className="text-3xl font-black text-indigo-950 uppercase italic mb-2">Nueva Contraseña</h2>
            <p className="text-gray-500 text-sm mb-8 font-medium text-balance">
              Ingresá tu nueva clave de acceso para el portal de socios.
            </p>

            <form onSubmit={handleUpdate} className="space-y-4">
              {/* CAMPO: NUEVA CLAVE */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-indigo-950 tracking-widest ml-1">Contraseña Nueva</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-600 outline-none text-indigo-950"
                    placeholder="Min. 6 caracteres"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* CAMPO: CONFIRMAR */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-indigo-950 tracking-widest ml-1">Confirmar Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-600 outline-none text-indigo-950"
                  />
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl transition-all uppercase italic tracking-tighter shadow-lg disabled:opacity-50 mt-4"
              >
                {loading ? 'Actualizando...' : 'Guardar Nueva Clave'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-indigo-950 uppercase mb-2">¡Clave Actualizada!</h2>
            <p className="text-gray-600 font-medium text-sm">
              Tu contraseña fue cambiada con éxito. <br/>
              Redirigiendo al inicio de sesión...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}