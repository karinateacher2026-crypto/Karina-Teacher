'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Asegurate de que la ruta sea correcta
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DivisionesPage() {
  const router = useRouter();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, any[]>>({});
  const [categoryDoneCount, setCategoryDoneCount] = useState<Record<number, number>>({});
  // practiceDate: practice_id → scheduled_date (YYYY-MM-DD)
  const [practiceDate, setPracticeDate] = useState<Record<string, string>>({});
  // playerEnrolledAt: "player_id|category_id" → enrolled_at (YYYY-MM-DD)
  const [playerEnrolledAt, setPlayerEnrolledAt] = useState<Record<string, string>>({});
  const [initialLoading, setInitialLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/');

      // 1. Obtener asignaciones del profesor
      const { data: assignments } = await supabase
        .from('professor_assignments')
        .select(`
          category_id, 
          categories (id, name, sedes (name), deportes (name))
        `)
        .eq('professor_id', session.user.id);

      if (!assignments || assignments.length === 0) {
        setInitialLoading(false);
        return;
      }

      const profeCats = assignments.map((a: any) => ({
        ...a.categories,
        sedeName: a.categories.sedes?.name || 'Sin Sede',
        deporteName: a.categories.deportes?.name || 'Sin Deporte',
      })).filter(Boolean);

      setCategories(profeCats);
      const myCategoryIds = profeCats.map(c => c.id);

      // 2. Cargar TODOS los jugadores de mis categorías
      const { data: relData, error: relError } = await supabase
        .from('user_categories')
        .select('category_id, enrolled_at, users:user_id (id, name, status, role)')
        .in('category_id', myCategoryIds);

      if (relError) throw relError;

      // playerEnrolledAt: "player_id|category_id" → enrolled_at (YYYY-MM-DD)
      const playerEnrolledAt: Record<string, string> = {};
      relData?.forEach((rel: any) => {
        if (rel.users?.id && rel.category_id && rel.enrolled_at) {
          playerEnrolledAt[`${rel.users.id}|${rel.category_id}`] = rel.enrolled_at;
        }
      });

      const players = relData
        ?.map((rel: any) => ({
          ...rel.users,
          category_id: rel.category_id
        }))
        .filter(p => p.role?.includes('player'))
        .sort((a, b) => a.name.localeCompare(b.name)) || [];

      setAllPlayers(players);
      setPlayerEnrolledAt(playerEnrolledAt);

      // 3. LÓGICA MAESTRA DE DIVISIONES: Cargar Prácticas y Asistencias de los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateLimitStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: recentPractices } = await supabase
        .from('practices')
        .select('id, category_id, scheduled_date')
        .in('category_id', myCategoryIds)
        .gte('scheduled_date', dateLimitStr);

      const pDate: Record<string, string> = {};
      recentPractices?.forEach((p: any) => {
        if (p.scheduled_date) pDate[p.id] = p.scheduled_date.slice(0, 10);
      });
      setPracticeDate(pDate);

      const pStats: any = {};
      const practicasConAsistencia: Record<number, Set<string>> = {};

      if (recentPractices && recentPractices.length > 0) {
        const recentIds = recentPractices.map(p => p.id);

        const { data: recentAttData } = await supabase
          .from('attendance')
          .select('practice_id, player_id, status')
          .in('practice_id', recentIds);

        recentAttData?.forEach(row => {
          const practiceInfo = recentPractices.find(p => p.id === row.practice_id);
          const realCategoryId = practiceInfo?.category_id;

          if (!pStats[row.player_id]) pStats[row.player_id] = [];
          pStats[row.player_id].push({
            practice_id: row.practice_id,
            status: row.status,
            category_id: realCategoryId
          });

          if (realCategoryId) {
            if (!practicasConAsistencia[realCategoryId]) practicasConAsistencia[realCategoryId] = new Set();
            practicasConAsistencia[realCategoryId].add(row.practice_id);
          }
        });
      }

      const catDoneCount: Record<number, number> = {};
      Object.entries(practicasConAsistencia).forEach(([catId, set]) => {
        catDoneCount[Number(catId)] = set.size;
      });

      setPlayerStats(pStats);
      setCategoryDoneCount(catDoneCount);

    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setInitialLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (initialLoading) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 p-4 md:p-8">
      {/* HEADER CENTRAL */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Panel del Profesor</p>
          <h2 className="text-3xl md:text-5xl font-black text-indigo-950 uppercase italic tracking-tighter leading-none">
            DIVISIONES
          </h2>
        </div>
      </header>

      {/* CONTENIDO DE DIVISIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-indigo-900 p-4 md:p-6 text-white">
              <p className="font-black uppercase italic text-sm md:text-lg leading-none">
                {cat.name} <span className="opacity-60 text-xs md:text-sm"></span>
              </p>
              <div className="flex gap-2 mt-2">
                <span className="text-[8px] md:text-[10px] font-black bg-white/20 px-2 py-0.5 rounded uppercase tracking-tighter">
                  {cat.sedeName}
                </span>
                <span className="text-[8px] md:text-[10px] font-black bg-indigo-500/50 px-2 py-0.5 rounded uppercase tracking-tighter">
                  {cat.deporteName}
                </span>
              </div>
            </div>

            <div className="p-4 md:p-6 space-y-2">
              {allPlayers.filter(p => p.category_id === cat.id && p.status === 'active').length === 0 && (
                 <p className="text-center text-[10px] uppercase font-bold text-slate-400 py-4">Sin jugadores activos</p>
              )}
              
              {allPlayers.filter(p => p.category_id === cat.id && p.status === 'active').map(p => {
                // 1. Obtenemos todos los registros del jugador
                const allRecs = playerStats[p.id] || [];

                // 2. FILTRO MAESTRO: Solo tomamos las asistencias que pertenecen a ESTA categoría
                let filteredRecs = allRecs.filter((r: any) => r.category_id === cat.id);

                // 3. Filtramos desde cuándo el jugador se incorporó a esta categoría
                const enrolledAt = playerEnrolledAt[`${p.id}|${cat.id}`] || null;
                if (enrolledAt) {
                  filteredRecs = filteredRecs.filter((r: any) => (practiceDate[r.practice_id] || '') >= enrolledAt);
                }

                // 4. Denominador: solo las prácticas donde este jugador tiene registro propio
                // (evita arrastrar entrenamientos de la categoría previos a su incorporación
                // o de un período de baja/inactividad)
                const totalClases = filteredRecs.length;
                const presentes = filteredRecs.filter((r: any) => r.status === 'present').length;
                const porc = totalClases > 0 ? Math.round((presentes / totalClases) * 100) : 0;

                return (
                  <div key={p.id} className="p-3 md:p-4 bg-slate-50 rounded-2xl flex justify-between items-center hover:bg-slate-100 transition-colors">
                    <span className="text-[10px] md:text-xs font-black text-slate-700 uppercase">{p.name}</span>
                    <div className={`px-3 py-2 md:px-4 md:py-2 rounded-xl border font-black text-[9px] md:text-[10px] ${porc >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                      {totalClases > 0 ? `${porc}% ASIST.` : 'SIN DATOS'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}