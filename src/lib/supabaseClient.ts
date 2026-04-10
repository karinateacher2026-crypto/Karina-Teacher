import { createClient } from '@supabase/supabase-js'

// El signo ! va afuera de las comillas porque le avisa a TS que la variable existe
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)