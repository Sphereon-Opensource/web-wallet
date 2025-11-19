import {createClient} from '@refinedev/supabase'
import {getEnv} from '@/src/services/env'
import {SupabaseClient} from '@supabase/supabase-js'

const getSupabaseUrl = (): string => getEnv('BROWSER_PUBLIC_SUPABASE_URL') ?? 'http://localhost:8000'

// Service key
const getSupabaseServiceKey = ():string =>
  getEnv('BROWSER_PUBLIC_SUPABASE_SERVICE_KEY') ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

let _supabaseServiceClient:SupabaseClient<any, "public" extends keyof any ? "public" : (string & keyof any), any>
let _supabaseStorageServiceClient: SupabaseClient<any, string, any>

export const supabaseServiceClient = () => {
  if (!_supabaseServiceClient) {
    _supabaseServiceClient = createClient(getSupabaseUrl(), getSupabaseServiceKey(), {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: true,
      },
      global: {
        headers: {
          Prefer: 'return=representation',
        },
      },
    })
  }
  return _supabaseServiceClient
}

export const supabaseStorageServiceClient = () => {
  if (!_supabaseStorageServiceClient) {
    _supabaseStorageServiceClient = createClient(getSupabaseUrl(), getSupabaseServiceKey(), {
      db: {
        schema: 'storage',
      },
      auth: {
        persistSession: true,
      },
    })
  }
  return _supabaseStorageServiceClient
}