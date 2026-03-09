<template>
  <div class="container">
    <NavHeader />

    <div v-if="paper">
      <div class="breadcrumb">
        <NuxtLink to="/papers">Papers</NuxtLink> / Paper {{ paper.number }}
      </div>

      <div class="detail-header">
        <h2>{{ paper.title }}</h2>
        <div class="meta">
          <span class="badge badge--paper">Paper {{ paper.number }}</span>
          <span v-if="paper.target_journal" class="badge badge--journal">{{ paper.target_journal }}</span>
        </div>
      </div>

      <div v-if="paper.abstract" class="section">
        <h3>Abstract</h3>
        <p class="abstract-text">{{ paper.abstract }}</p>
      </div>

      <div class="section">
        <h3>Full Paper</h3>
        <iframe
          :src="`/papers/paper-${paper.number.toLowerCase()}.html`"
          class="paper-frame"
          frameborder="0"
        />
      </div>
    </div>
    <div v-else>
      <p>Paper not found.</p>
      <NuxtLink to="/papers">Back to papers</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const client = useSupabaseClient()

const { data: paper } = await useAsyncData(`paper-${route.params.slug}`, async () => {
  const { data, error } = await client
    .from('papers')
    .select('*')
    .eq('slug', route.params.slug)
    .single()
  if (error) return null
  return data
})
</script>

<style scoped>
.detail-header { margin-bottom: 1.5rem; }
.detail-header h2 { margin: 0 0 0.5rem; }
.meta { display: flex; gap: 0.25rem; }
.badge--journal { background: var(--color-bg-hover); color: var(--color-text-tertiary); font-style: italic; }
.section { margin-bottom: 1.5rem; }
.section h3 { font-size: 0.9rem; color: var(--color-text-muted); margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
.abstract-text { margin: 0; line-height: 1.6; font-size: 0.95rem; font-family: var(--font-serif); }
.paper-frame { width: 100%; height: 80vh; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); }
</style>
