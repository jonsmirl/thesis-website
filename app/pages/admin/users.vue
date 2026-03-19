<template>
  <div class="forum-page">
    <main class="forum-container">
      <h1>User Management</h1>

      <div v-if="!isSuperuser" class="access-denied">
        Superuser access required.
      </div>

      <template v-else>
        <div class="search-bar">
          <input
            v-model="search"
            type="text"
            placeholder="Search by handle or email..."
            class="search-input"
          />
        </div>

        <div v-if="loading" class="loading">Loading users...</div>

        <div v-else class="user-list">
          <div v-for="u in filteredUsers" :key="u.user_id" class="user-item">
            <div class="user-info">
              <span class="user-handle">{{ u.handle || 'no handle' }}</span>
              <span class="user-email">{{ u.email || '' }}</span>
              <span v-if="u.display_name" class="user-display">{{ u.display_name }}</span>
              <span v-if="u.institution" class="user-institution">{{ u.institution }}</span>
            </div>
            <div class="user-actions">
              <select
                :value="u.role"
                @change="changeRole(u.user_id, ($event.target as HTMLSelectElement).value)"
                class="role-select"
              >
                <option value="normal">normal</option>
                <option value="editor">editor</option>
                <option value="superuser">superuser</option>
              </select>
            </div>
          </div>
          <div v-if="!filteredUsers.length" class="empty">No users found.</div>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="successMsg" class="success">{{ successMsg }}</p>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
const { isSuperuser } = useRole()
const { getClient } = useAuth()

const users = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const error = ref('')
const successMsg = ref('')

const filteredUsers = computed(() => {
  if (!search.value) return users.value
  const q = search.value.toLowerCase()
  return users.value.filter(u =>
    (u.handle || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q) ||
    (u.display_name || '').toLowerCase().includes(q)
  )
})

async function loadUsers() {
  loading.value = true
  try {
    const client = await getClient()
    const { data, error: err } = await client
      .from('community_profiles')
      .select('user_id, handle, display_name, institution, role, created_at')
      .order('created_at', { ascending: false })

    if (err) throw err

    // Try to get emails from auth.users via a join or separate query
    // community_profiles doesn't have email, so we show handle + display_name
    users.value = data || []
  } catch (e: any) {
    error.value = e.message || 'Failed to load users.'
  } finally {
    loading.value = false
  }
}

async function changeRole(userId: string, newRole: string) {
  error.value = ''
  successMsg.value = ''
  try {
    const client = await getClient()
    const { error: err } = await client.rpc('set_user_role', {
      target_user_id: userId,
      new_role: newRole,
    })
    if (err) throw err

    // Update local state
    const user = users.value.find(u => u.user_id === userId)
    if (user) user.role = newRole
    successMsg.value = `Role updated to ${newRole}.`
    setTimeout(() => { successMsg.value = '' }, 3000)
  } catch (e: any) {
    error.value = e.message || 'Failed to update role.'
  }
}

onMounted(async () => {
  if (isSuperuser.value) {
    await loadUsers()
  } else {
    // Wait for role check to finish, then load
    const interval = setInterval(async () => {
      if (isSuperuser.value) {
        clearInterval(interval)
        await loadUsers()
      }
    }, 200)
    // Timeout after 3s
    setTimeout(() => {
      clearInterval(interval)
      loading.value = false
    }, 3000)
  }
})

useHead({ title: 'User Management — CES Formalization' })
</script>

<style scoped>
.forum-page {
  min-height: 100vh;
  background: var(--color-bg-page);
  font-family: var(--font-sans);
}
.forum-container {
  max-width: var(--container-width);
  margin: 0 auto;
  padding: 1.5rem var(--container-padding);
}
h1 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 1rem;
}
.access-denied {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  padding: 2rem 0;
}
.search-bar {
  margin-bottom: 1rem;
}
.search-input {
  width: 100%;
  max-width: 400px;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border-input);
  border-radius: 4px;
  font-size: 0.9rem;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  box-sizing: border-box;
}
.loading, .empty {
  color: var(--color-text-faint);
  font-size: 0.9rem;
  padding: 1rem 0;
}
.user-list {
  display: flex;
  flex-direction: column;
}
.user-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border-faint);
}
.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.user-handle {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--color-text-primary);
}
.user-email {
  font-size: 0.78rem;
  color: var(--color-text-faint);
}
.user-display {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}
.user-institution {
  font-size: 0.72rem;
  color: var(--color-text-faint);
  font-style: italic;
}
.role-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border-input);
  border-radius: 4px;
  font-size: 0.78rem;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  cursor: pointer;
}
.error {
  color: var(--color-error);
  margin: 0.75rem 0 0;
  font-size: 0.85rem;
}
.success {
  color: var(--color-consistent-fg);
  margin: 0.75rem 0 0;
  font-size: 0.85rem;
}
</style>
