import React from 'react';

// Definimos qué datos acepta la tarjeta
interface KPICardProps {
  title: string;
  value: string | number;
  icon?: any;          // Aceptamos cualquier ícono
  trend?: string;      // Aceptamos "trend"
  trendValue?: string; // Aceptamos "trendValue" (el que pide el Dashboard)
  trendUp?: boolean;
  description?: string;
}

export function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, // Recibimos el dato nuevo
  trendUp, 
  description 
}: KPICardProps) {
  
  // Usamos el que venga: o trend o trendValue
  const finalTrend = trend || trendValue;

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {Icon && <div className="text-gray-400"><Icon className="h-4 w-4" /></div>}
      </div>
      
      <div className="mt-2 flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
      
      {(finalTrend || description) && (
        <div className="mt-1 flex items-center text-sm">
          {finalTrend && (
            <span className={`font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {finalTrend}
            </span>
          )}
          {description && <span className="ml-2 text-gray-500">{description}</span>}
        </div>
      )}
    </div>
  );
}