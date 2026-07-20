import { supabase } from '@/lib/supabaseClient'

// Resolución del grupo familiar.
//

// Regla de negocio: si un socio tiene family_id, su estado de cuenta es el del
// grupo. Las cuotas y bonificaciones se siguen generando de forma INDIVIDUAL
// (una por persona); lo único que se unifica es la vista y la suma del saldo.

export type FamilyMember = {
  id: string
  name: string | null
  account_balance: number
}

export type FamilyGroup = {
  /** true solo si el grupo tiene 2 o más integrantes */
  isFamily: boolean
  /** ids a usar en el .in('user_id', ...) de payments */
  memberIds: string[]
  members: FamilyMember[]
  /** saldo del grupo = suma de los saldos individuales */
  balance: number
  /** saldo propio, sin el grupo. Necesario para reparar drift sin pisar datos */
  ownBalance: number
}

/**
 * Devuelve el grupo familiar de un socio. Si no tiene vínculo, devuelve un
 * grupo de uno solo, de modo que el llamador no necesita ramificar.
 */
export async function getFamilyGroup(userId: string): Promise<FamilyGroup> {
  const solo = (m: FamilyMember): FamilyGroup => ({
    isFamily: false,
    memberIds: [m.id],
    members: [m],
    balance: m.account_balance,
    ownBalance: m.account_balance,
  })

  const { data: me } = await supabase
    .from('users')
    .select('id, name, account_balance, family_id')
    .eq('id', userId)
    .maybeSingle()

  if (!me) {
    return solo({ id: userId, name: null, account_balance: 0 })
  }

  const self: FamilyMember = {
    id: me.id,
    name: me.name,
    account_balance: me.account_balance ?? 0,
  }

  if (!me.family_id) return solo(self)

  const { data: siblings } = await supabase
    .from('users')
    .select('id, name, account_balance')
    .eq('family_id', me.family_id)

  // Si la policy de RLS no deja leer al resto, siblings viene solo con uno (o
  // vacío). En ese caso degradamos a individual en vez de mostrar un saldo
  // incompleto, que sería peor que no mostrar el grupo.
  if (!siblings || siblings.length < 2) return solo(self)

  const members: FamilyMember[] = siblings.map(s => ({
    id: s.id,
    name: s.name,
    account_balance: s.account_balance ?? 0,
  }))

  return {
    isFamily: true,
    memberIds: members.map(m => m.id),
    members,
    balance: members.reduce((acc, m) => acc + m.account_balance, 0),
    ownBalance: self.account_balance,
  }
}

/**
 * Nombre de pila, para distinguir integrantes de un grupo.
 * Los socios se cargan como "Apellido, Nombre", y los hermanos comparten
 * apellido: mostrar la primera palabra los haría ver idénticos.
 *   "Gomez, Marcela Ana" -> "Marcela"
 *   "Marcela Gomez"      -> "Marcela"   (sin coma, cae al primer token)
 */
export function firstName(fullName: string | null | undefined): string {
  const n = (fullName || '').trim()
  if (!n) return ''
  const afterComma = n.includes(',') ? n.slice(n.indexOf(',') + 1).trim() : n
  return (afterComma || n).trim().split(/\s+/)[0] || n
}

type WithFamily = { id: string; family_id?: string | null; account_balance?: number | null }

/**
 * Variante sincrónica para el panel de admin, que ya tiene la lista completa de
 * socios cargada en memoria. Evita ir a la base por cada fila.
 */
export function familyMembersOf<T extends WithFamily>(all: T[], player: T): T[] {
  if (!player.family_id) return [player]
  const group = all.filter(p => p.family_id && p.family_id === player.family_id)
  return group.length > 1 ? group : [player]
}

/** Saldo del grupo de un socio, calculado sobre la lista ya cargada. */
export function familyBalanceOf<T extends WithFamily>(all: T[], player: T): number {
  return familyMembersOf(all, player).reduce((acc, p) => acc + (p.account_balance ?? 0), 0)
}

/** true si el socio comparte vínculo con al menos otra persona. */
export function hasFamily<T extends WithFamily>(all: T[], player: T): boolean {
  return familyMembersOf(all, player).length > 1
}
