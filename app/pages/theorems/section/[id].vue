<template>
  <div class="container">
    <NavHeader />

    <div v-if="section">
      <div class="breadcrumb">
        <NuxtLink to="/theorems">Sections</NuxtLink> / Section {{ section.number }}
      </div>

      <div class="section-header">
        <span class="section-badge" :style="{ background: section.color }">{{ section.number }}</span>
        <div>
          <h2>{{ section.title }}</h2>
          <p class="section-desc">{{ section.description }}</p>
          <div class="section-stats">
            <span>{{ section.theorem_count }} declarations</span>
            <span>{{ section.marquee_count }} key theorems</span>
            <span>{{ statusCounts.proved }} proved</span>
            <span v-if="statusCounts.trivial">{{ statusCounts.trivial }} trivial</span>
            <span v-if="statusCounts.sorry">{{ statusCounts.sorry }} sorry</span>
            <span v-if="statusCounts.axiom">{{ statusCounts.axiom }} axiom</span>
          </div>
        </div>
      </div>

      <!-- Proof chain timeline -->
      <div v-if="enrichedMarquees.length" class="proof-chain">
        <h3>Key Theorems</h3>
        <div class="timeline" :style="{ '--accent': section.color }">
          <template v-for="(item, idx) in enrichedMarquees" :key="item.name">
            <!-- Subsection divider -->
            <div
              v-if="item.subsection && (idx === 0 || item.subsection !== enrichedMarquees[idx - 1]?.subsection)"
              class="subsection-divider"
            >
              <span class="subsection-label">{{ item.subsection }}</span>
            </div>
            <ProofChainItem :item="item" :accent-color="section.color" />
          </template>
        </div>
      </div>

      <!-- All declarations in section -->
      <details class="all-decls">
        <summary>All {{ sectionTheorems.length }} declarations in this section</summary>
        <div class="decl-table">
          <div v-for="t in sectionTheorems" :key="t.id" class="decl-row">
            <NuxtLink :to="`/theorems/${t.name}`" class="decl-name">{{ t.name }}</NuxtLink>
            <span class="decl-kind">{{ t.kind }}</span>
            <span class="badge" :class="t.status">{{ t.status }}</span>
            <span class="decl-file">{{ t.file_path?.split('/').pop() }}</span>
          </div>
        </div>
      </details>

      <!-- Navigation -->
      <div class="nav-links">
        <NuxtLink v-if="section.number > 1" :to="`/theorems/section/${section.number - 1}`" class="nav-prev">
          &laquo; Section {{ section.number - 1 }}
        </NuxtLink>
        <span v-else></span>
        <NuxtLink v-if="section.number < 17" :to="`/theorems/section/${section.number + 1}`" class="nav-next">
          Section {{ section.number + 1 }} &raquo;
        </NuxtLink>
      </div>
    </div>
    <div v-else>
      <p>Section not found.</p>
      <NuxtLink to="/theorems">Back to sections</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const client = useSupabaseClient()
const sectionNumber = Number(route.params.id)

// Fetch section
const { data: section } = await useAsyncData(`section-${sectionNumber}`, async () => {
  const { data, error } = await client
    .from('derivation_sections')
    .select('*')
    .eq('number', sectionNumber)
    .single()
  if (error) return null
  return data
})

// Fetch marquee theorems with joined theorem data
const { data: marquees } = await useAsyncData(`marquees-${sectionNumber}`, async () => {
  if (!section.value) return []
  const { data, error } = await client
    .from('marquee_theorems')
    .select('sort_order, check_comment, subsection, theorem_id, theorems(id, name, display_name, kind, status, docstring, source_code, file_path, line_number)')
    .eq('section_id', section.value.id)
    .order('sort_order')
  if (error) return []
  return data || []
})

