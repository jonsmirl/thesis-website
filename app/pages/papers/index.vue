<template>
  <div class="container">
    <NavHeader />

    <div class="page-header">
      <h2>Papers</h2>
      <p class="subtitle">{{ papers.length }} papers</p>
    </div>

    <div class="paper-list">
      <div v-for="p in papers" :key="p.id" class="paper-card">
        <div class="paper-number">{{ p.paper_number || p.number }}</div>
        <div class="paper-content">
          <NuxtLink :to="`/papers/${p.slug}`" class="paper-title">{{ p.title }}</NuxtLink>
          <div class="paper-meta-row">
            <span v-if="p.authors?.length" class="authors">{{ p.authors.join(', ') }}</span>
            <span v-if="p.date" class="date">{{ formatDate(p.date) }}</span>
            <span v-if="p.status && p.status !== 'draft'" class="badge" :class="`badge--${p.status}`">{{ p.status }}</span>
            <span v-if="p.target_journal" class="journal">{{ p.target_journal }}</span>
          </div>
          <p v-if="p.abstract" class="abstract">{{ truncate(p.abstract, 300) }}</p>
          <div v-if="p.body_md" class="native-indicator">Native article</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const client = useSupabaseClient()

const { data: papers } = await useAsyncData('papers', async () => {
  const { data, error } = await client
    .from('papers')
    .select('*')
    .order('paper_number', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data || []
})

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '...' : s
}

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}
</script>

<style scoped>
.paper-list { display: flex; flex-direction: column; gap: 0.75rem; }
.paper-card { display: flex; gap: 1rem; border: 1px solid var(--color-border-light); border-radius: var(--radius-lg); padding: 1rem 1.25rem; }
.paper-number { font-size: 1.5rem; font-weight: 700; color: var(--color-link-alt); min-width: 2.5rem; text-align: center; padding-top: 0.2rem; }
.paper-content { flex: 1; }
.paper-title { display: block; margin: 0 0 0.3rem; font-size: 1rem; font-weight: 600; color: var(--color-text-primary); text-decoration: none; }
.paper-title:hover { color: var(--color-link); }
.paper-meta-row {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 0.4rem;
  font-size: 0.8rem;
}
.authors { color: var(--color-text-secondary); }
.date { color: var(--color-text-muted); }
.journal { color: var(--color-text-muted); font-style: italic; }
.badge--published { background: rgba(16, 185, 129, 0.1); color: #10b981; font-size: 0.75rem; padding: 0.1rem 0.4rem; border-radius: var(--radius-full); }
.abstract { margin: 0; font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.5; }
.native-indicator {
  display: inline-block;
  margin-top: 0.4rem;
  font-size: 0.7rem;
  color: var(--color-link);
  background: rgba(59, 130, 246, 0.08);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
}
</style>
