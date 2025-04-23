import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xwxtsyhlobiyomqlxwti.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3eHRzeWhsb2JpeW9tcWx4d3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMzUwNjYsImV4cCI6MjA2MDcxMTA2Nn0.YvFEudMLR1JVeqkMT7QdZVGW_UsTn4fhZHOWotVsscY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });