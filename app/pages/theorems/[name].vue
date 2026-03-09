<template>
  <div class="container--narrow">
    <NavHeader />

    <div v-if="theorem">
      <div class="breadcrumb">
        <NuxtLink to="/theorems">Sections</NuxtLink>
        <template v-if="sectionInfo">
          / <NuxtLink :to="`/theorems/section/${sectionInfo.number}`">Section {{ sectionInfo.number }}: {{ sectionInfo.title }}</NuxtLink>
        </template>
        / {{ theorem.name }}
      </div>

      <div class="detail-header">
        <h2>{{ theorem.display_name || theorem.name }}</h2>
        <div class="badges">
          <NuxtLink :to="`/theorems/all?kind=${theorem.kind}`" class="badge badge--kind">{{ theorem.kind }}</NuxtLink>
          <NuxtLink :to="`/theorems/all?status=${theorem.status}`" class="badge" :class="`badge--${theorem.status}`">{{ theorem.status }}</NuxtLink>
          <NuxtLink v-if="theorem.paper" :to="`/theorems/all?paper=${theorem.paper}`" class="badge badge--paper">{{ theorem.paper }}</NuxtLink>
          <span class="badge badge--marquee" v-if="theorem.is_marquee">key theorem</span>
        </div>
      </div>

      <div v-if="theorem.docstring" class="section">
        <h3>Documentation</h3>
        <MathDoc :text="theorem.docstring" class="docstring" />
      </div>

      <div v-if="theorem.source_code" class="section">
        <h3>Lean 4 Proof</h3>
        <LeanHighlight :code="theorem.source_code" />
      </div>

      <div class="section">
        <h3>Dependency Graph</h3>
        <DepGraph :root-name="theorem.name" />
      </div>

      <div v-if="usedBy.length" class="section">
        <h3>Used by</h3>
        <div class="dep-grid">
          <NuxtLink
            v-for="d in usedBy"
            :key="d.name"
            :to="`/theorems/${d.name}`"
            class="dep-chip"
          >
            <span class="dep-dot" :class="`dep-dot--${d.status}`"></span>
            {{ d.name }}
          </NuxtLink>
        </div>
      </div>

      <div class="section">
        <h3>Location</h3>
        <p class="meta">
          <a :href="githubUrl(theorem.file_path, theorem.line_number)" target="_blank" class="file-link">
            {{ theorem.file_path }}<span v-if="theorem.line_number">:{{ theorem.line_number }}</span>
          </a>
        </p>
      </div>

      <div v-if="theorem.section" class="section">
        <h3>Module Section</h3>
        <p>{{ theorem.section }}</p>
      </div>

      <div v-if="neighbors.length" class="section">
        <h3>In the same file</h3>
        <div class="dep-grid">
          <NuxtLink
            v-for="n in neighbors"
            :key="n.name"
            :to="`/theorems/${n.name}`"
            class="dep-chip"
          >
            <span class="dep-dot" :class="`dep-dot--${n.status}`"></span>
            {{ n.name }}
          </NuxtLink>
        </div>
      </div>
      <CommentThread content-type="theorem" :content-slug="(route.params.name as string)" />
    </div>
    <div v-else>
      <p>Theorem not found.</p>
      <NuxtLink to="/theorems">Back to theorems</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { githubUrl } from '~/utils/formatting'

const route = useRoute()
const client = useSupabaseClient()

const { data: theorem } = await useAsyncData(`theorem-${route.params.name}`, async () => {
  const { data, error } = await client
    .from('theorems')
    .select('*, derivation_sections(number, title, color)')
    .eq('name', route.params.name)
    .single()
  if (error) return null
  return data
})

const sectionInfo = computed(() => theorem.value?.derivation_sections as any)

const { data: usedBy } = await useAsyncData(`used-by-${route.params.name}`, async () => {
  if (!theorem.value) return []
  const { data } = await client
    .from('theorem_deps')
    .select('from_id, theorems!theorem_deps_from_id_fkey(name, status)')
    .eq('to_id', theorem.value.id)
  return (data || []).map(d => (d.theorems as any)).filter(Boolean)
})

const { data: neighborsRaw } = await useAsyncData(`neighbors-${route.params.name}`, async () => {
  if (!theorem.value?.file_path) return []
  const { data } = await client
    .from('theorems')
    .select('name, status, line_number')
    .eq('file_path', theorem.value.file_path)
    .neq('name', theorem.value.name)
    .order('line_number')
    .limit(20)
  return data || []
})

const neighbors = computed(() => neighborsRaw.value || [])
</script>

<style scoped>
.detail-header { margin-bottom: 1.5rem; }
.detail-header h2 { margin: 0 0 0.5rem; font-family: var(--font-mono); }
.badges { display: flex; gap: 0.25rem; }
.badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); text-decoration: none; }
.badge--kind { background: var(--color-bg-hover); color: var(--color-text-tertiary); }
.section { margin-bottom: 1.5rem; }
.section h3 { font-size: 0.9rem; color: var(--color-text-muted); margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
.docstring { margin: 0; line-height: 1.6; white-space: pre-wrap; font-family: var(--font-serif); line-height: 1.85; }
.meta { font-size: 0.9rem; }
.meta code { background: var(--color-bg-code); padding: 0.15rem 0.4rem; border-radius: var(--radius-sm); }
.dep-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.dep-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  background: var(--color-bg-code);
  border: 1px solid var(--color-border-medium);
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-primary);
  text-decoration: none;
}
.dep-chip:hover { background: var(--color-bg-hover); border-color: var(--color-link); }
.dep-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-border-input);
}
.dep-dot--proved { background: var(--color-proved-dot); }
.dep-dot--sorry { background: var(--color-sorry-dot); }
.dep-dot--axiom { background: var(--color-axiom-dot); }
.dep-dot--trivial { background: var(--color-trivial-dot); }
</style>
