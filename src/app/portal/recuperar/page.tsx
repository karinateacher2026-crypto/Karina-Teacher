'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import Link from 'next/link'
import { ArrowLeft, Mail, Send, CheckCircle2 } from 'lucide-react'

export default function RecuperarPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/portal/actualizar-password`,
    })

    if (error) {
      alert("Error: " + error.message)
    } else {
      setEnviado(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-indigo-950 flex items-center justify-center px-6">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border-t-8 border-orange-500">
        <Link href="/portal" className="flex items-center gap-2 text-indigo-900 hover:text-orange-500 transition-colors mb-6 font-bold text-xs uppercase tracking-widest">
          <ArrowLeft size={16} /> Volver
        </Link>

        {!enviado ? (
          <>
            <h2 className="text-3xl font-black text-indigo-950 uppercase italic mb-2">Recuperar Acceso</h2>
            <p className="text-gray-500 text-sm mb-8">Ingresá tu mail y te enviaremos el link de restauración.</p>
            
            <form onSubmit={handleRecuperar} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="email" 
                  placeholder="tu@email.com"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-600 outline-none text-indigo-950"
                  required
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl transition-all uppercase italic tracking-tighter shadow-lg disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar instrucciones'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 size={60} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-indigo-950 uppercase mb-2">¡Mail Enviado!</h2>
            <p className="text-gray-600 text-sm mb-6">Revisá tu bandeja de entrada (y la carpeta de spam) para continuar.</p>
            <Link href="/portal" className="block w-full py-4 border-2 border-indigo-600 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 transition-all uppercase text-xs">
              Volver al inicio
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}