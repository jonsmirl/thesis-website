export default defineNuxtRouteMiddleware(async (to, _from) => {
  const isServer = import.meta.server
  const isClient = import.meta.client

  // On client-side, check localStorage auth first (OAuth sessions)
  if (isClient) {
    const authClient = useAuthClient()
    const { data: { session } } = await authClient.auth.getSession()
    if (session?.user) return // Allow navigation
  }

  // Fallback to cookie-based auth (email/password)
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  if (user.value) return // Allow navigation

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) return // Allow navigation

  // On server-side, defer to client (can't check localStorage from server)
  if (isServer) return

  return navigateTo('/login')
})
