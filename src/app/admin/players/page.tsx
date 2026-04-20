'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { Search, UserPlus, Edit2, Loader2, DollarSign, X, MapPin, ArrowDownCircle, ArrowUpCircle, UserCheck, Info, FileText, ShieldCheck, User, Shield, CheckCircle, Filter, Download, CreditCard, Plus, Trash2, Link as LinkIcon, Users, RefreshCw, Trophy, Check } from 'lucide-react'
import { parseISO, format } from 'date-fns'
import { CLIENT_CONFIG } from '@/conf/clientConfig'
import { es } from 'date-fns/locale'
import { CheckCircle2} from 'lucide-react'

// Interfaces
interface Player {
 id: string; name: string; email: string; status: string; role: string; cuil?: string; phone?: string; address?: string; birth_date?: string; gender?: string; medical_notes?: string; emergency_contact?: string; emergency_contact_name?: string; account_balance: number;
 payer_name?: string; payer_cuil?: string; family_id?: string; user_categories?: any[];
}
interface Transaction { 
 id: string; 
 type: 'payment' | 'fee' | 'adjustment'; 
 amount: number; 
 date: string; 
 description: string; 
 notes?: string; 
}

export default function PlayersPage() {
 const [players, setPlayers] = useState<Player[]>([])
 const [loading, setLoading] = useState(true)
 const [searchTerm, setSearchTerm] = useState('')
 const [showToast, setShowToast] = useState(false);
 const [selectedSocioForSede, setSelectedSocioForSede] = useState<any>(null);
 const [toastMessage, setToastMessage] = useState('');

 // DATOS DE TABLAS AUXILIARES
 const [dbSports, setDbSports] = useState<any[]>([])
 const [dbSedes, setDbSedes] = useState<any[]>([])
 const [dbCategories, setDbCategories] = useState<any[]>([])
 
 // --- ESTADOS PARA FILTROS ---
 const [filterStatus, setFilterStatus] = useState<string>('all')
 const [filterCategories, setFilterCategories] = useState<string[]>([]) 
 const [filterGender, setFilterGender] = useState<string>('all')
 const [filterSport, setFilterSport] = useState<string>('all')
 const [filterSede, setFilterSede] = useState<string>('all')

 const [isModalOpen, setIsModalOpen] = useState(false)
 const [formError, setFormError] = useState<string | null>(null);
 const [paymentResponsible, setPaymentResponsible] = useState<'self' | 'third_party'>('self');
 const [isStatementOpen, setIsStatementOpen] = useState(false)
 const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
 
 const [playerToToggle, setPlayerToToggle] = useState<Player | null>(null)
 const [isSubmitting, setIsSubmitting] = useState(false)

 const [selectedPlayerForStatement, setSelectedPlayerForStatement] = useState<Player | null>(null)
 const [playerTransactions, setPlayerTransactions] = useState<Transaction[]>([])
 const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
 
 // ESTADO DE FORMULARIO AJUSTADO PARA APELLIDO Y NOMBRE
 const [formData, setFormData] = useState({ 
  lastName: '', firstName: '', email: '', cuil: '', phone: '', address: '', 
  birth_date: '', gender: '', medical_notes: '', 
  emergency_contact: '', emergency_contact_name: '' 
 })

 // ESTADOS PARA DEPORTES
 const [selectedSports, setSelectedSports] = useState<string[]>([])

 // ESTADO PARA PAGADORES DINÁMICOS
 const [payers, setPayers] = useState<{ name: string; cuil: string }[]>([{ name: '', cuil: '' }])

 // ESTADOS PARA VINCULAR HERMANOS
 const [linkingPlayer, setLinkingPlayer] = useState<Player | null>(null)
 const [siblingSearch, setSiblingSearch] = useState('')
 const [siblingResults, setSiblingResults] = useState<any[]>([])
 const [processingLink, setProcessingLink] = useState(false)

 // --- NUEVO: LÓGICA DE ASISTENCIA PARA ADMIN ---
const [playerStats, setPlayerStats] = useState<Record<string, Record<string, { present: number, total: number }>>>({});

const fetchAttendance = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateLimitStr = thirtyDaysAgo.toISOString().split('T')[0];

  // 1. Traer todas las asistencias de los ultimos 30 dias
  const { data: attData } = await supabase
    .from('attendance')
    .select('player_id, status, practice_id')
    .gte('created_at', dateLimitStr);

  if (!attData || attData.length === 0) {
    setPlayerStats({});
    return;
  }

  // 2. Extraer practice_ids unicos para buscar sus deportes
  const practiceIds = Array.from(new Set(attData.map(a => a.practice_id).filter(Boolean)));

  // 3. Traer las practicas con su categoria y deporte asociado (evitando N+1 queries)
  const { data: practicesData } = await supabase
    .from('practices')
    .select(`
      id,
      categories (
        deporte_id
      )
    `)
    .in('id', practiceIds);

  // Mapear practice_id -> deporte_id
  const practiceToDeporte: Record<number, number | null> = {};
  practicesData?.forEach((p: any) => {
    practiceToDeporte[p.id] = p.categories?.deporte_id || null;
  });

  // 4. Agrupar estadisticas por player_id y luego por deporte_id
  // Estructura: stats[player_id][deporte_id] = { present: X, total: Y }
  const stats: Record<string, Record<string, { present: number, total: number }>> = {};

  attData.forEach(row => {
    const deporteId = row.practice_id ? practiceToDeporte[row.practice_id] : null;
    if (!deporteId) return; // Si no hay deporte asociado, ignoramos

    const dIdStr = deporteId.toString();

    if (!stats[row.player_id]) stats[row.player_id] = {};
    if (!stats[row.player_id][dIdStr]) stats[row.player_id][dIdStr] = { present: 0, total: 0 };

    stats[row.player_id][dIdStr].total++;
    if (row.status === 'present') {
      stats[row.player_id][dIdStr].present++;
    }
  });

  setPlayerStats(stats);
};

 const fetchPlayers = async () => {
  try {
   setLoading(true)
   const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        user_categories (
          category_id,
          deporte_id,
          categories ( name, sede_id ),
          deportes ( name )
        )
      `)
      .contains('role', ['player'])
      .order('name', { ascending: true })
   if (error) throw error
   setPlayers(data || [])
  } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
 }

 useEffect(() => {
   const initDB = async () => {
     const { data: sports } = await supabase.from('deportes').select('*').order('name')
     const { data: sedes } = await supabase.from('sedes').select('*').order('name')
     const { data: cats } = await supabase.from('categories').select('*').order('name')
     
     if (sports) setDbSports(sports)
     if (sedes) setDbSedes(sedes)
     if (cats) setDbCategories(cats)
   }
   initDB()
 }, [])

 useEffect(() => { 
  fetchPlayers();
  fetchAttendance(); 
}, [])

 // --- NUEVA LÓGICA REALTIME PARA BALANCE AUTOMÁTICO ---
 useEffect(() => {
  if (!isStatementOpen || !selectedPlayerForStatement) return;

  const channel = supabase
    .channel('realtime_statement_changes')
    .on(
      'postgres_changes',
      {
        event: '*', 
        schema: 'public',
        table: 'payments',
        filter: `user_id=eq.${selectedPlayerForStatement.id}`
      },
      () => {
        openStatement(selectedPlayerForStatement);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
 }, [isStatementOpen, selectedPlayerForStatement]);

 const handleStatusClick = (player: Player) => {
   setPlayerToToggle(player)
   setIsStatusModalOpen(true)
 }

 const executeStatusChange = async () => {
   if (!playerToToggle) return;
   setIsSubmitting(true);
   const newStatus = playerToToggle.status === 'active' ? 'inactive' : 'active';
   
   try {
     // 1. Agregamos .select() para obligar a Supabase a confirmar si REALMENTE lo modificó
     const { data, error } = await supabase
       .from('users')
       .update({ status: newStatus })
       .eq('id', playerToToggle.id)
       .select(); // <--- LA CLAVE ESTÁ ACÁ

     if (error) throw error;
     
     // 2. Si la base de datos nos devuelve vacío, es un bloqueo silencioso de permisos (RLS)
     if (!data || data.length === 0) {
         throw new Error("Supabase bloqueó el guardado. Falta crear la política (RLS) de UPDATE en la tabla 'users'.");
     }

     // 3. Si pasó la prueba, actualizamos la pantalla
     setPlayers(players.map(p => p.id === playerToToggle.id ? { ...p, status: newStatus } : p));
     setIsStatusModalOpen(false);
     setPlayerToToggle(null);
     
     // 4. Disparamos tu cartelito flotante de éxito
     setToastMessage(`Socio cambiado a ${newStatus === 'active' ? 'ACTIVO' : 'INACTIVO'}`);
     setShowToast(true);
     setTimeout(() => setShowToast(false), 3000);

   } catch (error: any) { 
     console.error("Error real:", error);
     alert('Error: ' + error.message); // Ahora sí nos va a gritar el problema real en la cara
   } finally { 
     setIsSubmitting(false); 
   }
 }

 const openStatement = async (player: Player) => {
   setSelectedPlayerForStatement(player)
   setIsStatementOpen(true)
   setPlayerTransactions([])
   
   const { data: paymentsData } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', player.id)
    .or('status.eq.approved,status.eq.completed,method.eq.adjustment,method.eq.cuota')

   const transactions: Transaction[] = []
   let realSum = 0;
   paymentsData?.forEach(p => {
     realSum += p.amount;
     if (p.method === 'adjustment') {
       transactions.push({ id: p.id, type: 'adjustment', amount: p.amount, date: p.date || p.created_at, description: 'Ajuste Administrativo', notes: p.notes })
     } 
     else if (p.method === 'cuota') {
       const monthLabel = p.proof_url || '';
       transactions.push({ id: p.id, type: 'fee', amount: p.amount, date: p.date || p.created_at, description: monthLabel.toLowerCase().includes('cuota') ? monthLabel : `Cuota Mensual ${monthLabel}` })
     }
     else {
       const isCash = !p.proof_url || p.payment_method === 'cash' || p.payment_method === 'efectivo';
       transactions.push({ id: p.id, type: 'payment', amount: p.amount, date: p.date || p.created_at, description: isCash ? 'Pago (efectivo)' : 'Pago (transferencia)' })
     }
   })
   setSelectedPlayerForStatement(prev => prev ? {...prev, account_balance: realSum} : null);
   transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
   setPlayerTransactions(transactions)
 }

 const syncBalance = async () => {
  if (!selectedPlayerForStatement) return;
  setIsSubmitting(true);
  try {
    await supabase.from('users').update({ account_balance: selectedPlayerForStatement.account_balance }).eq('id', selectedPlayerForStatement.id);
    fetchPlayers(); alert('Saldo sincronizado con éxito.');
  } catch (error) { alert('Error al sincronizar'); } finally { setIsSubmitting(false); }
 }

 const getCategory = (category?: string) => {
  if (!category) return '-'
  return category
}

 // FUNCIONES DINÁMICAS PAGADORES
 const handleAddPayer = () => setPayers([...payers, { name: '', cuil: '' }])
 const handleRemovePayer = (index: number) => {
  if (payers.length > 1) setPayers(payers.filter((_, i) => i !== index))
 }
 const handlePayerChange = (index: number, field: 'name' | 'cuil', value: string) => {
  const newPayers = [...payers]
  newPayers[index][field] = field === 'cuil' ? formatCuil(value) : value
  setPayers(newPayers)
 }

 const formatCuil = (val: string) => {
  let value = val.replace(/\D/g, ""); 
  if (value.length > 11) value = value.slice(0, 11);
  let formatted = value;
  if (value.length > 2) formatted = `${value.slice(0, 2)}-${value.slice(2)}`;
  if (value.length > 10) formatted = `${formatted.slice(0, 11)}-${value.slice(10, 11)}`;
  return formatted;
 }

 // MANEJO DE SELECCIÓN DE DEPORTES
 const toggleSport = (sport: string) => {
 setSelectedSports(prev => 
   prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
 )
 }

 // --- LÓGICA VINCULACIÓN HERMANOS ---
 const handleSiblingSearch = async (term: string) => {
 setSiblingSearch(term)
 if (term.length < 3) { setSiblingResults([]); return }
 const { data } = await supabase
  .from('users')
  .select('id, name, cuil, family_id')
  .contains('role', ['player'])
  .neq('id', linkingPlayer?.id)
  .or(`name.ilike.%${term}%,cuil.ilike.%${term}%`)
  .limit(5)
 setSiblingResults(data || [])
 }

 const executeLink = async (targetSibling: any) => {
    if (!linkingPlayer || !targetSibling) return;
    setProcessingLink(true);

    try {
      const familyIdToUse = linkingPlayer.family_id || targetSibling.family_id || crypto.randomUUID();

      console.log("Sincronizando familia UUID:", familyIdToUse);

      const { data, error } = await supabase
        .from('users')
        .update({ family_id: familyIdToUse })
        .in('id', [linkingPlayer.id, targetSibling.id])
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("No se encontraron los registros para actualizar.");
      }

      setToastMessage(`Vínculo familiar activo para ${linkingPlayer.name} y ${targetSibling.name}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);

      setLinkingPlayer(null);
      setSiblingSearch('');
      setSiblingResults([]);
      
      if (typeof fetchPlayers === 'function') {
        await fetchPlayers();
      }

    } catch (error: any) {
      console.error("Error crítico en vinculación:", error.message);
      alert("Error al guardar en base de datos. Verificá los permisos de la tabla users.");
    } finally {
      setProcessingLink(false);
    }
  };

 const openModal = (player?: Player) => {
 if (player) { 
  const dbGender = (player.gender || "").toLowerCase().trim();
  let selectedGender = "";
  if (dbGender === 'm') selectedGender = "M";
  if (dbGender === 'f') selectedGender = "F";
  if (dbGender === 'other' || dbGender === 'otro') selectedGender = "other";

  const fullName = (player.name || '').trim();
  const hasComma = fullName.includes(',');

  const lastName = hasComma ? fullName.split(',')[0].trim() : fullName.split(' ')[0];
  const firstName = hasComma ? fullName.split(',')[1].trim() : fullName.substring(fullName.indexOf(' ') + 1).trim();

  // PARSEAR DEPORTES DESDE LA TABLA user_categories
  if (player.user_categories && player.user_categories.length > 0) {
    const mappedSports = player.user_categories.map((uc: any) => uc.deporte_id?.toString()).filter(Boolean);
    setSelectedSports(Array.from(new Set(mappedSports)));
  } else {
    setSelectedSports([]);
  }

  setEditingPlayer(player)
  setFormData({ 
   lastName, firstName, email: player.email || '', cuil: player.cuil || '', 
   phone: player.phone || '', address: player.address || '', birth_date: player.birth_date || '', 
   gender: selectedGender, medical_notes: player.medical_notes || '', 
   emergency_contact: player.emergency_contact || '', emergency_contact_name: player.emergency_contact_name || '' 
  })

  if (player.payer_name) {
   const names = player.payer_name.split(' / ')
   const cuils = (player.payer_cuil || "").split(' / ')
   setPayers(names.map((n, i) => ({ name: n, cuil: cuils[i] || '' })))
  } else {
   setPayers([{ name: '', cuil: '' }])
  }
 } else { 
  setEditingPlayer(null)
  setFormData({ lastName: '', firstName: '', email: '', cuil: '', phone: '', address: '', birth_date: '', gender: '', medical_notes: '', emergency_contact: '', emergency_contact_name: '' }) 
  setPayers([{ name: '', cuil: '' }])
  setSelectedSports([])
 }
 setIsModalOpen(true)
 }

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault(); setIsSubmitting(true)
 try {
  if (selectedSports.length === 0) {
   alert('Debe seleccionar al menos un deporte.');
   setIsSubmitting(false); return;
  }

  const { data: existingCuil } = await supabase.from('users').select('id').eq('cuil', formData.cuil).neq('id', editingPlayer?.id || '').maybeSingle()
  if (existingCuil) {
    alert('Error: Ya existe un socio registrado con este CUIL.')
    setIsSubmitting(false); return
  }

  const combinedNames = payers.map(p => p.name).filter(n => n !== "").join(' / ')
  const combinedCuils = payers.map(p => p.cuil).filter(c => c !== "").join(' / ')
  const fullName = `${formData.lastName.trim()}, ${formData.firstName.trim()}`;

  // 1. Limpieza de datos (convierte "" a null para evitar errores en base de datos)
  const dataToSave = { 
   name: fullName,
   email: formData.email, 
   cuil: formData.cuil, 
   phone: formData.phone || null, 
   address: formData.address || null,
   birth_date: formData.birth_date || null, 
   gender: formData.gender || null, 
   medical_notes: formData.medical_notes || null,
   emergency_contact: formData.emergency_contact || null, 
   emergency_contact_name: formData.emergency_contact_name || null,
   payer_name: combinedNames || null,
   payer_cuil: combinedCuils || null
  };

  let finalUserId = editingPlayer?.id; 

  // 2. Guardado blindado en la tabla 'users'
  if (editingPlayer) { 
   const { error: updateError } = await supabase.from('users').update(dataToSave).eq('id', editingPlayer.id);
   if (updateError) throw new Error(`Error actualizando perfil: ${updateError.message}`);
  } 
  else { 
   const { data: authData, error: authError } = await supabase.auth.signUp({
     email: formData.email,
     password: formData.cuil,
     options: {
      data: { full_name: fullName, cuil: formData.cuil, role: 'player' }
     }
   })
   if (authError) throw new Error(`Error en Auth: ${authError.message}`);
   
   if (authData.user) {
     finalUserId = authData.user.id; 
     const { error: insertError } = await supabase.from('users').insert({ 
       ...dataToSave, id: finalUserId, role: 'player', status: 'active', account_balance: 0
     });
     if (insertError) throw new Error(`Error creando perfil: ${insertError.message}`);
   }
  }

  // --- 🚀 SOLUCIÓN: ACTUALIZACIÓN INTELIGENTE DE DEPORTES ---
  if (finalUserId) {
    // A. Buscamos qué deportes ya tiene el socio en la BD
    const { data: existingRelations, error: fetchError } = await supabase
      .from('user_categories')
      .select('deporte_id')
      .eq('user_id', finalUserId);
      
    if (fetchError) throw new Error(`Error consultando deportes: ${fetchError.message}`);

    const existingSportsIds = (existingRelations || []).map(r => r.deporte_id.toString());
    const newSportsIds = selectedSports; 

    // B. Calculamos qué borrar (lo que estaba en la BD pero el Admin destildó)
    const sportsToRemove = existingSportsIds.filter(id => !newSportsIds.includes(id));
    
    // C. Calculamos qué agregar (lo que el Admin tildó como nuevo)
    const sportsToAdd = newSportsIds.filter(id => !existingSportsIds.includes(id));

    // D. Borramos SOLO los deseleccionados (así no perdemos los category_id de los demás)
    if (sportsToRemove.length > 0) {
      const { error: delError } = await supabase
        .from('user_categories')
        .delete()
        .eq('user_id', finalUserId)
        .in('deporte_id', sportsToRemove.map(id => parseInt(id)));
      if (delError) throw new Error(`Error borrando deportes: ${delError.message}`);
    }

    // E. Insertamos SOLO los deportes nuevos (arrancan con category_id nulo por defecto)
    if (sportsToAdd.length > 0) {
      const userCategoriesData = sportsToAdd.map(sportId => ({
          user_id: finalUserId,
          deporte_id: parseInt(sportId) 
      }));
      const { error: relError } = await supabase.from('user_categories').insert(userCategoriesData);
      if (relError) throw new Error(`Error agregando deportes: ${relError.message}`);
    }
  }

  setIsModalOpen(false); 
  fetchPlayers();
 } catch (error: any) { 
   console.error(error);
   alert('Error al guardar socio: ' + error.message); 
 } finally { 
   setIsSubmitting(false); 
 }
 }

 // --- LÓGICA DE FILTRADO COMBINADA ---
 // --- LÓGICA DE FILTRADO COMBINADA ---
 const filteredPlayers = players.filter(p => {
  const matchesSearch = (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (p.cuil || "").includes(searchTerm)
  const matchesStatus = filterStatus === 'all' || p.status === filterStatus
  
  const ucs = p.user_categories || [];

  // 🚀 LA SOLUCIÓN: INTERSECCIÓN DE FILTROS
  // Evaluamos si el usuario aplicó al menos un filtro de actividad
  const hasActivityFilters = filterSede !== 'all' || filterSport !== 'all' || filterCategories.length > 0;
  
  // Exigimos que la coincidencia se dé exactamente en la MISMA fila de user_categories
  const matchesActivity = !hasActivityFilters || ucs.some(uc => {
    const sportMatch = filterSport === 'all' || uc.deporte_id?.toString() === filterSport;
    const sedeMatch = filterSede === 'all' || uc.categories?.sede_id?.toString() === filterSede;
    const catMatch = filterCategories.length === 0 || filterCategories.includes(uc.category_id?.toString());
    
    return sportMatch && sedeMatch && catMatch; 
  });
  
  let matchesGender = filterGender === 'all';
  if (!matchesGender) {
    const dbGender = (p.gender || "").toLowerCase().trim();
    if (filterGender === 'Masculino') {
      matchesGender = (dbGender === 'm');
    } else if (filterGender === 'Femenino') {
      matchesGender = (dbGender === 'f');
    } else if (filterGender === 'Otro') {
      matchesGender = (dbGender !== 'm' && dbGender !== 'f' && dbGender !== "");
    }
  }

  // Devolvemos el resultado cruzado
  return matchesSearch && matchesStatus && matchesGender && matchesActivity;
 })

 const filteredCategoriesForFilter = dbCategories.filter(cat => {
    const matchSport = filterSport === 'all' || cat.deporte_id?.toString() === filterSport;
    const matchSede = filterSede === 'all' || cat.sede_id?.toString() === filterSede;
    let matchGender = true;
    if (filterGender !== 'all') {
        const catGender = cat.gender?.toLowerCase() || '';
        if (filterGender === 'Masculino') matchGender = (catGender === 'm' || catGender === 'masculino' || catGender === 'male');
        if (filterGender === 'Femenino') matchGender = (catGender === 'f' || catGender === 'femenino' || catGender === 'female');
    }
    return matchSport && matchSede && matchGender;
 });

 // --- LÓGICA DE EXPORTACIÓN EXCEL ---
const exportToExcel = () => {
  const headers = ['Nombre', 'CUIL', 'Email', 'Cursos', 'Sexo', 'Estado', 'Saldo', 'Idiomas'];
  
  const rows = filteredPlayers.map(p => {
    const dbGender = (p.gender || "").toLowerCase().trim();
    let excelGender = "Otro";

    if (dbGender === 'm') {
      excelGender = "Masculino";
    } else if (dbGender === 'f') {
      excelGender = "Femenino";
    }

    const ucs = p.user_categories || [];
    const catNames = ucs.length > 0 ? Array.from(new Set(ucs.map((uc: any) => uc.categories?.name).filter(Boolean))).join(' / ') : '-';
    const sportNames = ucs.length > 0 ? Array.from(new Set(ucs.map((uc: any) => uc.deportes?.name).filter(Boolean))).join(' / ') : '-';

    return [
      p.name || '',
      p.cuil || '',
      p.email || '',
      catNames,
      excelGender,
      p.status === 'active' ? 'Activo' : 'Inactivo',
      p.account_balance || 0,
      sportNames
    ].join(';');
  });

  const csvContent = [headers.join(';'), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `socios_${new Date().toLocaleDateString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

 return (
  <div className="space-y-8 text-left">
   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div><h1 className="text-3xl font-bold tracking-tight text-gray-900">Socios</h1><p className="mt-2 text-gray-500">Gestión de Estudiantes del Instituto.</p></div>
    <div className="flex gap-2">
     <button 
      onClick={exportToExcel} 
      className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-700 transition"
     >
      <Download className="mr-2 h-4 w-4" /> Exportar Excel
     </button>
    </div>
   </div>

   <div className="flex flex-col md:flex-row gap-4 items-end bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
    <div className="relative flex-1 w-full text-left">
     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Search className="h-5 w-5 text-gray-400" /></div>
     <input type="text" className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm text-left" placeholder="Buscar por nombre o CUIL..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
    </div>
    
    <div className="flex flex-wrap md:flex-nowrap gap-4 w-full lg:w-auto items-center">
     <div className="flex items-center gap-2 text-gray-400">
      <Filter size={14}/>
      <span className="text-[10px] font-bold uppercase tracking-widest">Filtros</span>
     </div>

     <select 
      value={filterStatus} 
      onChange={(e) => setFilterStatus(e.target.value)}
      className="rounded-lg border-gray-200 bg-gray-50 py-1.5 px-3 text-xs font-bold text-gray-700 focus:border-indigo-500 focus:ring-indigo-500"
     >
      <option value="all">estado</option>
      <option value="active">Activos</option>
      <option value="inactive">Inactivos</option>
     </select>

     <select 
      value={filterSede} 
      onChange={(e) => { setFilterSede(e.target.value); setFilterCategories([]); }}
      className="rounded-lg border-gray-200 bg-gray-50 py-1.5 px-3 text-xs font-bold text-gray-700 focus:border-indigo-500 focus:ring-indigo-500"
     >
      <option value="all">Sedes</option>
      {dbSedes.map(s => <option key={s.sede_id} value={s.sede_id.toString()}>{s.name}</option>)}
     </select>

     <select 
      value={filterSport} 
      onChange={(e) => { setFilterSport(e.target.value); setFilterCategories([]); }}
      className="rounded-lg border-gray-200 bg-gray-50 py-1.5 px-3 text-xs font-bold text-indigo-700 focus:border-indigo-500 focus:ring-indigo-500"
     >
      <option value="all">Idiomas</option>
      {dbSports.map(s => <option key={s.deporte_id} value={s.deporte_id.toString()}>{s.name}</option>)}
     </select>

     <div className="relative group">
  <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 py-1.5 px-3 text-[10px] font-black uppercase text-gray-700 hover:bg-white transition-all shadow-sm">
    <span>
      {filterCategories.length === 0 
        ? "Cursos" 
        : `${filterCategories.length} Seleccionadas`}
    </span>
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m6 9 6 6 6-6"/></svg>
  </button>

  <div className="invisible group-hover:visible absolute top-full left-0 z-50 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in duration-200">
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {filteredCategoriesForFilter.map((cat) => (
        <label 
          key={cat.id} 
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            checked={filterCategories.includes(cat.id.toString())}
            onChange={() => {
              if (filterCategories.includes(cat.id.toString())) {
                setFilterCategories(filterCategories.filter(c => c !== cat.id.toString()));
              } else {
                setFilterCategories([...filterCategories, cat.id.toString()]);
              }
            }}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <span className={`text-[11px] font-bold uppercase ${filterCategories.includes(cat.id.toString()) ? 'text-indigo-700' : 'text-gray-600'}`}>
            {cat.name} ({cat.gender})
          </span>
        </label>
      ))}
      {filteredCategoriesForFilter.length === 0 && (
        <p className="text-[10px] text-gray-400 text-center py-2 font-bold uppercase">Sin cursos.</p>
      )}
    </div>
    
    {filterCategories.length > 0 && (
      <button 
        onClick={() => setFilterCategories([])}
        className="w-full mt-2 pt-2 border-t border-gray-100 text-center text-[10px] font-black text-red-500 uppercase hover:text-red-700 transition-colors"
      >
        Limpiar Selección
      </button>
    )}
  </div>
</div>

     <select 
  value={filterGender} 
  onChange={(e) => { setFilterGender(e.target.value); setFilterCategories([]); }}
  className="rounded-lg border-gray-200 bg-gray-50 py-1.5 px-3 text-xs font-bold text-gray-700 focus:border-indigo-500 focus:ring-indigo-500"
>
  <option value="all">Sexo</option>
  <option value="Masculino">Masculino</option>
  <option value="Femenino">Femenino</option>
  <option value="Otro">Otro</option>
</select>

    </div>
   </div>

   <div className="hidden md:block overflow-hidden rounded-lg bg-white shadow border border-gray-200">
    {loading ? ( <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div> ) : (
     <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
       <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6">Socio</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Familia</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nacimiento</th>        
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Asistencia (Últ. 30 días)</th>
        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6">Acciones</th>
       </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
       {filteredPlayers.map((player) => {
        const birthYear = player.birth_date ? new Date(player.birth_date).getUTCFullYear() : '';
        const siblingsNames = player.family_id ? players.filter(p => p.family_id === player.family_id && p.id !== player.id).map(p => p.name).join(', ') : '';
        return (
        <tr key={player.id} className="hover:bg-gray-50 transition">
         <td className="px-6 py-4"><div className="flex items-center"><div className={`h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white uppercase bg-indigo-500`}>{player.name.charAt(0)}</div><div className="ml-4"><div className="text-sm font-medium text-gray-900">{player.name}</div><div className="text-xs text-gray-500">{player.cuil || player.email}</div></div></div></td>
         <td className="px-6 py-4 text-center">
           {player.family_id ? <div className="flex justify-center" title={`Relacionado con: ${siblingsNames}`}><div className="bg-blue-50 text-blue-600 p-1 rounded-full border border-blue-100"><Users size={16}/></div></div> : <span className="text-[10px] text-gray-300 font-bold uppercase">Solo</span>}
         </td>
         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
  {player.birth_date ? format(parseISO(player.birth_date), 'dd/MM/yyyy') : '-'}
</td>
         <td className="px-6 py-4 whitespace-nowrap"><div className={`text-sm font-bold ${player.account_balance < 0 ? 'text-red-600' : 'text-green-600'}`}>{player.account_balance < 0 ? '-' : '+'}${Math.abs(player.account_balance).toLocaleString()}</div></td>
         
         <td className="px-6 py-4 align-middle min-w-[200px]">
           <div className="flex h-full w-full rounded-lg border border-gray-100 bg-gray-50 overflow-hidden divide-x divide-gray-200">
             {(() => {
               // Filtrar deportes unicos del jugador
               const userSports = Array.from(new Set((player.user_categories || []).map((uc: any) => ({
                 id: uc.deportes?.id || uc.deporte_id,
                 name: uc.deportes?.name
               })).filter(s => s.id && s.name).map(s => JSON.stringify(s)))).map(s => JSON.parse(s));

               if (userSports.length === 0) {
                 return <div className="flex-1 p-2 text-center text-[10px] text-gray-400 font-bold uppercase">Sin Deporte</div>;
               }

               return userSports.map((sport: any) => {
                 const sportStats = (playerStats[player.id] && playerStats[player.id][sport.id.toString()]) || { present: 0, total: 0 };
                 const percentage = sportStats.total > 0 ? Math.round((sportStats.present / sportStats.total) * 100) : null;

                 let colorClass = "text-gray-400";
                 if (percentage !== null) {
                   if (percentage >= 75) colorClass = "text-green-600";
                   else if (percentage < 50) colorClass = "text-red-600";
                   else colorClass = "text-orange-500";
                 }

                 return (
                   <div key={sport.id} className="flex-1 flex flex-col items-center justify-center p-2 min-w-[80px]">
                     <span className="text-[9px] font-black uppercase text-gray-500 truncate w-full text-center" title={sport.name}>{sport.name}</span>
                     <span className={`text-xs font-bold ${colorClass}`}>
                       {percentage !== null ? `${percentage}%` : '-'}
                     </span>
                   </div>
                 );
               });
             })()}
           </div>
         </td>

         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium px-6">
  <div className="flex justify-end gap-2">

    {/* Tus botones actuales intactos */}
    <button 
      onClick={() => setLinkingPlayer(player)} 
      className="text-gray-400 hover:text-blue-600 p-1 bg-gray-50 hover:bg-blue-50 rounded-md transition" 
      title="Vincular Hermano"
    >
      <LinkIcon size={18}/>
    </button>
    
    <button 
      onClick={() => openStatement(player)} 
      className="text-gray-500 hover:text-green-600 p-1 bg-gray-50 hover:bg-green-50 rounded-md transition" 
      title="Ver Cuenta"
    >
      <DollarSign size={18} />
    </button>
    
    <button 
      onClick={() => openModal(player)} 
      className="text-gray-500 hover:text-indigo-600 p-1 bg-gray-50 hover:bg-indigo-50 rounded-md transition" 
      title="Editar Socio"
    >
      <Edit2 size={18} />
    </button>
    
    <button 
      onClick={() => handleStatusClick(player)} 
      className={`px-2 py-1 text-xs font-medium rounded-full ${
        player.status === 'active' 
          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
          : 'bg-red-100 text-red-800 hover:bg-red-200'
      }`}
    >
      {player.status === 'active' ? 'Activo' : 'Inactivo'}
    </button>
  </div>
</td>
        </tr>
        )})}
      </tbody>
     </table>
    )}
   </div>

   <div className="md:hidden space-y-4">
    {loading ? (
     <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
    ) : (
     filteredPlayers.map((player) => (
      <div key={player.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
         <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-white uppercase bg-indigo-500 text-lg shadow-sm">
          {player.name.charAt(0)}
         </div>
         <div>
          <h3 className="text-sm font-bold text-gray-900 leading-tight text-left">{player.name}</h3>
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-tighter text-left">{player.cuil || 'SIN CUIL'}</p>
         </div>
        </div>
        <div className="flex items-center gap-2">
          {player.family_id && <div className="bg-blue-50 text-blue-600 p-1 rounded-lg"><Users size={14}/></div>}
          <button 
            onClick={() => handleStatusClick(player)} 
            className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm border ${player.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
          >
            {player.status === 'active' ? 'Activo' : 'Inactivo'}
          </button>
        </div>
       </div>

       <div className="flex flex-col gap-2">
  <div className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
    {/* Columna 1: Nacimiento */}
    <div className="space-y-0.5 flex-1 pr-2">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-left">Nacimiento</p>
      <p className="text-xs font-bold text-gray-700 text-left line-clamp-1">
        {player.birth_date ? format(parseISO(player.birth_date), 'dd/MM/yyyy') : '-'}
      </p>
    </div>

    {/* Columna 2: Saldo */}
    <div className="space-y-0.5 text-right flex-shrink-0">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Saldo</p>
      <p className={`text-xs font-black ${player.account_balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
        {player.account_balance < 0 ? '-' : '+'}${Math.abs(player.account_balance).toLocaleString()}
      </p>
    </div>
  </div>

  {/* Fila Asistencia Mobile */}
  <div className="bg-gray-50 rounded-lg p-2 flex flex-col w-full border border-gray-100">
    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">Asistencia (Últ. 30 días)</p>
    <div className="flex w-full divide-x divide-gray-200">
      {(() => {
        const userSports = Array.from(new Set((player.user_categories || []).map((uc: any) => ({
          id: uc.deportes?.id || uc.deporte_id,
          name: uc.deportes?.name
        })).filter(s => s.id && s.name).map(s => JSON.stringify(s)))).map(s => JSON.parse(s));

        if (userSports.length === 0) {
          return <div className="flex-1 text-center text-[10px] text-gray-400 font-bold uppercase p-1">Sin Deporte</div>;
        }

        return userSports.map((sport: any) => {
          const sportStats = (playerStats[player.id] && playerStats[player.id][sport.id.toString()]) || { present: 0, total: 0 };
          const percentage = sportStats.total > 0 ? Math.round((sportStats.present / sportStats.total) * 100) : null;

          let colorClass = "text-gray-400";
          if (percentage !== null) {
            if (percentage >= 75) colorClass = "text-green-600";
            else if (percentage < 50) colorClass = "text-red-600";
            else colorClass = "text-orange-500";
          }

          return (
            <div key={sport.id} className="flex-1 flex flex-col items-center justify-center p-1">
              <span className="text-[9px] font-black uppercase text-gray-500 truncate w-full text-center" title={sport.name}>{sport.name}</span>
              <span className={`text-xs font-bold ${colorClass}`}>
                {percentage !== null ? `${percentage}%` : '-'}
              </span>
            </div>
          );
        });
      })()}
    </div>
  </div>
</div>

       <div className="flex gap-2 pt-1 text-left">
        <button onClick={() => setLinkingPlayer(player)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition"><LinkIcon size={14}/> Vincular</button>
        <button 
         onClick={() => openStatement(player)} 
         className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition"
        >
         <DollarSign size={14} /> Cuenta
        </button>
        <button 
         onClick={() => openModal(player)} 
         className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition"
        >
         <Edit2 size={14} /> Editar
        </button>
       </div>
      </div>
     ))
    )}
   </div>

   {/* MODAL VINCULAR HERMANOS */}
   {linkingPlayer && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-left">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-6 relative">
        <button onClick={() => {setLinkingPlayer(null); setSiblingSearch(''); setSiblingResults([])}} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Vincular Hermanos</h3>
        <p className="text-sm text-gray-500 mb-6 text-left">Buscá al hermano de <span className="font-bold text-indigo-600">{linkingPlayer.name}</span> para unirlos.</p>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
            <input type="text" placeholder="Escribí nombre o CUIL..." className="w-full pl-10 p-3 border border-gray-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-sm text-left text-gray-900 opacity-100" value={siblingSearch} onChange={(e) => handleSiblingSearch(e.target.value)} autoFocus />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {siblingResults.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div className="text-left"><p className="font-bold text-sm text-gray-800 text-left">{s.name}</p><p className="text-[10px] text-gray-500 uppercase text-left">CUIL: {s.cuil}</p></div>
                <button onClick={() => executeLink(s)} disabled={processingLink} className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-300">{processingLink ? <Loader2 className="animate-spin size-3"/> : 'Vincular'}</button>
              </div>
            ))}
            {siblingSearch.length >= 3 && siblingResults.length === 0 && <p className="text-center py-4 text-xs text-gray-400 font-bold uppercase">No hay resultados.</p>}
          </div>
        </div>
      </div>
    </div>
   )}

   {/* MODALS */}
   {isStatementOpen && selectedPlayerForStatement && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b flex justify-between bg-gray-50 items-center">
          <div><h2 className="text-xl font-bold text-gray-900">{selectedPlayerForStatement.name}</h2><p className="text-sm text-gray-500 uppercase font-bold tracking-tighter">Estado de Cuenta</p></div>
          <div className="flex gap-2">
            <button onClick={syncBalance} disabled={isSubmitting} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition" title="Sincronizar Saldo"><RefreshCw size={20} className={isSubmitting ? 'animate-spin' : ''}/></button>
            <button onClick={() => setIsStatementOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
          </div>
        </div>
        <div className="p-6 text-center border-b">
         <span className={`text-4xl font-black tracking-tight ${selectedPlayerForStatement.account_balance < 0 ? 'text-red-600' : 'text-green-600'}`}>{selectedPlayerForStatement.account_balance < 0 ? '-' : '+'}${Math.abs(selectedPlayerForStatement.account_balance).toLocaleString()}</span>
         <p className="text-sm text-gray-500 mt-1 uppercase font-bold">Saldo Calculado Real</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3 text-left">
          {playerTransactions.length === 0 ? (<p className="text-center text-gray-400 text-sm py-4 uppercase font-bold text-left">Sin movimientos confirmados.</p>) : (
            playerTransactions.map((t) => (
              <div key={t.id} className="bg-white p-3 rounded shadow-sm border flex justify-between items-center transition hover:shadow-md">
                <div className="flex gap-3 items-center">
                 <div className={`p-2 rounded-full ${t.type === 'payment' ? 'bg-green-100 text-green-600' : (t.type === 'adjustment' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600')}`}>
                  {t.type === 'payment' ? <ArrowUpCircle size={20}/> : (t.type === 'adjustment' ? <FileText size={20}/> : <ArrowDownCircle size={20}/>)}
                 </div>
                 <div className="text-left">
                  <p className="font-bold text-sm text-gray-900 text-left">{t.description}</p>
                  {t.type === 'adjustment' && t.notes && (
                   <p className="text-[10px] text-gray-400 italic uppercase font-medium text-left">{t.notes}</p>
                  )}
                  <p className="text-xs text-gray-400 text-left">{format(parseISO(t.date), 'dd/MM/yyyy')}</p>
                 </div>
                </div>
                <span className={`font-black text-sm text-left ${
                 t.type === 'adjustment' ? 'text-blue-600' : 
                 t.type === 'fee' ? 'text-red-600' : 
                 'text-green-600'
                }`}>
                 {t.amount < 0 ? '-' : '+'}${Math.abs(t.amount).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end"><button onClick={() => setIsStatementOpen(false)} className="px-6 py-2 bg-white border border-gray-300 rounded-md text-gray-700 font-bold hover:bg-gray-100 shadow-sm transition">CERRAR</button></div>
      </div>
    </div>
   )}

   {isStatusModalOpen && playerToToggle && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-left">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 text-left">
        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
         <h3 className="text-lg font-bold text-gray-900">{playerToToggle.status === 'active' ? 'Dar de Baja' : 'Reactivar Socio'}</h3>
         <button onClick={() => setIsStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <div className="p-6 text-center">
         <p className="text-gray-600 mb-6 text-left">Cambiar estado de <strong>{playerToToggle.name}</strong> a:</p>
         <div className={`w-full py-4 rounded-xl font-black uppercase tracking-wider shadow-sm border-2 mb-6 ${playerToToggle.status === 'active' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{playerToToggle.status === 'active' ? 'INACTIVO (Baja)' : 'ACTIVO (Alta)'}</div>
         <p className="mt-4 text-[11px] text-gray-400 text-center uppercase font-bold tracking-tight text-left">* Los socios inactivos no recibirán cargos automáticos de cuotas.</p>
        </div>
        <div className="p-5 bg-gray-50 border-t flex justify-end gap-3"><button onClick={() => setIsStatusModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md transition">Cancelar</button><button onClick={executeStatusChange} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition">{isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Confirmar'}</button></div>
      </div>
    </div>
   )}

   {isModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto text-left">
    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[95vh] text-left">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50 flex-shrink-0 text-left">
        <h2 className="text-lg font-black text-gray-900 uppercase italic tracking-tight text-left">Editar Socio</h2>
        <button onClick={() => { setIsModalOpen(false); setFormError(null); }} className="text-gray-400 hover:text-gray-600 transition text-left"><X size={20}/></button>
      </div>
      
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          
          // VALIDACIÓN DE DEPORTE
          if (selectedSports.length === 0) {
            setFormError("Debe seleccionar al menos un deporte.");
            return;
          }

          // VALIDACIÓN DE CUIL (11 dígitos)
          const cuilClean = formData.cuil.replace(/\D/g, '');
          if (cuilClean.length !== 11) {
            setFormError("El CUIL debe tener exactamente 11 dígitos numéricos.");
            return;
          }

          // VALIDACIÓN RESPONSABLE (Si elige Tercero)
          if (paymentResponsible === 'third_party') {
            const incompleto = payers.some(p => !p.name?.trim() || !p.cuil?.trim());
            if (incompleto) {
              setFormError("Nombre y CUIL son obligatorios para terceros.");
              return;
            }
          }

          setFormError(null);
          handleSave(e);
        }} 
        className="flex flex-col flex-1 overflow-hidden text-left"
      >
        <div className="p-4 space-y-4 overflow-y-auto flex-1 max-h-[65vh] text-left scrollbar-hide">
          
          {/* CARTEL DE ERROR ESTÉTICA CLUB */}
          {formError && (
            <div className="bg-red-50 border-2 border-red-200 p-3 rounded-xl animate-in zoom-in duration-300 flex items-center gap-3 mb-2">
              <div className="bg-red-500 text-white p-1 rounded-full flex-shrink-0">
                <X size={14} strokeWidth={3} />
              </div>
              <p className="text-red-800 font-black uppercase text-[10px] tracking-tight">
                {formError}
              </p>
            </div>
          )}

          {/* SECCIÓN ACCESO */}
          <div>
            <div className="mb-3 border-b border-gray-200 pb-1 flex items-center gap-2 text-left">
              <h3 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2 text-left"><ShieldCheck size={14}/> Datos de Cuenta</h3>
            </div>
            <div className="space-y-1 text-left">
              <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 text-left flex items-center gap-1 text-left">Email <span className="text-red-500 font-black text-xs">*</span></label>
              <input required type="email" placeholder="usuario@gmail.com" className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-xs text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white text-left" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>

          {/* RESPONSABLE DE PAGOS (IDÉNTICO A DASHBOARD) */}
          <div>
            <div className="mb-3 border-b border-gray-200 pb-1 flex items-center gap-2 text-left">
              <h3 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2 text-left"><CreditCard size={14}/> Responsable de Pagos</h3>
            </div>
            <div className="space-y-3 text-left">
              <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 mb-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="payment_type" value="self" checked={paymentResponsible === 'self'} onChange={() => setPaymentResponsible('self')} className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                  <span className="text-[11px] font-bold text-gray-700">Yo realizaré las transferencias</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="payment_type" value="third_party" checked={paymentResponsible === 'third_party'} onChange={() => setPaymentResponsible('third_party')} className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                  <span className="text-[11px] font-bold text-gray-700">Un tercero (Padre/Madre/Tutor)</span>
                </label>
              </div>

              {paymentResponsible === 'third_party' && (
                <div className="space-y-3">
                  {payers.map((p, index) => (
                    <div key={index} className="space-y-2 p-3 bg-indigo-50/30 rounded-xl border border-indigo-100 relative text-left">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase ml-1">Nombre Responsable {index + 1} <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="Ej: Padre/Madre/Tutor" className="w-full p-2 border border-gray-300 rounded-lg font-bold text-xs text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500 bg-white" value={p.name} onChange={e => handlePayerChange(index, 'name', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase ml-1">CUIL Responsable {index + 1} <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="20-XXXXXXXX-X" className="w-full p-2 border border-gray-300 rounded-lg font-bold text-xs text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500 bg-white" value={p.cuil} onChange={e => handlePayerChange(index, 'cuil', e.target.value)} />
                      </div>
                      {payers.length > 1 && (
                        <button type="button" onClick={() => handleRemovePayer(index)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14}/></button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={handleAddPayer} className="flex items-center gap-2 px-3 py-1.5 bg-white text-indigo-700 rounded-lg font-black text-[9px] uppercase hover:bg-indigo-50 transition border border-indigo-200 w-full justify-center shadow-sm">
                    <Plus size={14}/> Agregar otro responsable
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN PERSONAL */}
          <div>
            <div className="mb-3 border-b border-gray-200 pb-1 flex items-center gap-2 text-left">
              <h3 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2 text-left"><User size={14}/> Información Personal</h3>
            </div>
            
            {/* DEPORTES */}
            <div className="bg-indigo-50/50 p-3 rounded-2xl border-2 border-indigo-100 mb-4 text-left">
              <label className="block text-[10px] font-black text-indigo-700 uppercase mb-3 flex items-center gap-2 text-left">
                <Trophy size={14}/> Idiomas (Selección Múltiple) <span className="text-red-500 font-black text-xs">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {dbSports.map(sport => (
                  <button 
                    key={sport.deporte_id} 
                    type="button" 
                    onClick={() => toggleSport(sport.deporte_id.toString())} 
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-[10px] transition-all border ${selectedSports.includes(sport.deporte_id.toString()) ? 'bg-[#4f46e5] text-white border-[#4f46e5] shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
                  >
                    {sport.name}
                    {selectedSports.includes(sport.deporte_id.toString()) && <Check size={12} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 flex items-center gap-1">Apellido <span className="text-red-500 font-black text-xs">*</span></label>
                  <input required type="text" placeholder="Pérez" className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-xs text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 flex items-center gap-1">Nombre <span className="text-red-500 font-black text-xs">*</span></label>
                  <input required type="text" placeholder="Juan" className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-xs text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 flex items-center gap-1">CUIL <span className="text-red-500 font-black text-xs">*</span></label>
                  <input required type="text" placeholder="20-XXXXXXXX-X" className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-xs text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white" value={formData.cuil} onChange={e => setFormData({...formData, cuil: formatCuil(e.target.value)})} />
                </div>
                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 flex items-center gap-1">F. Nacimiento <span className="text-red-500 font-black text-xs">*</span></label>
                  <input required type="date" className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-xs text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1">Teléfono <span className="text-red-500 font-black text-xs">*</span></label>
                  <input required type="text" className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-xs text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 flex items-center gap-1 text-left">Género <span className="text-red-500 font-black text-xs">*</span></label>
                  <select required className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-xs text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-[10px] font-bold text-gray-700 uppercase ml-1 flex items-center gap-1">Dirección <span className="text-red-500 font-black text-xs">*</span></label>
                <input required type="text" className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-xs text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
            </div>
          </div>

          {/* SECCIÓN SALUD (IDÉNTICO A DASHBOARD) */}
          <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-left mt-2">
            <div className="mb-3 border-b border-red-200 pb-1 flex items-center gap-2 text-left">
              <h3 className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2 text-left"><Shield size={14}/> Emergencia y Salud</h3>
            </div>
            <div className="space-y-3 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-red-900 uppercase ml-1 flex items-center gap-1">Contacto <span className="text-red-500 font-black text-xs">*</span></label>
                  <input required type="text" className="w-full p-2.5 border border-red-200 rounded-xl font-bold text-xs text-gray-900 outline-none focus:ring-1 focus:ring-red-500 transition bg-white" value={formData.emergency_contact_name} onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-red-900 uppercase ml-1 flex items-center gap-1">Tel. Emerg. <span className="text-red-500 font-black text-xs">*</span></label>
                  <input required type="text" className="w-full p-2.5 border border-red-200 rounded-xl font-bold text-xs text-gray-900 outline-none focus:ring-1 focus:ring-red-500 transition bg-white" value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-red-900 uppercase ml-1">Observaciones Médicas</label>
                <textarea required rows={2} className="w-full p-2.5 border border-red-200 rounded-xl font-bold text-xs text-gray-900 outline-none transition resize-none focus:ring-1 focus:ring-red-500 bg-white" value={formData.medical_notes} onChange={e => setFormData({...formData, medical_notes: e.target.value})} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 flex-shrink-0 text-left uppercase">
          <button type="button" onClick={() => { setIsModalOpen(false); setFormError(null); }} className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-bold text-xs hover:bg-white transition shadow-sm text-left uppercase">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-wider hover:bg-indigo-700 transition shadow-lg flex items-center gap-2 text-left uppercase">
            {isSubmitting ? <Loader2 className="animate-spin h-3 w-3" /> : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

   {/* MENSAJE DE ÉXITO FLOTANTE (TOAST) */}
   {showToast && (
     <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 animate-in fade-in slide-in-from-bottom-5">
       <div className="bg-indigo-950 text-white px-8 py-4 rounded-2xl shadow-2xl border-b-4 border-orange-500 flex items-center gap-3 min-w-[320px]">
         <div className="bg-green-500 rounded-full p-1 flex-shrink-0">
           <CheckCircle2 size={20} className="text-white" />
         </div>
         <div className="text-left">
           <p className="text-[10px] uppercase font-black tracking-widest text-orange-400 text-left leading-none mb-1">Sistema {CLIENT_CONFIG.name}</p>
           <p className="font-bold text-sm tracking-tight text-left leading-tight text-white">{toastMessage}</p>
         </div>
       </div>
     </div>
   )}
  </div>
  
 )
}