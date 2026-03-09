<template>
  <div class="container">
    <NavHeader />

    <div class="page-header page-header--flex">
      <div>
        <h2>Theorem Explorer</h2>
        <p class="subtitle">Lean 4 formalization organized by economic concept</p>
      </div>
      <NuxtLink to="/theorems/download" class="download-btn">
        &#8615; Download the Proofs
      </NuxtLink>
    </div>

    <!-- Skeleton loading -->
    <template v-if="!sections">
      <div class="stats-banner">
        <div v-for="i in 5" :key="i" class="stat-box-skeleton skeleton" />
      </div>
      <div class="section-grid">
        <div v-for="i in 8" :key="i" class="section-skeleton skeleton" />
      </div>
    </template>

    <template v-else>
      <div class="stats-banner">
        <div class="stat-box stat-box--current">
          <span class="stat-num">{{ sections?.length || 0 }}</span>
          <span class="stat-label">Overview</span>
        </div>
        <NuxtLink to="/theorems/all" class="stat-box stat-box--decls">
          <span class="stat-num">{{ totalDecls }}</span>
          <span class="stat-label">Declarations</span>
        </NuxtLink>
        <NuxtLink to="/theorems/all?marquee=true" class="stat-box stat-box--marquee">
          <span class="stat-num">{{ totalMarquee }}</span>
          <span class="stat-label">Key Theorems</span>
        </NuxtLink>
        <NuxtLink to="/theorems/all?status=axiom" class="stat-box stat-box--axiom">
          <span class="stat-num">{{ totalAxioms }}</span>
          <span class="stat-label">Axioms</span>
        </NuxtLink>
        <NuxtLink to="/theorems/all?status=trivial" class="stat-box stat-box--trivial">
          <span class="stat-num">{{ totalSchematics }}</span>
          <span class="stat-label">Schematics</span>
        </NuxtLink>
      </div>

      <div class="section-grid">
        <SectionCard
          v-for="s in enrichedSections"
          :key="s.number"
          :section="s"
        />
      </div>

      <div class="all-link">
        <NuxtLink to="/theorems/all">View all {{ totalDecls }} declarations as flat list</NuxtLink>
      </div>
    </template>
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

const { data: dynamicCounts } = await useAsyncData('theorem-counts', async () => {
  const [declRes, marqueeRes, axiomRes, schematicRes] = await Promise.all([
    client.from('theorems').select('id', { count: 'exact', head: true }),
    client.from('theorems').select('id', { count: 'exact', head: true }).eq('is_marquee', true),
    client.from('theorems').select('id', { count: 'exact', head: true }).eq('status', 'axiom'),
    client.from('theorems').select('id', { count: 'exact', head: true }).eq('status', 'trivial'),
  ])
  return {
    decls: declRes.count || 0,
    marquee: marqueeRes.count || 0,
    axioms: axiomRes.count || 0,
    schematics: schematicRes.count || 0,
  }
})

const totalDecls = computed(() => dynamicCounts.value?.decls || 0)
const totalMarquee = computed(() => dynamicCounts.value?.marquee || 0)
const totalAxioms = computed(() => dynamicCounts.value?.axioms || 0)
const totalSchematics = computed(() => dynamicCounts.value?.schematics || 0)

const { data: statusCounts } = await useAsyncData('section-status-counts', async () => {
  const { data, error } = await client
    .rpc('section_status_counts')
  if (error) return {}
  const map: Record<number, Record<string, number>> = {}
  for (const row of (data || [])) {
    if (!map[row.section_id]) map[row.section_id] = {}
    map[row.section_id][row.status] = row.cnt
  }
  return map
})

const enrichedSections = computed(() =>
  (sections.value || []).map(s => ({
    ...s,
    status_counts: statusCounts.value?.[s.id] || {}
  }))
)
</script>

<style scoped>
.page-header--flex { display: flex; justify-content: space-between; align-items: center; }
.stats-banner {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  margin-bottom: 2rem;
}
.stat-box {
  border: 1px solid;
  border-radius: var(--radius-lg);
  padding: 0.75rem 1rem;
  text-align: center;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.15s, transform 0.1s;
  cursor: pointer;
}
.stat-box:hover:not(.stat-box--current) {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
.stat-box--current {
  background: var(--color-marquee-bg);
  border-color: var(--color-sorry-dot);
  cursor: default;
  font-weight: 600;
  box-shadow: inset 0 0 0 2px var(--color-sorry-dot);
}
.stat-box--decls { background: var(--color-paper-bg); border-color: #bfdbfe; }
.stat-box--marquee { background: var(--color-marquee-alt-bg); border-color: #bbf7d0; }
.stat-box--axiom { background: var(--color-axiom-bg); border-color: #ddd6fe; }
.stat-box--trivial { background: var(--color-trivial-bg); border-color: #a5f3fc; }
.stat-num {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
}
.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
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
  color: var(--color-link);
  text-decoration: none;
}
.all-link a:hover { text-decoration: underline; }

/* Skeletons */
.stat-box-skeleton { height: 72px; }
.section-skeleton { height: 120px; }

@media (max-width: 640px) {
  .stats-banner { grid-template-columns: repeat(3, 1fr); }
  .section-grid { grid-template-columns: 1fr; }
}
</style>
