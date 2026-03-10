import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let authClient: SupabaseClient | null = null

/**
 * Creates a Supabase client specifically for OAuth that uses localStorage.
 * The @nuxtjs/supabase module uses cookies which breaks OAuth implicit flow
 * on Cloudflare Pages. This client uses localStorage to store the session.
 */
export function useAuthClient(): SupabaseClient {
  if (authClient) {
    return authClient
  }

  const config = useRuntimeConfig()
  const url = config.public.supabase.url
  const key = config.public.supabase.key

  if (import.meta.client) {
    authClient = createClient(url, key, {
      auth: {
        flowType: 'implicit',
        storage: localStorage,
        storageKey: 'sb-cesproofs-auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  } else {
    // Server-side fallback (no auth capabilities)
    authClient = createClient(url, key, {
      auth: {
        flowType: 'implicit',
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  }

  return authClient
}