// Fetch all theorems in this section (may exceed 1000 default limit)
const { data: sectionTheorems } = await useAsyncData(`section-theorems-${sectionNumber}`, async () => {
  if (!section.value) return []
  const pageSize = 1000
  let all: any[] = []
  let from = 0
  while (true) {
    const { data, error } = await client
      .from('theorems')
      .select('id, name, kind, status, file_path, line_number')
      .eq('section_id', section.value.id)
      .order('file_path')
      .order('line_number')
      .range(from, from + pageSize - 1)
    if (error) return all
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
})

// Fetch deps for marquee theorems
const { data: allDeps } = await useAsyncData(`section-deps-${sectionNumber}`, async () => {
  const marqueeIds = marquees.value?.map(m => m.theorems?.id).filter(Boolean) || []
  if (!marqueeIds.length) return { depsOn: [], usedBy: [] }

  const [depsOnResp, usedByResp] = await Promise.all([
    client.from('theorem_deps').select('from_id, to_id, theorems!theorem_deps_to_id_fkey(name)').in('from_id', marqueeIds),
    client.from('theorem_deps').select('from_id, to_id, theorems!theorem_deps_from_id_fkey(name)').in('to_id', marqueeIds),
  ])

  return {
    depsOn: depsOnResp.data || [],
    usedBy: usedByResp.data || [],
  }
})

// Enrich marquees with deps
const enrichedMarquees = computed(() => {
  if (!marquees.value) return []

  return marquees.value.map(m => {
    const thm = m.theorems as any
    if (!thm) return null

    const depsOn = (allDeps.value?.depsOn || [])
      .filter(d => d.from_id === thm.id)
      .map(d => ({ name: (d.theorems as any)?.name }))
      .filter(d => d.name)
      .slice(0, 10)

    const usedBy = (allDeps.value?.usedBy || [])
      .filter(d => d.to_id === thm.id)
      .map(d => ({ name: (d.theorems as any)?.name }))
      .filter(d => d.name)
      .slice(0, 10)

    return {
      ...thm,
      check_comment: m.check_comment,
      subsection: m.subsection,
      deps_on: depsOn,
      used_by: usedBy,
    }
  }).filter(Boolean)
})

const statusCounts = computed(() => {
  const counts: Record<string, number> = { proved: 0, trivial: 0, sorry: 0, axiom: 0 }
  for (const t of sectionTheorems.value || []) {
    if (t.status in counts) counts[t.status]++
  }
  return counts
})
</script>

<style scoped>
.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.breadcrumb { font-size: 0.85rem; color: #666; margin-bottom: 1rem; }
.breadcrumb a { color: #0066cc; text-decoration: none; }
.section-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 2rem;
}
.section-badge {
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;
}
.section-header h2 { margin: 0 0 0.25rem; }
.section-desc { margin: 0 0 0.5rem; color: #666; font-size: 0.9rem; }
.section-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #888;
}
.proof-chain { margin-bottom: 2rem; }
.proof-chain h3 { margin: 0 0 1rem; font-size: 1rem; color: #333; }
.timeline {
  position: relative;
  padding-left: 6px;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--accent, #ddd);
  opacity: 0.3;
}
.subsection-divider {
  padding: 0.75rem 0 0.5rem 2rem;
}
.subsection-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.all-decls {
  margin-top: 2rem;
  border: 1px solid #eee;
  border-radius: 6px;
}
.all-decls summary {
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: #555;
  background: #fafafa;
  border-radius: 6px;
}
.all-decls[open] summary {
  border-bottom: 1px solid #eee;
  border-radius: 6px 6px 0 0;
}
.decl-table { max-height: 400px; overflow-y: auto; }
.decl-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 1rem;
  border-bottom: 1px solid #f5f5f5;
  font-size: 0.8rem;
}
.decl-name {
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: #111;
  text-decoration: none;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.decl-name:hover { color: #0066cc; }
.decl-kind { color: #888; font-size: 0.7rem; }
.decl-file { color: #aaa; font-size: 0.7rem; font-family: monospace; }
.badge { font-size: 0.65rem; padding: 0.1rem 0.3rem; border-radius: 3px; background: #f0f0f0; color: #555; }
.badge.proved { background: #e6f4ea; color: #1a7f37; }
.badge.sorry { background: #fff3cd; color: #856404; }
.badge.axiom { background: #e8d5f5; color: #6f42c1; }
.badge.trivial { background: #d1ecf1; color: #0c5460; }
.nav-links {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  font-size: 0.9rem;
}
.nav-links a {
  color: #0066cc;
  text-decoration: none;
}
.nav-links a:hover { text-decoration: underline; }
</style>
