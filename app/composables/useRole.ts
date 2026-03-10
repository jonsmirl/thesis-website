/**
 * Composable for role-based access control.
 * Reads user_role from JWT claims (injected by custom_access_token_hook).
 */

type Role = 'superuser' | 'editor' | 'normal'

const ROLE_HIERARCHY: Record<Role, number> = {
  superuser: 3,
  editor: 2,
  normal: 1,
}

export function useRole() {
  const { getSession, getUser, getClient } = useAuth()

  const role = ref<Role | null>(null)
  const loading = ref(true)

  /**
   * Extract role from JWT claims
   */
  const checkRole = async () => {
    loading.value = true
    try {
      const session = await getSession()
      if (session?.access_token) {
        try {
          const parts = session.access_token.split('.')
          if (!parts[1]) throw new Error('Invalid JWT')
          const payload = JSON.parse(atob(parts[1]))
          if (payload.user_role && payload.user_role in ROLE_HIERARCHY) {
            role.value = payload.user_role as Role
            return
          }
        } catch (e) {
          console.error('[useRole] Failed to decode JWT:', e)
        }
      }

      // Fallback: query DB if JWT claim missing
      const user = await getUser()
      if (user?.id) {
        const client = await getClient()
        const { data } = await client
          .from('community_profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()
        role.value = (data?.role as Role) || 'normal'
      } else {
        role.value = null
      }
    } catch (e) {
      console.error('[useRole] Error checking role:', e)
      role.value = null
    } finally {
      loading.value = false
    }
  }

  const isSuperuser = computed(() => role.value === 'superuser')
  const isEditor = computed(() => role.value === 'editor' || role.value === 'superuser')

  const isAtLeast = (minRole: Role): boolean => {
    if (!role.value) return false
    return ROLE_HIERARCHY[role.value] >= ROLE_HIERARCHY[minRole]
  }

  // Check role on mount (client-side only)
  if (import.meta.client) {
    onMounted(() => checkRole())
  }

  return {
    role: readonly(role),
    loading: readonly(loading),
    isSuperuser,
    isEditor,
    isAtLeast,
    checkRole,
  }
}
