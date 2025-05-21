// Supabase Edge Function to check username availability
// This function has full database access and can check if a username exists
// To deploy: npx supabase functions deploy check-username

// Import required Supabase modules
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.4.0'

// Get Supabase secrets
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Create Supabase client with service role key (has full access)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Function to check if a username already exists
// This runs on the server with full DB privileges
export async function checkUsernameExists(username) {
  // Normalize username - lowercase and trim
  const normalizedUsername = username.toLowerCase().trim()
  
  try {
    console.log(`Checking if username '${normalizedUsername}' exists...`)
    
    // Query the database for the exact username
    const { data, error } = await supabase
      .from('users')
      .select('id, username')
      .ilike('username', normalizedUsername)
      .limit(1)
    
    if (error) {
      console.error('Database query error:', error)
      throw error
    }
    
    console.log(`Query result for '${normalizedUsername}':`, data)
    
    // Username exists if we found any matches
    const exists = Array.isArray(data) && data.length > 0
    return exists
  } catch (error) {
    console.error(`Error checking username '${normalizedUsername}':`, error)
    throw error
  }
}

// Main handler
Deno.serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }
  
  try {
    // Parse URL to get query parameters
    const url = new URL(req.url)
    const username = url.searchParams.get('username')
    
    // Validate username parameter
    if (!username) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing username parameter' 
        }),
        { status: 400, headers }
      )
    }
    
    // Check if username exists
    const exists = await checkUsernameExists(username)
    
    // Return availability status
    return new Response(
      JSON.stringify({ 
        username,
        available: !exists,
        exists: exists,
      }),
      { status: 200, headers }
    )
  } catch (error) {
    // Handle errors
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error checking username availability',
        details: error.message
      }),
      { status: 500, headers }
    )
  }
}) 