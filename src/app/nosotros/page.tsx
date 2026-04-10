import Link from 'next/link'
import { ArrowLeft, Users, Trophy, Star, Dumbbell, GraduationCap, ClipboardList, Instagram } from 'lucide-react'
import { CLIENT_CONFIG } from '@/conf/clientConfig'

export default function Nosotros() {
  // 1. PRESIDENTE / DIRIGENCIA
  const dirigencia = [
    { nombre: 'Guillermo Murakami', cargo: 'Presidente', foto: '/chino.png' },
  ]

  // 2. PROFESORES POR CATEGORÍA
  const profesores = [
    { nombre: 'Martina Pose', cargo: 'Infantiles ambas ramas', foto: '/martinapose.png' },
    { nombre: 'Bautista García', cargo: 'Menores y Cadetes damas', foto: '/jbau.png' },
    { nombre: 'Rocío Rodriguez', cargo: 'Menores y Cadetes damas', foto: '/rocha.png' },
    { nombre: 'Pablo Balcabao', cargo: 'Menores y Cadetes caballeros', foto: '/pablo.png' },
    { nombre: 'Nicolás Pose', cargo: 'Menores y Cadetes caballeros', foto: '/nicopose.png' },
    { nombre: 'Jennifer Ladreche', cargo: 'Juveniles y Mayores caballeros', foto: '/jenni.png' },
    { nombre: 'Nicolás Sosa', cargo: 'Mayores caballeros', foto: '/nicoentrenador.png' },
    { nombre: 'Facundo Maiques', cargo: 'Juveniles y Mayores damas', foto: '/maiques.png' },
  ]

  // 3. ASISTENTES TÉCNICOS
  const asistentes = [
    { nombre: 'Federico García', cargo: 'Asistente Técnico General', foto: '/fedegarcia.png' },
  ]

  // 4. PREPARACIÓN FÍSICA
  const preparadores = [
    { nombre: 'Federico Vidal', cargo: 'Preparador Físico - Todas las categorías', foto: '/prep.fisica.png' },
  ]

  // 5. PATÍN
  const patin = [
    { nombre: 'Nombre de Profesora', cargo: 'Profesora de Patín Artístico', foto: '/staff-patin.png' },
  ]

  // 6. REDES Y COMUNICACIÓN
  const comunicacion = [
    { nombre: 'Chiara Pastorini', cargo: 'Comunicación y Redes Sociales', foto: '/pastorini.png' },
  ]

 return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900">
      {/* NAVBAR */}
      <nav className="bg-indigo-950 text-white px-8 py-6 shadow-xl sticky top-0 z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:text-orange-500 transition-colors group text-lg md:text-xl">
            <ArrowLeft size={28} className="group-hover:-translate-x-2 transition-transform" />
            <span className="font-bold uppercase tracking-tighter">Inicio</span>
          </Link>
          <span className="font-bold tracking-tighter text-[12px] md:text-xl uppercase truncate ml-1">
            Staff {CLIENT_CONFIG.name}
          </span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20">
        {/* ENCABEZADO */}
        <div className="text-center mb-24">
          <h1 className="text-5xl md:text-8xl font-black text-indigo-950 uppercase italic mb-6 tracking-tighter">
            <span style={{ color: CLIENT_CONFIG.colors.primary }}>Nuestro Equipo</span>
          </h1>
          <div className="h-3 w-32 bg-orange-500 mx-auto rounded-full mb-10"></div>
          <p className="text-gray-600 max-w-3xl mx-auto font-semibold text-base md:text-2xl leading-relaxed opacity-90">
            Conocé a las personas que trabajan día a día con compromiso y pasión para que el club siga creciendo, 
            formando deportistas íntegros y potenciando el talento en cada categoría.
          </p>
        </div>

        {/* SECCIÓN 1: DIRIGENCIA */}
        <section className="mb-20 text-center">
          <div className="flex justify-center items-center gap-2 mb-8 text-indigo-950">
            <Star size={24} className="text-orange-500" />
            <h2 className="text-2xl font-black uppercase italic">Dirigencia</h2>
          </div>
          <div className="flex justify-center">
            {dirigencia.map((p, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 w-full max-w-xs">
                <div className="h-48 w-48 rounded-full overflow-hidden mx-auto mb-4 border-4 border-orange-500 shadow-inner">
                  <img src={p.foto} alt={p.nombre} className="h-full w-full object-cover object-top" />
                </div>
                <h3 className="text-xl font-black text-indigo-950 uppercase">{p.nombre}</h3>
                <p className="text-orange-600 font-bold text-xs uppercase tracking-widest">{p.cargo}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN 2: CUERPO TÉCNICO */}
        <section className="mb-20">
          <div className="flex justify-center items-center gap-2 mb-10 text-indigo-950">
            <GraduationCap size={28} className="text-orange-500" />
            <h2 className="text-3xl font-black uppercase italic text-center">Cuerpo Técnico</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
            {profesores.map((p, i) => (
              <div key={i} className="bg-white p-4 md:p-6 rounded-2xl shadow-md border-b-4 border-indigo-600 flex flex-col items-center text-center transition-transform hover:-translate-y-2">
                <div className="h-32 w-32 md:h-44 md:w-44 rounded-full overflow-hidden mb-4 border-2 border-gray-100">
                  <img src={p.foto} alt={p.nombre} className="h-full w-full object-cover object-top" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-indigo-950 leading-tight">{p.nombre}</h3>
                <p className="text-gray-500 font-bold text-[10px] md:text-xs uppercase mt-1 italic">{p.cargo}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN 3: ASISTENTE TÉCNICO */}
        <section className="mb-20 text-center">
          <div className="flex justify-center items-center gap-2 mb-8 text-indigo-950">
            <ClipboardList size={26} className="text-orange-500" />
            <h2 className="text-2xl font-black uppercase italic">Asistente Técnico</h2>
          </div>
          <div className="flex justify-center">
            {asistentes.map((p, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 w-full max-w-xs border-b-4 border-indigo-600">
                <div className="h-44 w-44 rounded-full overflow-hidden mx-auto mb-4 border-2 border-gray-100 shadow-sm">
                  <img src={p.foto} alt={p.nombre} className="h-full w-full object-cover object-top" />
                </div>
                <h3 className="text-lg font-black text-indigo-950 uppercase">{p.nombre}</h3>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-1">{p.cargo}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN 4: PREPARACIÓN FÍSICA */}
        <section className="mb-20">
          <div className="flex justify-center items-center gap-2 mb-10 text-indigo-950">
            <Dumbbell size={28} className="text-orange-500" />
            <h2 className="text-3xl font-black uppercase italic text-center">Preparación Física</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-8 max-w-4xl mx-auto">
            {preparadores.map((p, i) => (
              <div key={i} className="bg-indigo-950 text-white p-6 rounded-2xl shadow-xl flex items-center gap-4 border-l-4 border-orange-500 w-full max-w-sm">
                <div className="h-24 w-24 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={p.foto} alt={p.nombre} className="h-full w-full object-cover object-top" />
                </div>
                <div>
                  <h3 className="font-black uppercase text-lg italic">{p.nombre}</h3>
                  <p className="text-orange-400 font-bold text-[10px] uppercase tracking-wider">{p.cargo}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN 5: PATÍN */}
        <section className="mb-20 text-center">
          <div className="flex justify-center items-center gap-2 mb-8 text-indigo-950">
            <Trophy size={24} className="text-orange-500" />
            <h2 className="text-2xl font-black uppercase italic">Patín Artístico</h2>
          </div>
          <div className="flex justify-center">
            {patin.map((p, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 w-full max-w-xs border-b-4 border-green-500">
                <div className="h-44 w-44 rounded-full overflow-hidden mx-auto mb-4 border-2 border-gray-100 shadow-sm">
                  <img src={p.foto} alt={p.nombre} className="h-full w-full object-cover object-top" />
                </div>
                <h3 className="text-lg font-black text-indigo-950 uppercase">{p.nombre}</h3>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-1">{p.cargo}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN 6: COMUNICACIÓN Y REDES */}
        <section className="mb-12 text-center">
          <div className="flex justify-center items-center gap-2 mb-8 text-indigo-950">
            <Instagram size={24} className="text-orange-500" />
            <h2 className="text-2xl font-black uppercase italic">Comunicación y Redes</h2>
          </div>
          <div className="flex justify-center">
            {comunicacion.map((p, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 w-full max-w-xs border-b-4 border-orange-500">
                <div className="h-44 w-44 rounded-full overflow-hidden mx-auto mb-4 border-2 border-gray-100 shadow-sm">
                  <img src={p.foto} alt={p.nombre} className="h-full w-full object-cover object-top" />
                </div>
                <h3 className="text-lg font-black text-indigo-950 uppercase">{p.nombre}</h3>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-1">{p.cargo}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-indigo-950 text-indigo-300 py-8 text-center border-t border-white/10">
        <p className="text-[10px] uppercase tracking-[0.3em]">Club La Cantera - Formación y Competencia</p>
      </footer>
    </div>
  )
}