import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const FROM = 'Butterflies <administracion@butterfliesenglishclasses.com.ar>';
const INSTITUTE_NAME = 'Butterflies';
const TO = 'fm.ms.analytics@gmail.com';

// Tablas a respaldar
const TABLES = ['users', 'payments', 'user_categories', 'grades', 'attendance', 'practices', 'feedbacks'];

// Convierte un array de objetos a CSV (maneja comas, comillas, saltos de línea y jsonb)
function toCSV(rows: any[]): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: any): string => {
    if (val === null || val === undefined) return '';
    let s = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

export async function POST(request: Request) {
  // Protección: solo el cron de Supabase puede llamar este endpoint
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const attachments: { filename: string; content: Buffer }[] = [];
    const resumen: Record<string, number> = {};

    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select('*').limit(100000);
      if (error) throw error;
      const rows = data || [];
      resumen[table] = rows.length;
      attachments.push({
        filename: `${table}_${fecha}.csv`,
        content: Buffer.from(toCSV(rows), 'utf8'),
      });
    }

    const filas = Object.entries(resumen).map(([t, n]) => `${t}: ${n} filas`).join(' · ');

    const { error: sendError } = await resend.emails.send({
      from: FROM,
      to: TO,
      subject: `${INSTITUTE_NAME} — Backup ${fecha}`,
      html: `<p>Backup automático de <strong>${INSTITUTE_NAME}</strong> del ${fecha}.</p><p>${filas}</p><p>Se adjuntan los CSV de las tablas.</p>`,
      attachments,
    });

    if (sendError) throw sendError;
    return NextResponse.json({ ok: true, fecha, resumen });
  } catch (error: any) {
    console.error('[backup]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
