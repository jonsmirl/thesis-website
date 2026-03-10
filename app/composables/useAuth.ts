/**
 * Unified auth composable that works with both:
 * - Cookie-based auth (email/password via @nuxtjs/supabase)
 * - localStorage-based auth (OAuth via useAuthClient)
 */
export function useAuth() {
  const cookieUser = useSupabaseUser()
  const cookieClient = useSupabaseClient()

  const getLocalStorageClient = () => {
    if (import.meta.client) {
      return useAuthClient()
    }
    return null
  }

  /**
   * Get the current user from either auth source
   */
  const getUser = async () => {
    // First check cookie-based auth
    if (cookieUser.value) {
      return cookieUser.value
    }

    // Then check localStorage auth (OAuth)
    if (import.meta.client) {
      const authClient = getLocalStorageClient()
      if (authClient) {
        const { data: { session } } = await authClient.auth.getSession()
        if (session?.user) {
          return session.user
        }
      }
    }

    return null
  }

  /**
   * Get the Supabase client that has the active auth session.
   * Returns localStorage client for OAuth users, cookie client for email users.
   */
  const getClient = async () => {
    if (import.meta.server) {
      return cookieClient
    }

    // Check if we have a localStorage session (OAuth)
    const authClient = getLocalStorageClient()
    if (authClient) {
      const { data: { session } } = await authClient.auth.getSession()
      if (session?.user) {
        return authClient
      }
    }

    return cookieClient
  }

  /**
   * Get the current session (for access token extraction)
   */
  const getSession = async () => {
    if (import.meta.client) {
      const authClient = getLocalStorageClient()
      if (authClient) {
        const { data: { session } } = await authClient.auth.getSession()
        if (session) return session
      }
    }

    const { data: { session } } = await cookieClient.auth.getSession()
    return session
  }

  /**
   * Sign in with OAuth provider (Google, GitHub)
   */
  const signInWithOAuth = async (provider: 'google' | 'github') => {
    if (!import.meta.client) return

    const authClient = getLocalStorageClient()
    if (!authClient) throw new Error('Auth client not available')

    const redirectUrl = `${window.location.origin}/confirm`
    const { error } = await authClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUrl },
    })

    if (error) throw error
  }

  /**
   * Sign in with email/password (uses cookie-based module client)
   */
  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await cookieClient.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  /**
   * Sign up with email/password
   */
  const signUp = async (email: string, password: string) => {
    const { data, error } = await cookieClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: import.meta.client ? `${window.location.origin}/confirm` : undefined,
      },
    })
    if (error) throw error
    return data
  }

  /**
   * Sign out from both auth sources
   */
  const signOut = async () => {
    try {
      await cookieClient.auth.signOut()
    } catch (e) {
      console.error('[useAuth] Error signing out from cookie client:', e)
    }

    if (import.meta.client) {
      const authClient = getLocalStorageClient()
      if (authClient) {
        try {
          await authClient.auth.signOut()
        } catch (e) {
          console.error('[useAuth] Error signing out from localStorage client:', e)
        }
      }

      try {
        localStorage.removeItem('sb-cesproofs-auth')
      } catch (e) {
        console.error('[useAuth] Error clearing localStorage:', e)
      }
    }
  }

  /**
   * Reactive user ref that merges cookie and localStorage auth.
   * Use this as a drop-in replacement for useSupabaseUser().
   */
  const oauthUser = ref<any>(null)
  const user = computed(() => cookieUser.value || oauthUser.value)

  // On client, check localStorage auth and set up listener
  if (import.meta.client) {
    const initOAuthUser = async () => {
      const authClient = getLocalStorageClient()
      if (authClient) {
        const { data: { session } } = await authClient.auth.getSession()
        oauthUser.value = session?.user || null

        authClient.auth.onAuthStateChange((_event, session) => {
          oauthUser.value = session?.user || null
        })
      }
    }
    // Run immediately if we're already mounted, otherwise on next tick
    initOAuthUser()
  }

  /**
   * Check if user is authenticated (either source)
   */
  const isAuthenticated = async () => {
    const u = await getUser()
    return !!u
  }

  /**
   * Get auth headers for Edge Function calls
   */
  const getAuthHeaders = async () => {
    const config = useRuntimeConfig()
    const session = await getSession()
    if (!session) throw new Error('Not authenticated')
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': config.public.supabase.key,
    }
  }

  return {
    user,
    getUser,
    getClient,
    getSession,
    signInWithOAuth,
    signInWithEmail,
    signUp,
    signOut,
    isAuthenticated,
    getAuthHeaders,
    cookieUser,
    cookieClient,
  }
}
