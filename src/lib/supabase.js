import { createClient } from '@supabase/supabase-js'

// Usamos import.meta.env para leer las variables del archivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)