'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { CLIENT_CONFIG } from '@/conf/clientConfig' // (Ajustá la ruta si tu archivo de config está en otra carpeta)
import { 
  Plus, Calendar, Search, CreditCard, Banknote, Trash2, 
  Download, TrendingUp, TrendingDown, Scale, AlertTriangle, Loader2, X,
  PieChart as PieIcon, BarChart3, MessageSquare, Users, CheckCircle2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Swal from 'sweetalert2';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalIncomes, setTotalIncomes] = useState(0); // Este será Cuotas + Ingresos Extra
  const [loading, setLoading] = useState(true);
  const [filterRange, setFilterRange] = useState('este-mes');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMembers, setActiveMembers] = useState(0);
  
  // Datos para el gráfico comparativo mensual del año
  const [monthlyComparison, setMonthlyComparison] = useState<any[]>([]);

  // ESTADOS PARA MODALES
const [deleteModal, setDeleteModal] = useState<{show: boolean, id: string | null, type: 'ingreso' | 'egreso' | null}>({ show: false, id: null, type: null });  const [addModal, setAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); 
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- INSERCIÓN 1: TIPO DE TRANSACCIÓN Y CATEGORÍAS ---
  const [modalType, setModalType] = useState<'egreso' | 'ingreso'>('egreso');
  
  const categories = ['Alquiler', 'Seguro', 'Farmacia', 'Arbitrajes', 'Planillas', 'Gráfica', 'Lavadero', "Maestranza", "Insumos Limpieza", "Sueldos", "Material didáctico y deportivo", "Otros"];
  const incomeCategories = ['Eventos', 'Ingresos Asabal', 'Sponsorización', 'Donaciones', 'Alquiler de Cancha', 'Venta de insumos', 'Otros'];
  
  const currentCategories = modalType === 'egreso' ? categories : incomeCategories;

  // ESTADO PARA NUEVA TRANSACCIÓN
  const [newExpense, setNewExpense] = useState({
    category: '', // Se seteará al abrir el modal
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'Transferencia',
    notes: ''
  });

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e', '#1e1b4b', '#64748b', '#94a3b8'];
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  useEffect(() => {
    fetchData();
    fetchMonthlyYearlyData(); 
  }, [filterRange]);

  const pieData = useMemo(() => {
    return categories.map(cat => {
      const total = expenses
        .filter(e => e.category === cat)
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      return { name: cat, value: total };
    }).filter(item => item.value > 0);
  }, [expenses]);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25; 
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#1e1b4b" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[11px] font-black">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const fetchMonthlyYearlyData = async () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
    
    const { data: expData } = await supabase.from('expenses').select('amount, date').gte('date', startOfYear);
    const { data: payData } = await supabase.from('payments').select('amount, created_at, method, status').gte('created_at', startOfYear);
    const { data: incExtraData } = await supabase.from('incomes').select('amount, date').gte('date', startOfYear);

    const monthlyData = MONTHS.map((month, index) => {
      const monthExpenses = expData?.filter(e => new Date(e.date).getUTCMonth() === index).reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      
      const cuotasIncomes = payData?.filter(p => {
        const pDate = new Date(p.created_at);
        const isThisMonth = pDate.getUTCMonth() === index;
        const isValidTransfer = p.method === 'transfer' && p.status === 'approved';
        const isValidCash = p.method === 'cash' && p.status === 'completed';
        return isThisMonth && (isValidTransfer || isValidCash);
      }).reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      const extrasIncomes = incExtraData?.filter(e => new Date(e.date).getUTCMonth() === index).reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      return { name: month, ingresos: cuotasIncomes + extrasIncomes, egresos: monthExpenses };
    });
    
    setMonthlyComparison(monthlyData);
  };

  const fetchData = async () => {
    setLoading(true);
    const now = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (filterRange === 'este-mes') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    } else if (filterRange === 'mes-pasado') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    } else if (filterRange === 'este-año') {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString();
    } else if (filterRange === 'año-pasado') {
      startDate = new Date(now.getFullYear() - 1, 0, 1).toISOString();
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString();
    }

    let query = supabase.from('expenses').select('*');
    let paymentQuery = supabase.from('payments').select('amount, method, status');
    
    // Cambiamos el select para traer todo de incomes para poder mostrarlo en la tabla
    let incomeExtraQuery = supabase.from('incomes').select('*');

    if (startDate) {
      query = query.gte('date', startDate);
      paymentQuery = paymentQuery.gte('created_at', startDate);
      incomeExtraQuery = incomeExtraQuery.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
      paymentQuery = paymentQuery.lte('created_at', endDate);
      incomeExtraQuery = incomeExtraQuery.lte('date', endDate);
    }

    const [expensesRes, paymentsRes, incomesExtraRes, activeMembersRes] = await Promise.all([
      query.order('date', { ascending: false }),
      paymentQuery,
      incomeExtraQuery.order('date', { ascending: false }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active').contains('role', ['player'])
    ]);

    // --- INSERCIÓN: UNIFICACIÓN PARA LA TABLA ---
    // Marcamos cada uno con su tipo para diferenciarlos en el listado
    const egresosProcesados = (expensesRes.data || []).map(e => ({ ...e, type: 'egreso' }));
    const ingresosProcesados = (incomesExtraRes.data || []).map(i => ({ ...i, type: 'ingreso' }));
    
    // Unimos ambos y ordenamos por fecha para que la tabla sea cronológica
    const todosLosMovimientos = [...egresosProcesados, ...ingresosProcesados].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setExpenses(todosLosMovimientos);
    setActiveMembers(activeMembersRes?.count || 0);

    // --- CÁLCULO DE RECAUDACIÓN TOTAL (Cuotas + Extras) ---
    let totalCobradas = 0;
    if (paymentsRes.data) {
      totalCobradas = paymentsRes.data
        .filter(p => (p.method === 'transfer' && p.status === 'approved') || (p.method === 'cash' && p.status === 'completed'))
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
    }

    let totalExtras = 0;
    if (incomesExtraRes.data) {
      totalExtras = incomesExtraRes.data.reduce((acc, curr) => acc + Number(curr.amount), 0);
    }

    setTotalIncomes(totalCobradas + totalExtras);
    setLoading(false);
  };;

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) return;
    
    setIsSaving(true);
    const table = modalType === 'egreso' ? 'expenses' : 'incomes';
    
    const { error } = await supabase.from(table).insert([{
      category: newExpense.category,
      amount: parseFloat(newExpense.amount),
      // CAMBIO: Enviamos el string puro del input para evitar desfase de zona horaria
      date: newExpense.date, 
      payment_method: newExpense.payment_method,
      notes: newExpense.notes
    }]);

    if (!error) {
      setAddModal(false);
      fetchData();
      fetchMonthlyYearlyData();
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2200);
    }
    setIsSaving(false);
  };

  const executeDelete = async () => {
    if (!deleteModal.id || !deleteModal.type) return;
    setIsDeleting(true);
    
    const tableToDelete = deleteModal.type === 'ingreso' ? 'incomes' : 'expenses';

    try {
      const { error } = await supabase.from(tableToDelete).delete().eq('id', deleteModal.id);
      if (!error) {
        setDeleteModal({ show: false, id: null, type: null });        
        fetchData();
        fetchMonthlyYearlyData();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Tipo", "Fecha", "Categoria", "Metodo", "Monto", "Notas"];
    
    const rows = filteredExpenses.map(e => [
      e.type.toUpperCase(),
      // CAMBIO: Formateamos la fecha como texto puro para el Excel también
      e.date.split('-').reverse().join('/'),
      e.category.toUpperCase(),
      e.payment_method,
      e.type === 'egreso' ? `-${e.amount}` : e.amount,
      e.notes || '-'
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Balance_${filterRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

 // 1. Esto se mantiene igual para filtrar las filas de la tabla de abajo
  const filteredExpenses = expenses.filter(e => e.category.toLowerCase().includes(searchTerm.toLowerCase()));

  // 2. CORRECCIÓN: Usamos 'expenses' directamente en lugar de 'filteredExpenses'
  // Esto hace que el KPI de la tarjeta roja sea fijo según el calendario
  const totalExpenses = expenses
    .filter(e => e.type === 'egreso')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  // 3. El balance ahora también es fijo y real al usar el totalExpenses corregido
  const balance = totalIncomes - totalExpenses;

  // Funciones para abrir modales seteando el tipo
  const openAddModal = (type: 'ingreso' | 'egreso') => {
    setModalType(type);
    setNewExpense({
      category: type === 'egreso' ? categories[0] : incomeCategories[0],
      amount: '',
      date: new Date().toISOString().split('T')[0],
      payment_method: 'Transferencia',
      notes: ''
    });
    setAddModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left relative pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic uppercase">Balance financiero</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Control financiero y balance neto del club {CLIENT_CONFIG.name}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="bg-[#00b341] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#009938] transition-all shadow-sm active:scale-95 text-xs">
            <Download size={18} /> Exportar Excel
          </button>
          
          {/* --- INSERCIÓN 3: BOTÓN DE REGISTRAR INGRESO --- */}
          <button onClick={() => openAddModal('ingreso')} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-xs uppercase tracking-wider">
            <Plus size={20} /> Registrar Ingreso
          </button>

          <button onClick={() => openAddModal('egreso')} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 text-xs uppercase tracking-wider">
            <Plus size={20} /> Registrar Egreso
          </button>
        </div>
      </div>

      {/* TARJETAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Recaudación</p>
            <h2 className="text-2xl font-bold text-slate-800 italic">$ {totalIncomes.toLocaleString('es-AR')}</h2>
            <p className="text-emerald-500 text-xs font-bold mt-4 italic">Total de Ingresos</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl"><TrendingUp className="text-emerald-500" size={20} /></div>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Egresos</p>
            <h2 className="text-2xl font-bold text-slate-800 italic">$ {totalExpenses.toLocaleString('es-AR')}</h2>
            <p className="text-red-500 text-xs font-bold mt-4 italic">Gastos del periodo</p>
          </div>
          <div className="bg-red-50 p-3 rounded-xl"><TrendingDown className="text-red-500" size={20} /></div>
        </div>

        <div className={`p-7 rounded-2xl border shadow-sm flex justify-between items-start transition-colors ${balance >= 0 ? 'bg-white border-slate-100' : 'bg-red-50/10 border-red-100'}`}>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Balance Neto</p>
            <h2 className={`text-2xl font-bold italic ${balance >= 0 ? 'text-emerald-500' : 'text-red-600'}`}>$ {balance.toLocaleString('es-AR')}</h2>
            <p className={`text-xs font-bold mt-4 italic ${balance >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>Diferencia ingresos/gastos</p>
          </div>
          <div className={`${balance >= 0 ? 'bg-emerald-50' : 'bg-red-50'} p-3 rounded-xl`}><Scale className={balance >= 0 ? 'text-emerald-500' : 'text-red-500'} size={20} /></div>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Socios Activos</p>
            <h2 className="text-2xl font-bold text-slate-800 italic">{activeMembers}</h2>
            <p className="text-blue-500 text-xs font-bold mt-4 italic">Total en sistema</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-xl">
            <Users className="text-blue-500" size={20} />
          </div>
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <PieIcon className="text-indigo-600" size={18} />
            <h3 className="font-black text-[#1e1b4b] uppercase italic text-sm">Distribución de Gastos</h3>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 100, bottom: 0, left: 20 }}> 
                <Pie 
                  data={pieData} 
                  innerRadius={35} 
                  outerRadius={60} 
                  paddingAngle={5} 
                  dataKey="value"
                  labelLine={true}
                  label={renderCustomizedLabel}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${Number(value).toLocaleString('es-AR')}`} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingLeft: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="text-emerald-600" size={18} />
            <h3 className="font-black text-[#1e1b4b] uppercase italic text-sm">Balance Mensual {new Date().getFullYear()}</h3>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f8fafc'}} formatter={(value: any) => `$${Number(value).toLocaleString('es-AR')}`} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{fontSize:'10px', fontWeight:'bold', marginBottom:'10px'}} />
                <Bar name="Ingresos" dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar name="Egresos" dataKey="egresos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* FILTROS Y TABLA */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-full md:w-auto">
          <Calendar size={18} className="text-slate-400" />
          <select value={filterRange} onChange={(e) => setFilterRange(e.target.value)} className="bg-transparent font-bold text-xs text-slate-600 outline-none cursor-pointer uppercase tracking-wider">
            <option value="este-mes">Este Mes</option>
            <option value="mes-pasado">Mes Pasado</option>
            <option value="este-año">Este Año</option>
            <option value="año-pasado">Año Pasado</option>
          </select>
        </div>
        <div className="flex-grow relative w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por categoría" 
            className="w-full pl-14 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 transition-all text-sm font-bold text-slate-700 placeholder:text-slate-400" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Fecha</th>
                {/* --- AGREGAR ESTA LÍNEA --- */}
                <th className="px-8 py-5">Tipo</th>
                <th className="px-8 py-5">Categoría</th>
                <th className="px-8 py-5">Método</th>
                <th className="px-8 py-5">Observaciones</th>
                <th className="px-8 py-5 text-right">Monto</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
  {filteredExpenses.map((exp) => (
  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
    <td className="px-8 py-5 text-sm font-bold text-slate-400 italic whitespace-nowrap">
      {/* CAMBIO: Formato de texto manual para evitar errores de zona horaria */}
      {exp.date.split('-').reverse().join('/')}
    </td>

      {/* --- COLUMNA TIPO AGREGADA --- */}
      <td className="px-8 py-5 whitespace-nowrap">
        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
          exp.type === 'ingreso' 
            ? 'bg-emerald-100 text-emerald-600' 
            : 'bg-red-100 text-red-600'
        }`}>
          {exp.type}
        </span>
      </td>

      <td className="px-8 py-5 whitespace-nowrap">
        <span className="font-bold text-slate-700 text-sm uppercase">{exp.category}</span>
      </td>

      <td className="px-8 py-5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {exp.payment_method === 'Efectivo' ? <Banknote size={16} className="text-emerald-500" /> : <CreditCard size={16} className="text-blue-500" />}
          <span className="text-[11px] font-bold text-slate-500 uppercase italic">{exp.payment_method}</span>
        </div>
      </td>

      <td className="px-8 py-5 text-xs font-medium text-slate-400 max-w-[200px] truncate">
        {exp.notes || '-'}
      </td>

      {/* --- MONTO CORREGIDO (Color y Signo dinámico) --- */}
      <td className={`px-8 py-5 text-right font-bold text-lg italic whitespace-nowrap ${
        exp.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'
      }`}>
        {exp.type === 'ingreso' ? '+' : '-'} $ {Number(exp.amount).toLocaleString('es-AR')}
      </td>

      <td className="px-8 py-5 text-right">
        <button 
    // AGREGAMOS EL exp.type AL setDeleteModal PARA QUE FUNCIONE EL BORRADO
    onClick={() => setDeleteModal({ show: true, id: exp.id, type: exp.type as 'ingreso' | 'egreso' })} 
    className="text-slate-300 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-xl"
  >
    {/* VOLVEMOS A PONER TU ÍCONO ORIGINAL */}
    <Trash2 size={18} />
  </button>
      </td>
    </tr>
  ))}
</tbody>
          </table>
        </div>
      </div>

      {/* MODAL DINÁMICO PARA INGRESOS / EGRESOS */}
      {addModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <style>{`
            input[type=number]::-webkit-inner-spin-button, 
            input[type=number]::-webkit-outer-spin-button { 
              -webkit-appearance: none; 
              margin: 0; 
            }
            input[type=number] {
              -moz-appearance: textfield;
            }
          `}</style>

          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className={`${modalType === 'egreso' ? 'bg-[#1e1b4b]' : 'bg-emerald-600'} p-6 text-center relative transition-colors`}>
              <h3 className="text-xl font-black text-white italic uppercase tracking-widest">
                {modalType === 'egreso' ? 'Registrar Egreso' : 'Registrar Ingreso'}
              </h3>
              <button onClick={() => setAddModal(false)} className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">Categoría</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                >
                  {currentCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">Monto ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">Fecha</label>
                <input 
                  type="date" 
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">Notas / Observaciones</label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-4 text-slate-300" size={16} />
                  <textarea 
                    placeholder="Ej: Patrocinio mensual..." 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 transition-all resize-none" 
                    rows={2} 
                    value={newExpense.notes} 
                    onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">Método</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setNewExpense({...newExpense, payment_method: 'Transferencia'})}
                    className={`p-4 rounded-2xl border text-xs font-black uppercase tracking-tighter flex items-center justify-center gap-2 transition-all ${newExpense.payment_method === 'Transferencia' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-400'}`}
                  >
                    <CreditCard size={14} /> Transferencia
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewExpense({...newExpense, payment_method: 'Efectivo'})}
                    className={`p-4 rounded-2xl border text-xs font-black uppercase tracking-tighter flex items-center justify-center gap-2 transition-all ${newExpense.payment_method === 'Efectivo' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-100 text-slate-400'}`}
                  >
                    <Banknote size={14} /> Efectivo
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAddModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-200 transition-all">
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className={`flex-1 py-4 ${modalType === 'egreso' ? 'bg-[#1e1b4b]' : 'bg-emerald-600'} text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center`}
                >
                  {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINAR */}
      {deleteModal?.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 text-center">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={32}/></div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase italic tracking-tight">¿Eliminar {deleteModal.type}?</h3>
              <p className="text-gray-500 text-sm mb-6 font-medium">Esta acción borrará el registro de {deleteModal.type === 'ingreso' ? 'Ingresos' : 'Egresos'} y ajustará el balance automáticamente.</p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button disabled={isDeleting} onClick={() => setDeleteModal({ show: false, id: null, type: null })} className="py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition text-sm text-center">Cancelar</button>
                <button disabled={isDeleting} onClick={executeDelete} className="py-3 px-4 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition flex justify-center items-center gap-2 text-sm text-center">{isDeleting ? <Loader2 className="animate-spin h-4 w-4"/> : 'Sí, Eliminar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl p-10 max-w-xs w-full animate-in zoom-in-95 text-center border-none">
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle2 size={48} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-[#1e1b4b] uppercase italic tracking-tighter">¡Registrado!</h3>
              <p className="text-slate-400 text-sm font-bold mt-2">El movimiento se guardó con éxito.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}