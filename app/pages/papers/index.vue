<template>
  <div class="container">
    <header>
      <h1><NuxtLink to="/">CES Formalization</NuxtLink></h1>
      <div class="user-bar">
        <span>{{ user?.email }}</span>
        <button @click="handleLogout">Sign out</button>
      </div>
    </header>

    <div class="page-header">
      <h2>Papers</h2>
      <p class="subtitle">{{ papers.length }} papers</p>
    </div>

    <div class="paper-list">
      <div v-for="p in papers" :key="p.id" class="paper-card">
        <div class="paper-number">{{ p.number }}</div>
        <div class="paper-content">
          <h3>{{ p.title }}</h3>
          <div v-if="p.target_journal" class="journal">Target: {{ p.target_journal }}</div>
          <p v-if="p.abstract" class="abstract">{{ truncate(p.abstract, 300) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const client = useSupabaseClient()

const { data: papers } = await useAsyncData('papers', async () => {
  const { data, error } = await client
    .from('papers')
    .select('*')
    .order('number')
  if (error) throw error
  return data || []
})

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '...' : s
}

async function handleLogout() {
  await client.auth.signOut()
  navigateTo('/login')
}
</script>

<style scoped>
.container { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; }
header h1 { margin: 0; font-size: 1.4rem; }
header h1 a { color: inherit; text-decoration: none; }
.user-bar { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; color: #666; }
.user-bar button { padding: 0.3rem 0.6rem; background: none; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.page-header { margin-bottom: 1.5rem; }
.page-header h2 { margin: 0 0 0.25rem; }
.subtitle { color: #666; margin: 0; font-size: 0.9rem; }
.paper-list { display: flex; flex-direction: column; gap: 0.75rem; }
.paper-card { display: flex; gap: 1rem; border: 1px solid #eee; border-radius: 8px; padding: 1rem 1.25rem; }
.paper-number { font-size: 1.5rem; font-weight: 700; color: #0550ae; min-width: 2.5rem; text-align: center; padding-top: 0.2rem; }
.paper-content { flex: 1; }
.paper-content h3 { margin: 0 0 0.3rem; font-size: 1rem; }
.journal { font-size: 0.8rem; color: #666; font-style: italic; margin-bottom: 0.4rem; }
.abstract { margin: 0; font-size: 0.85rem; color: #444; line-height: 1.5; }
</style>
