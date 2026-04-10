import Link from 'next/link'
import { Trophy, Users, Calendar, Medal, Instagram, ShieldCheck, Heart, MapPin, Volleyball, Phone } from 'lucide-react'
import { CLIENT_CONFIG } from '@/conf/clientConfig'

export default function Home() {
  // CONFIGURACIÓN DE ACTIVIDADES DE VOLEY
  const deportes = [
    {
      nombre: 'Voley Escuela',
      categorias: 'Niños y Niñas (8 a 12 años)',
      horarios: 'Martes y Jueves - 18:00 hs',
      color: `border-[${CLIENT_CONFIG.colors.primary}]`
    },
    {
      nombre: 'Voley Federado',
      categorias: 'Sub-14 hasta Primera División',
      horarios: 'Lunes a Viernes - Turnos Tarde/Noche',
      color: `border-[${CLIENT_CONFIG.colors.secondary}]`
    },
    {
      nombre: 'Maxi Voley',
      categorias: 'Adultos (Recreativo y Competitivo)',
      horarios: 'Lunes, Miércoles y Viernes - 21:00 hs',
      color: 'border-indigo-400'
    }
  ]

  const stats = [
    { icon: <Calendar style={{ color: CLIENT_CONFIG.colors.primary }} size={32} />, value: '1995', label: 'Trayectoria' },
    { icon: <Users style={{ color: CLIENT_CONFIG.colors.primary }} size={32} />, value: '250+', label: 'Deportistas' },
    { icon: <Trophy style={{ color: CLIENT_CONFIG.colors.primary }} size={32} />, value: 'Provincial', label: 'Nivel Liga' },
    { icon: <Medal style={{ color: CLIENT_CONFIG.colors.primary }} size={32} />, value: 'Oro', label: 'Podios MDQ' },
  ]

  const diferenciales = [
    {
      icon: <ShieldCheck style={{ color: CLIENT_CONFIG.colors.primary }} size={40} />,
      title: "Entrenamiento Elite",
      desc: "Cuerpo técnico especializado en alto rendimiento y formación integral de voley."
    },
    {
      icon: <Heart style={{ color: CLIENT_CONFIG.colors.primary }} size={40} />,
      title: "Valores CDT",
      desc: "Fomentamos el compañerismo, la disciplina y el sentido de pertenencia en cada set."
    },
    {
      icon: <MapPin style={{ color: CLIENT_CONFIG.colors.primary }} size={40} />,
      title: "Nuestra Sede",
      desc: "Instalaciones preparadas para la práctica intensiva del voley marplatense."
    }
  ]

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* BOTÓN FLOTANTE WHATSAPP */}
      <a 
        href={`https://wa.me/${CLIENT_CONFIG.contact?.phone || '5492236881314'}`}
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[100] bg-green-500 text-white p-4 rounded-full shadow-2xl hover:bg-green-600 transition-all transform hover:scale-110 flex items-center justify-center"
      >
        <Phone size={28} />
      </a>

      {/* BARRA DE NAVEGACIÓN */}
      <nav className="flex items-center justify-between px-4 md:px-6 py-2 bg-[#1e1b4b] text-white shadow-xl sticky top-0 z-50">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div 
              className="h-10 w-10 md:h-12 md:w-12 rounded-full border-2 overflow-hidden bg-white flex-shrink-0 flex items-center justify-center shadow-lg"
              style={{ borderColor: CLIENT_CONFIG.colors.secondary }}
            >
              <img 
                src={CLIENT_CONFIG.logoUrl} 
                alt="Logo" 
                className="h-full w-full object-cover" 
              />
            </div>
            <span className="font-bold tracking-tighter text-[12px] md:text-xl uppercase truncate ml-1">
              {CLIENT_CONFIG.name}
            </span>
          </div>

          <Link 
            href="/nosotros" 
            className="border border-white/20 hover:border-white px-2 py-1 md:px-3 md:py-1 rounded-lg text-[9px] md:text-xs font-bold uppercase tracking-widest transition-all"
            style={{ backgroundColor: CLIENT_CONFIG.colors.primary }}
          >
            Nuestra Escuela
          </Link>
        </div>
        
        <Link 
          href="/portal" 
          className="text-white px-3 py-1.5 md:px-5 md:py-2 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg text-[10px] md:text-sm"
          style={{ backgroundColor: CLIENT_CONFIG.colors.primary }}
        >
          ACCESO SOCIOS
        </Link>
      </nav>

      {/* HERO SECTION */}
      <header className="relative min-h-[60vh] md:h-[75vh] flex items-center justify-center text-center overflow-hidden bg-indigo-950">
        <div className="absolute inset-0 flex md:grid md:grid-cols-3 w-full h-full opacity-100">
          <div className="relative h-full w-full md:border-r md:border-white/10">
            <img src="fotopagina1.jpg" alt="Cancha 1" className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:block relative h-full w-full border-r border-white/10">
            <img src="fotopagina2.jpg" alt="Cancha 2" className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:block relative h-full w-full">
            <img src="fotopagina3.jpg" alt="Cancha 3" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-950/80 z-10" />
        
        <div className="relative z-20 px-4 py-10 max-w-4xl">
          <h1 className="text-5xl md:text-8xl font-black text-white mb-2 uppercase italic tracking-tighter">
            KARINA <span style={{ color: CLIENT_CONFIG.colors.primary }}>TEACHER</span>
          </h1>
          <p className="text-lg md:text-2xl text-gray-200 mb-8 font-medium max-w-2xl mx-auto">
            Pasión por el inglés en Mar del Plata. Formación de talentos y lenguaje de alto nivel.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <Link 
              href="/portal" 
              className="px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-2xl text-white"
              style={{ backgroundColor: CLIENT_CONFIG.colors.primary }}
            >
              PORTAL DE SOCIOS
            </Link>
            <a 
              href="#contacto" 
              className="bg-white text-indigo-950 px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-2xl hover:bg-gray-100"
            >
              SUMATE AL EQUIPO
            </a>
          </div>
        </div>
      </header>

      {/* STATS */}
      <section className="bg-white py-12 md:py-20 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="bg-indigo-50 p-4 rounded-2xl mb-3">{stat.icon}</div>
              <span className="text-3xl md:text-5xl font-black text-indigo-950 italic">{stat.value}</span>
              <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* DIFERENCIALES */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-indigo-950 uppercase italic">Formación y Excelencia</h2>
            <div 
              className="h-1.5 w-20 mx-auto mt-3 rounded-full"
              style={{ backgroundColor: CLIENT_CONFIG.colors.secondary }}
            ></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {diferenciales.map((item, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                <div className="mb-6 transform group-hover:rotate-12 transition-transform">{item.icon}</div>
                <h3 className="text-xl font-bold text-indigo-950 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACTIVIDADES */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black text-indigo-950 uppercase italic">Nuestras Categorías</h2>
          <p className="text-gray-500 mt-4 font-medium">Desde escuela hasta primera división, siempre hay un lugar para vos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {deportes.map((deporte, index) => (
            <div key={index} className={`bg-white p-8 rounded-3xl shadow-lg border-t-8 ${deporte.color} transition-all hover:scale-105`}>
              <h3 className="text-2xl font-bold text-indigo-950 mb-6">{deporte.nombre}</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-black text-indigo-300 uppercase tracking-tighter">Nivel</span>
                  <p className="text-gray-700 font-bold">{deporte.categorias}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-indigo-300 uppercase tracking-tighter">Horarios Sugeridos</span>
                  <p className="text-gray-700 font-bold">{deporte.horarios}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN DE INSTAGRAM */}
      <section className="py-12 md:py-20 bg-gray-50 overflow-hidden border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-black text-indigo-950 uppercase italic flex items-center justify-center md:justify-start gap-3">
                <Instagram style={{ color: CLIENT_CONFIG.colors.primary }} size={32} />
                Seguinos en redes
              </h2>
              <p className="text-gray-500 font-medium mt-2">@voleycdt - ¡Enterate de todo!</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-xl overflow-hidden relative group cursor-pointer">
                <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/20 transition-all z-10" />
                <img 
                  src={`/fotoweb${i}.png`} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  alt="Social post" 
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contacto" className="bg-indigo-950 text-white pt-20 pb-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left mb-16">
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-2xl font-black italic mb-4 uppercase">{CLIENT_CONFIG.name}</h3>
            <p className="text-indigo-200 text-sm">Orgullosos de representar al voley de Mar del Plata en cada cancha del país.</p>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-bold uppercase text-xs tracking-widest text-indigo-400 mb-4">Ubicación Sede</h4>
            <p className="text-sm">Club Cedetalvo - Mar del Plata, Argentina</p>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-bold uppercase text-xs tracking-widest text-indigo-400 mb-4">Redes Sociales</h4>
            <div className="flex justify-center md:justify-start gap-4 items-center">
                <Instagram className="hover:text-secondary transition-colors cursor-pointer" />
                <span className="text-sm">@voleycedetalvo</span>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 text-center text-[10px] text-indigo-400 uppercase tracking-widest">
          © {new Date().getFullYear()} {CLIENT_CONFIG.name} - Powered by Lógica Local
        </div>
      </footer>
    </div>
  )
}