-- =========================================================
-- GRUPO FAMILIAR — estado de cuenta compartido
-- Fecha: 2026-07-19
--
-- Regla de negocio: si un socio tiene family_id, su estado de cuenta es el
-- del grupo. Las cuotas y las bonificaciones se siguen generando de forma
-- INDIVIDUAL (una fila por persona). Lo único que cambia es qué filas puede
-- leer cada socio y cómo se suma el saldo.
--
-- No se agregan tablas ni columnas: family_id ya existe en public.users.
-- =========================================================


-- ---------------------------------------------------------
-- 1. HELPER — ids del grupo familiar del usuario logueado
--
--    SECURITY DEFINER porque tiene que poder leer las filas de los otros
--    integrantes, que las policies de users no le dejarían ver.
--    El union con auth.uid() cubre al socio sin vínculo: sin él, alguien con
--    family_id null dejaría de ver hasta sus propios pagos.
-- ---------------------------------------------------------
create or replace function public.family_member_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.family_id is not null
    and u.family_id = (select family_id from public.users where id = auth.uid())
  union
  select auth.uid();
$$;

revoke all on function public.family_member_ids() from public;
grant execute on function public.family_member_ids() to authenticated;


-- ---------------------------------------------------------
-- 2. PAYMENTS — el socio ve los movimientos de todo su grupo
--
--    Solo SELECT. La policy de INSERT no se toca: ver los pagos de un
--    familiar sí, cargar un comprobante a su nombre no.
-- ---------------------------------------------------------
drop policy if exists "Socios_Ver_Sus_Pagos" on public.payments;

create policy "Socios_Ver_Sus_Pagos" on public.payments
  as permissive for select to authenticated
  using (user_id in (select public.family_member_ids()));


-- ---------------------------------------------------------
-- 3. USERS — el socio puede leer las filas de su grupo
--
--    Sin esto el frontend no puede resolver ni los nombres ni los saldos de
--    los familiares: users_select_own solo deja leer la fila propia.
--    Se agrega una policy nueva en vez de modificar las existentes; en
--    Postgres las policies PERMISSIVE se combinan con OR.
-- ---------------------------------------------------------
drop policy if exists users_select_family on public.users;

create policy users_select_family on public.users
  as permissive for select to authenticated
  using (id in (select public.family_member_ids()));


-- ---------------------------------------------------------
-- 4. STORAGE — comprobantes del grupo
--
--    Reemplaza la receipts_own_select provisoria que se creó al cerrar el
--    acceso público: ahora el socio puede abrir también el comprobante que
--    subió un familiar, porque el estado de cuenta se lo muestra.
--    La ruta es '<user_id>/<archivo>', de ahí el foldername[1].
-- ---------------------------------------------------------
drop policy if exists "receipts_own_select" on storage.objects;
drop policy if exists "receipts_family_select" on storage.objects;

--    La comparación se hace como TEXTO a propósito. Con
--    ((storage.foldername(name))[1])::uuid, un archivo guardado en una carpeta
--    cuyo nombre no sea un uuid válido haría fallar el cast y romper la
--    consulta entera para todos, no solo para ese archivo.
create policy "receipts_family_select" on storage.objects
  as permissive for select to authenticated
  using (
    bucket_id = 'receipts'
    and exists (
      select 1
      from public.family_member_ids() f
      where f::text = (storage.foldername(name))[1]
    )
  );


-- ---------------------------------------------------------
-- 5. VERIFICACIÓN
-- ---------------------------------------------------------
select policyname, cmd, array_to_string(roles, ',') as roles
from pg_policies
where (schemaname = 'public' and tablename in ('payments', 'users'))
   or (schemaname = 'storage' and tablename = 'objects')
order by tablename, policyname;
