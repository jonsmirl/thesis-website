<template>
  <div class="container">
    <NavHeader />

    <div class="page-header">
      <h2>Theorem Explorer</h2>
      <p class="subtitle">Lean 4 formalization organized by economic concept</p>
    </div>

    <div class="stats-banner">
      <div class="stat-box current" style="background: #fef9c3; border-color: #fde047;">
        <span class="stat-num">{{ sections?.length || 0 }}</span>
        <span class="stat-label">Overview</span>
      </div>
      <NuxtLink to="/theorems/all" class="stat-box" style="background: #eff6ff; border-color: #bfdbfe;">
        <span class="stat-num">{{ totalDecls }}</span>
        <span class="stat-label">Declarations</span>
      </NuxtLink>
      <NuxtLink to="/theorems/all?status=proved" class="stat-box" style="background: #ecfdf5; border-color: #bbf7d0;">
        <span class="stat-num">{{ totalMarquee }}</span>
        <span class="stat-label">Key Theorems</span>
      </NuxtLink>
      <NuxtLink to="/theorems/all?status=axiom" class="stat-box" style="background: #f5f3ff; border-color: #ddd6fe;">
        <span class="stat-num">3</span>
        <span class="stat-label">Axioms</span>
      </NuxtLink>
      <NuxtLink to="/theorems/all?status=trivial" class="stat-box" style="background: #ecfeff; border-color: #a5f3fc;">
        <span class="stat-num">129</span>
        <span class="stat-label">Schematics</span>
      </NuxtLink>
    </div>

    <div class="section-grid">
      <SectionCard
        v-for="s in sections"
        :key="s.number"
        :section="s"
      />
    </div>

    <div class="all-link">
      <NuxtLink to="/theorems/all">View all {{ totalDecls }} declarations as flat list</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const client = useSupabaseClient()

const { data: sections } = await useAsyncData('derivation-sections', async () => {
  const { data, error } = await client
    .from('derivation_sections')
    .select('*')
    .order('number')
  if (error) throw error
  return data || []
})

const totalDecls = computed(() =>
  sections.value?.reduce((sum, s) => sum + (s.theorem_count || 0), 0) || 0
)

const totalMarquee = computed(() =>
  sections.value?.reduce((sum, s) => sum + (s.marquee_count || 0), 0) || 0
)
</script>

<style scoped>
.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.page-header { margin-bottom: 1.5rem; }
.page-header h2 { margin: 0 0 0.25rem; }
.subtitle { color: #666; margin: 0; font-size: 0.9rem; }
.stats-banner {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  margin-bottom: 2rem;
}
.stat-box {
  border: 1px solid;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  text-align: center;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.15s, transform 0.1s;
  cursor: pointer;
}
.stat-box:hover:not(.current) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}
.stat-box.current {
  cursor: default;
  font-weight: 600;
  box-shadow: inset 0 0 0 2px #eab308;
}
.stat-num {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111;
}
.stat-label {
  font-size: 0.8rem;
  color: #555;
}
.section-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
.all-link {
  text-align: center;
  margin-top: 2rem;
  font-size: 0.9rem;
}
.all-link a {
  color: #0066cc;
  text-decoration: none;
}
.all-link a:hover { text-decoration: underline; }

@media (max-width: 640px) {
  .stats-banner { grid-template-columns: repeat(3, 1fr); }
  .section-grid { grid-template-columns: 1fr; }
}
</style>
