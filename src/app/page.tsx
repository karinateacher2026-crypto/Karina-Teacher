'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient' // Ajustá si es necesario
import { 
  Phone, Gamepad2, Video, FileText, Link as LinkIcon, 
  Loader2, Sparkles, ChevronRight, BookOpen, GraduationCap, 
  Globe, Award, MessageCircle, Star, Users, MapPin, Instagram,
  CheckCircle2
} from 'lucide-react'
import { CLIENT_CONFIG } from '@/conf/clientConfig'

export default function Home() {
  // ==========================================
  // ESTADOS: CAMPUS VIRTUAL
  // ==========================================
  const [categories, setCategories] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loadingCampus, setLoadingCampus] = useState(true)

  // ==========================================
  // ESTADOS: ANIMACIÓN DEL HERO
  // ==========================================
  const actionWords = ["rendir el First", "viajar por el mundo", "tu futuro profesional", "hablar sin miedo"]
  const [wordIndex, setWordIndex] = useState(0)
  const [fade, setFade] = useState(true)

  // Efecto para rotar las palabras del Hero suavemente
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % actionWords.length)
        setFade(true)
      }, 500) // medio segundo en negro antes de cambiar
    }, 3500)
    return () => clearInterval(interval)
  }, [actionWords.length])

  // Efecto para cargar los datos de Supabase
  useEffect(() => {
    fetchPublicCampusData()
  }, [])

  const fetchPublicCampusData = async () => {
    try {
      const { data: cats } = await supabase
        .from('categories')
        .select(`id, name, deportes(name), sedes(name)`)
        .order('name')

      const { data: mats } = await supabase
        .from('study_materials')
        .select('*')
        .order('created_at', { ascending: false })

      if (cats && cats.length > 0) {
        setCategories(cats)
        setActiveCategory(cats[0].id.toString()) 
      }
      if (mats) setMaterials(mats)
    } catch (error) {
      console.error("Error cargando el campus:", error)
    } finally {
      setLoadingCampus(false)
    }
  }

  // Utilidades para formatear el campus
  const formatCategoryName = (cat: any) => {
    if (!cat) return ''
    const lang = cat.deportes?.name || ''
    const branch = cat.sedes?.name || ''
    let fullName = cat.name
    if (lang) fullName += ` - ${lang}`
    if (branch) fullName += ` (${branch})`
    return fullName
  }

  const getTypeDesign = (typeStr: string) => {
    switch (typeStr) {
      case 'video': return { icon: <Video size={24} className="text-white" />, bg: 'bg-rose-500', lightBg: 'bg-rose-50', text: 'text-rose-600', label: 'Ver Video' }
      case 'game': return { icon: <Gamepad2 size={24} className="text-white" />, bg: 'bg-violet-500', lightBg: 'bg-violet-50', text: 'text-violet-600', label: 'Jugar' }
      case 'pdf': return { icon: <FileText size={24} className="text-white" />, bg: 'bg-sky-500', lightBg: 'bg-sky-50', text: 'text-sky-600', label: 'Leer PDF' }
      default: return { icon: <LinkIcon size={24} className="text-white" />, bg: 'bg-emerald-500', lightBg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Abrir Link' }
    }
  }

  const activeMaterials = materials.filter(m => m.category_id.toString() === activeCategory)

  // ==========================================
  // DATOS DEL INSTITUTO
  // ==========================================
  const stats = [
    { icon: <Star className="text-indigo-600" size={28} />, value: '+15', label: 'Años de Trayectoria' },
    { icon: <GraduationCap className="text-indigo-600" size={28} />, value: '100%', label: 'Aprobados en Exámenes' },
    { icon: <Users className="text-indigo-600" size={28} />, value: 'A1-C2', label: 'Niveles Internacionales' },
    { icon: <Globe className="text-indigo-600" size={28} />, value: 'Híbrido', label: 'Online y Presencial' },
  ]

  const cursos = [
    {
      title: "Kids & Pre-Teens",
      desc: "Aprendizaje lúdico y natural para los más chicos. Juegos, canciones y primeras herramientas comunicativas.",
      tags: ["Desde 6 años", "Material Interactivo"]
    },
    {
      title: "Teens & Young Adults",
      desc: "Inglés dinámico enfocado en el uso real. Conversación, cultura y preparación para el colegio o la universidad.",
      tags: ["Conversación", "Proyectos"]
    },
    {
      title: "International Exams",
      desc: "Preparación intensiva para certificaciones de Cambridge (B2 First, C1 Advanced). Simulacros y técnicas de examen.",
      tags: ["Cambridge", "Simulacros"]
    }
  ]

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-gray-900 selection:bg-indigo-200">
      
      {/* BOTÓN WHATSAPP */}
      <a 
        href={`https://wa.me/${CLIENT_CONFIG.social?.whatsapp || CLIENT_CONFIG.contact?.phone}?text=Hola!%20Quisiera%20pedir%20informaci%C3%B3n%20sobre%20las%20clases%20de%20ingl%C3%A9s.`}
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[100] bg-green-500 text-white p-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-green-600 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
      >
        <Phone size={28} className="group-hover:animate-bounce" />
      </a>

      {/* NAVBAR MODERNIZADO */}
      <nav className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-md text-indigo-950 shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100">
            <img src={CLIENT_CONFIG.logoUrl} alt="Logo" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-black tracking-tight text-sm md:text-lg uppercase leading-none">
              {CLIENT_CONFIG.name}
            </span>
            <span className="text-[10px] md:text-xs font-semibold text-indigo-600 uppercase tracking-widest mt-1">
              English Institute
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <a href="#campus" className="hidden md:flex text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors mr-4">
            Campus Virtual
          </a>
          <Link 
            href="/portal" 
            className="text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg text-xs md:text-sm flex items-center gap-2"
            style={{ backgroundColor: CLIENT_CONFIG.colors.primary }}
          >
            Acceso Alumnos
          </Link>
        </div>
      </nav>

      {/* HERO SECTION - PREMIUM ANIMADO */}
      <header className="relative pt-24 pb-32 md:pt-36 md:pb-48 flex items-center justify-center text-center overflow-hidden bg-[#0a0a1a]">
        
        {/* Imágenes de fondo difuminadas */}
        <div className="absolute inset-0 flex w-full h-full opacity-30">
          <img src="fotopagina1.jpg" alt="Fondo" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a]/80 via-[#0a0a1a]/60 to-[#0a0a1a] z-10" />
        
        {/* Decoración geométrica */}
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse z-10"></div>
        <div className="absolute bottom-1/4 right-10 w-72 h-72 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse delay-1000 z-10"></div>

        <div className="relative z-20 px-6 max-w-5xl mx-auto flex flex-col items-center">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-gray-300 text-xs font-bold uppercase tracking-widest">
              Inscripciones Abiertas
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 tracking-tighter leading-[1.1]">
            El inglés que <br className="hidden md:block" /> te abre puertas.
          </h1>

          {/* TEXTO ROTATIVO */}
          <div className="text-xl md:text-3xl font-medium text-gray-400 mb-12 flex flex-col md:flex-row items-center justify-center gap-2 h-20 md:h-12">
            <span>Preparate para</span>
            <span 
              className={`font-bold text-indigo-400 transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}
            >
              {actionWords[wordIndex]}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
            <a 
              href={`https://wa.me/${CLIENT_CONFIG.contact?.phone}`}
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 rounded-xl text-lg font-bold transition-all bg-white text-indigo-950 hover:bg-gray-100 flex items-center justify-center gap-2 group"
            >
              Test de Nivel Gratis
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="#metodologia" 
              className="px-8 py-4 rounded-xl text-lg font-bold transition-all border border-gray-600 text-white hover:bg-white/5 flex items-center justify-center"
            >
              Conocé más
            </a>
          </div>
        </div>
      </header>

      {/* STATS SECTION */}
      <section className="bg-white py-12 border-b border-gray-100 relative -mt-8 z-30 max-w-6xl mx-auto rounded-3xl shadow-xl shadow-gray-200/20 px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center text-center px-4">
              <div className="bg-indigo-50 p-3 rounded-2xl mb-3">{stat.icon}</div>
              <span className="text-3xl md:text-4xl font-black text-gray-900">{stat.value}</span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* NUESTRA OFERTA (CURSOS) */}
      <section id="metodologia" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">Cursos para cada etapa</h2>
          <p className="text-gray-500 mt-4 text-lg font-medium">Acompañamos tu aprendizaje desde los primeros pasos hasta la fluidez total.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cursos.map((curso, i) => (
            <div key={i} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <BookOpen className="text-indigo-600" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{curso.title}</h3>
              <p className="text-gray-600 leading-relaxed mb-8 min-h-[80px]">{curso.desc}</p>
              <div className="flex gap-2 flex-wrap">
                {curso.tags.map((tag, j) => (
                  <span key={j} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ZONA INTERACTIVA (CAMPUS) - EL DISEÑO QUE YA FUNCIONA */}
      <section id="campus" className="py-24 bg-indigo-950 text-white overflow-hidden relative">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-900/50 border border-indigo-800 text-indigo-300 font-bold text-xs uppercase tracking-widest mb-4">
                <Sparkles size={14} /> Material Exclusivo
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">Campus Virtual</h2>
              <p className="text-indigo-200 mt-4 text-lg font-medium">
                    Seleccioná tu curso y accedé a todos los recursos complementarios, juegos y actividades preparados por {CLIENT_CONFIG.name}.
              </p>
            </div>
          </div>

          {loadingCampus ? (
            <div className="flex flex-col items-center justify-center py-20 bg-indigo-900/20 rounded-3xl border border-indigo-800/50">
              <Loader2 className="animate-spin text-indigo-400 mb-4" size={40} />
              <p className="text-indigo-300 font-bold">Cargando recursos...</p>
            </div>
          ) : (
            <>
              {/* PESTAÑAS */}
              {categories.length > 0 ? (
                <div className="flex flex-wrap gap-3 mb-12">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id.toString())}
                      className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                        activeCategory === cat.id.toString()
                          ? 'bg-white text-indigo-950 shadow-lg scale-105'
                          : 'bg-indigo-900/50 text-indigo-200 border border-indigo-800 hover:bg-indigo-800 hover:text-white'
                      }`}
                    >
                      {formatCategoryName(cat)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-indigo-400 bg-indigo-900/20 rounded-3xl border border-indigo-800/50">
                  No hay cursos configurados actualmente.
                </div>
              )}

              {/* GRILLA MATERIALES */}
              {activeMaterials.length === 0 && categories.length > 0 ? (
                <div className="text-center py-20 bg-indigo-900/20 rounded-3xl border border-indigo-800/50">
                  <Gamepad2 size={48} className="mx-auto text-indigo-400 mb-4 opacity-50" />
                  <h3 className="text-2xl font-bold text-white mb-2">Sección en preparación</h3>
                  <p className="text-indigo-300">Próximamente encontrarás material para este curso.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeMaterials.map((mat) => {
                    const design = getTypeDesign(mat.type)
                    return (
                      <a 
                        key={mat.id} 
                        href={mat.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="group bg-white rounded-3xl p-6 shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                      >
                        <div>
                          <div className={`w-14 h-14 rounded-2xl ${design.bg} flex items-center justify-center mb-5`}>
                            {design.icon}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                            {mat.title}
                          </h3>
                          <span className={`inline-block px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${design.lightBg} ${design.text}`}>
                            {mat.type === 'game' ? 'Actividad' : mat.type === 'video' ? 'Multimedia' : 'Lectura'}
                          </span>
                        </div>
                        <div className={`mt-6 flex items-center gap-2 text-sm font-bold ${design.text} group-hover:gap-3 transition-all`}>
                          {design.label} <ChevronRight size={16} className="stroke-[3]" />
                        </div>
                      </a>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CALL TO ACTION FINAL */}
      <section className="py-24 bg-white text-center px-6">
        <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">¿Listo para empezar?</h2>
        <p className="text-gray-500 mb-10 text-lg max-w-xl mx-auto">Sumate a nuestra comunidad y empezá a hablar inglés desde la primera clase.</p>
        <a 
              href={`https://wa.me/${CLIENT_CONFIG.social?.whatsapp || CLIENT_CONFIG.contact?.phone}?text=Hola!%20Me%20gustar%C3%ADa%20hacer%20un%20test%20de%20nivel%20gratuito.`}
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 rounded-xl text-lg font-bold transition-all bg-white text-indigo-950 hover:bg-gray-100 flex items-center justify-center gap-2 group"
            >
          <MessageCircle size={24} /> Contactanos por WhatsApp
        </a>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white pt-20 pb-10 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">{CLIENT_CONFIG.name}</h3>
            <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
              Formando talentos y derribando barreras idiomáticas. Instituto de inglés integral para todas las edades y niveles.
            </p>
          </div>
          <div>
            <h4 className="font-bold uppercase text-xs tracking-widest text-gray-500 mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-center gap-2"><MapPin size={16} className="text-indigo-400"/> Mar del Plata, Argentina</li>
              <li className="flex items-center gap-2"><Phone size={16} className="text-indigo-400"/> +{CLIENT_CONFIG.contact?.phone || CLIENT_CONFIG.social?.whatsapp}</li>
            </ul>
          </div>
          
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-[10px] text-gray-500 uppercase tracking-widest flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto px-6">
          <span>© {new Date().getFullYear()} {CLIENT_CONFIG.name}</span>
          <span className="mt-2 md:mt-0 flex items-center gap-1">Powered by Lógica Local <CheckCircle2 size={12} className="text-indigo-500"/></span>
        </div>
      </footer>
    </div>
  )
}