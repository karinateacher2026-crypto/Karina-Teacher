'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient' // Ajustá esta ruta si es necesario
import { Trash2, Plus, Video, FileText, Link as LinkIcon, Gamepad2, Loader2 } from 'lucide-react'

export default function AdminMaterials() {
  const [materials, setMaterials] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState('video')
  const [categoryId, setCategoryId] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setFetching(true)
    try {
      // 1. Traemos categorías vinculando con 'deportes' (idiomas) y 'sedes'
      const { data: cats } = await supabase
        .from('categories')
        .select(`
          id, 
          name,
          deportes (name),
          sedes (name)
        `)
        .order('name')
        
      if (cats) {
        setCategories(cats)
        if (cats.length > 0) setCategoryId(cats[0].id.toString())
      }

      // 2. Traemos materiales y también pedimos las relaciones con deportes y sedes
      const { data: mats } = await supabase
        .from('study_materials')
        .select(`
          *, 
          categories (
            name,
            deportes (name),
            sedes (name)
          )
        `)
        .order('created_at', { ascending: false })
        
      if (mats) setMaterials(mats)

    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setFetching(false)
    }
  }

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !url || !categoryId) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('study_materials')
        .insert([{ title, url, type, category_id: parseInt(categoryId) }])

      if (error) throw error

      setTitle('')
      setUrl('')
      fetchData()
    } catch (error: any) {
      alert('Error al agregar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Seguro que querés borrar este material?')) return

    try {
      const { error } = await supabase
        .from('study_materials')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (error: any) {
      alert('Error al borrar: ' + error.message)
    }
  }

  const getTypeConfig = (typeStr: string) => {
    switch (typeStr) {
      case 'video': return { icon: <Video size={16} />, color: 'text-red-600 bg-red-50' }
      case 'game': return { icon: <Gamepad2 size={16} />, color: 'text-purple-600 bg-purple-50' }
      case 'pdf': return { icon: <FileText size={16} />, color: 'text-blue-600 bg-blue-50' }
      default: return { icon: <LinkIcon size={16} />, color: 'text-emerald-600 bg-emerald-50' }
    }
  }

  // Función ajustada a la base de datos actual
  const formatCategoryName = (cat: any) => {
    if (!cat) return 'Curso desconocido'
    
    // Acá buscamos en 'deportes' y 'sedes'
    const lang = cat.deportes?.name || '' 
    const branch = cat.sedes?.name || ''
    
    let fullName = cat.name
    if (lang) fullName += ` - ${lang}`
    if (branch) fullName += ` (${branch})`
    
    return fullName
  }

  if (fetching) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-left font-sans animate-in fade-in duration-500">
      
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Material de Estudio</h2>
        <p className="text-gray-500 mt-1 text-sm">Gestioná los recursos digitales, videos y juegos para los alumnos.</p>
      </div>

      {/* FORMULARIO DE CARGA */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2 uppercase tracking-wide">
          <Plus size={16} className="text-indigo-600" />
          Cargar nuevo material
        </h3>
        
        <form onSubmit={handleAddMaterial} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Título del recurso</label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 bg-gray-50/50 text-sm transition-all placeholder:text-gray-400 font-medium" 
              placeholder="Ej: Juego de verbos irregulares..." 
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Link / URL</label>
            <input 
              type="url" 
              required 
              value={url} 
              onChange={e => setUrl(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 bg-gray-50/50 text-sm transition-all placeholder:text-gray-400 font-medium" 
              placeholder="https://..." 
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tipo de Material</label>
            <select 
              value={type} 
              onChange={e => setType(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 bg-gray-50/50 text-sm transition-all font-medium cursor-pointer"
            >
              <option value="video" className="text-gray-900">Video (YouTube, etc)</option>
              <option value="game" className="text-gray-900">Juego Interactivo</option>
              <option value="pdf" className="text-gray-900">Archivo / PDF</option>
              <option value="link" className="text-gray-900">Página Web / Lectura</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">¿Para qué curso es?</label>
            <select 
              value={categoryId} 
              onChange={e => setCategoryId(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 bg-gray-50/50 text-sm transition-all font-medium cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id} className="text-gray-900">
                  {formatCategoryName(cat)}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 pt-2">
            <button 
              disabled={loading} 
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 w-full md:w-auto"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Material'}
            </button>
          </div>
        </form>
      </div>

      {/* LISTA DE MATERIALES CARGADOS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-white">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Materiales Cargados</h3>
        </div>
        
        {materials.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm font-medium">
            Todavía no hay materiales cargados. ¡Agregá el primero arriba!
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {materials.map((mat) => {
              const config = getTypeConfig(mat.type)
              return (
                <div key={mat.id} className="p-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${config.color} shadow-sm border border-white/50`}>
                      {config.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{mat.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md uppercase tracking-wider">
                          {formatCategoryName(mat.categories)}
                        </span>
                        <span className="text-gray-300">•</span>
                        <a href={mat.url} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-indigo-600 truncate max-w-[200px] md:max-w-xs transition-colors">
                          {mat.url}
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(mat.id)} 
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-all w-full md:w-auto"
                  >
                    <Trash2 size={14} /> 
                    <span className="md:hidden">Borrar</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}