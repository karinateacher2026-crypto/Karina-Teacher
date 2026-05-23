'use client';

import React from 'react';
import { CLIENT_CONFIG } from '@/conf/clientConfig';

export default function TerminosPage() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-10 text-left">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase">Términos y Condiciones</h2>
        <p className="text-gray-500 text-sm">Acuerdo legal del socio con {CLIENT_CONFIG.name}.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-left">
        <div className="p-6 md:p-10 space-y-6 text-sm md:text-base text-gray-700 leading-relaxed overflow-y-auto max-h-[70vh]">
          <section>
            <h3 className="font-black text-gray-900 uppercase mb-2">1. Aceptación de los Términos</h3>
            <p>Al registrarse como socio, el usuario acepta cumplir con el estatuto interno del {CLIENT_CONFIG.name} y las normas de convivencia establecidas.</p>
          </section>
          
          <section>
            <h3 className="font-black text-gray-900 uppercase mb-2">2. Pago de Cuotas</h3>
            <p>El socio se compromete al pago mensual de la cuota social. La mora prolongada facultará a la administración a revisar la continuidad en las actividades.</p>
          </section>
          
          <section>
            <h3 className="font-black text-gray-900 uppercase mb-2">3. Uso de Imagen</h3>
            <p>Se autoriza al club a utilizar imágenes capturadas en eventos deportivos exclusivamente para fines institucionales y promocionales.</p>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-100 italic text-gray-400 text-xs">
            Última actualización: Febrero 2026. {CLIENT_CONFIG.name}.
          </div>
        </div>
      </div>
    </div>
  );
}