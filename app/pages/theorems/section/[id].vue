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
          <p class="section-desc"><MathInline :text="section.description" /></p>
          <div class="section-stats">
            <NuxtLink :to="`/theorems/all?section=${section.number}`" class="stat-link">{{ section.theorem_count }} declarations</NuxtLink>
            <span>{{ section.marquee_count }} key theorems</span>
            <NuxtLink :to="`/theorems/all?status=proved`" class="stat-link">{{ statusCounts.proved }} proved</NuxtLink>
            <NuxtLink v-if="statusCounts.trivial" :to="`/theorems/all?status=trivial`" class="stat-link">{{ statusCounts.trivial }} trivial</NuxtLink>
            <NuxtLink v-if="statusCounts.sorry" :to="`/theorems/all?status=sorry`" class="stat-link">{{ statusCounts.sorry }} sorry</NuxtLink>
            <NuxtLink v-if="statusCounts.axiom" :to="`/theorems/all?status=axiom`" class="stat-link">{{ statusCounts.axiom }} axiom</NuxtLink>
          </div>
        </div>
      </div>

      <div v-if="enrichedMarquees.length" class="proof-chain">
        <h3>Key Theorems</h3>
        <div class="timeline" :style="{ '--accent': section.color }">
          <template v-for="(item, idx) in enrichedMarquees" :key="item.name">
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

      <details class="all-decls">
        <summary>All {{ sectionTheorems.length }} declarations in this section</summary>
        <div class="decl-table">
          <div v-for="t in sectionTheorems" :key="t.id" class="decl-row">
            <NuxtLink :to="`/theorems/${t.name}`" class="decl-name">{{ t.name }}</NuxtLink>
            <span class="decl-kind">{{ t.kind }}</span>
            <NuxtLink :to="`/theorems/all?status=${t.status}`" class="badge" :class="`badge--${t.status}`">{{ t.status }}</NuxtLink>
            <a :href="githubUrl(t.file_path, t.line_number)" target="_blank" class="decl-file">{{ t.file_path?.split('/').pop() }}<span v-if="t.line_number">:{{ t.line_number }}</span></a>
          </div>
        </div>
      </details>

      <div class="nav-links">
        <NuxtLink v-if="prevSection" :to="`/theorems/section/${prevSection.number}`" class="nav-prev">
          &laquo; {{ prevSection.number }}. {{ prevSection.title }}
        </NuxtLink>
        <span v-else></span>
        <NuxtLink to="/theorems" class="nav-center">All Sections</NuxtLink>
        <NuxtLink v-if="nextSection" :to="`/theorems/section/${nextSection.number}`" class="nav-next">
          {{ nextSection.number }}. {{ nextSection.title }} &raquo;
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
import { githubUrl } from '~/utils/formatting'

const route = useRoute()
const client = useSupabaseClient()
const sectionNumber = Number(route.params.id)

const { data: section } = await useAsyncData(`section-${sectionNumber}`, async () => {
  const { data, error } = await client
    .from('derivation_sections')
    .select('*')
    .eq('number', sectionNumber)
    .single()
  if (error) return null
  return data
})

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

const { data: adjacentSections } = await useAsyncData(`adjacent-${sectionNumber}`, async () => {
  const { data } = await client
    .from('derivation_sections')
    .select('number, title')
    .in('number', [sectionNumber - 1, sectionNumber + 1])
  return data || []
})

const prevSection = computed(() => adjacentSections.value?.find(s => s.number === sectionNumber - 1))
const nextSection = computed(() => adjacentSections.value?.find(s => s.number === sectionNumber + 1))
</script>

<style scoped>
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
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}
.section-header h2 { margin: 0 0 0.25rem; }
.section-desc { margin: 0 0 0.5rem; color: var(--color-text-muted); font-size: 0.9rem; }
.section-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--color-text-faint);
}
.proof-chain { margin-bottom: 2rem; }
.proof-chain h3 { margin: 0 0 1rem; font-size: 1rem; color: var(--color-text-secondary); }
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
  background: var(--accent, var(--color-border-input));
  opacity: 0.3;
}
.subsection-divider {
  padding: 0.75rem 0 0.5rem 2rem;
}
.subsection-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.all-decls {
  margin-top: 2rem;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
}
.all-decls summary {
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--color-text-tertiary);
  background: var(--color-bg-surface-alt);
  border-radius: var(--radius-md);
}
.all-decls[open] summary {
  border-bottom: 1px solid var(--color-border-light);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}
.decl-table { max-height: 400px; overflow-y: auto; }
.decl-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 1rem;
  border-bottom: 1px solid var(--color-border-faint);
  font-size: 0.8rem;
}
.decl-name {
  font-family: var(--font-mono);
  color: var(--color-text-primary);
  text-decoration: none;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.decl-name:hover { color: var(--color-link); }
.decl-kind { color: var(--color-text-faint); font-size: 0.7rem; }
.decl-file { color: var(--color-link); text-decoration: none; font-size: 0.7rem; font-family: var(--font-mono); }
.decl-file:hover { text-decoration: underline; }
.badge { font-size: 0.65rem; padding: 0.1rem 0.3rem; border-radius: var(--radius-sm); text-decoration: none; }
.nav-links {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  font-size: 0.9rem;
}
.nav-links a {
  color: var(--color-link);
  text-decoration: none;
}
.nav-links a:hover { text-decoration: underline; }
.nav-center { color: var(--color-text-muted); font-size: 0.85rem; }
.stat-link { color: var(--color-text-faint); text-decoration: none; }
.stat-link:hover { text-decoration: underline; color: var(--color-link); }
</style>
