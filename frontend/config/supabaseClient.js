import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xwxtsyhlobiyomqlxwti.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6...sscY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
