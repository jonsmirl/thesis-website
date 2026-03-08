<template>
  <div class="container">
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
          <NuxtLink :to="`/theorems/all?kind=${theorem.kind}`" class="badge kind">{{ theorem.kind }}</NuxtLink>
          <NuxtLink :to="`/theorems/all?status=${theorem.status}`" class="badge" :class="theorem.status">{{ theorem.status }}</NuxtLink>
          <NuxtLink v-if="theorem.paper" :to="`/theorems/all?paper=${theorem.paper}`" class="badge paper">{{ theorem.paper }}</NuxtLink>
          <span class="badge marquee" v-if="theorem.is_marquee">key theorem</span>
        </div>
      </div>

      <div v-if="theorem.docstring" class="section">
        <h3>Documentation</h3>
        <MathDoc :text="theorem.docstring" class="docstring" />
      </div>

      <details v-if="theorem.source_code" class="source-details">
        <summary class="section-summary"><h3>Lean 4 Proof</h3></summary>
        <LeanHighlight :code="theorem.source_code" />
      </details>

      <!-- Dependencies -->
      <div v-if="depsOn.length" class="section">
        <h3>Depends on</h3>
        <div class="dep-grid">
          <NuxtLink
            v-for="d in depsOn"
            :key="d.name"
            :to="`/theorems/${d.name}`"
            class="dep-chip"
          >
            <span class="dep-dot" :class="d.status"></span>
            {{ d.name }}
          </NuxtLink>
        </div>
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
            <span class="dep-dot" :class="d.status"></span>
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

      <!-- Same-file neighbors -->
      <div v-if="neighbors.length" class="section">
        <h3>In the same file</h3>
        <div class="dep-grid">
          <NuxtLink
            v-for="n in neighbors"
            :key="n.name"
            :to="`/theorems/${n.name}`"
            class="dep-chip"
          >
            <span class="dep-dot" :class="n.status"></span>
            {{ n.name }}
          </NuxtLink>
        </div>
      </div>
    </div>
    <div v-else>
      <p>Theorem not found.</p>
      <NuxtLink to="/theorems">Back to theorems</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
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

// Fetch dependencies
const { data: depsOn } = await useAsyncData(`deps-on-${route.params.name}`, async () => {
  if (!theorem.value) return []
  const { data } = await client
    .from('theorem_deps')
    .select('to_id, theorems!theorem_deps_to_id_fkey(name, status)')
    .eq('from_id', theorem.value.id)
  return (data || []).map(d => (d.theorems as any)).filter(Boolean)
})

const { data: usedBy } = await useAsyncData(`used-by-${route.params.name}`, async () => {
  if (!theorem.value) return []
  const { data } = await client
    .from('theorem_deps')
    .select('from_id, theorems!theorem_deps_from_id_fkey(name, status)')
    .eq('to_id', theorem.value.id)
  return (data || []).map(d => (d.theorems as any)).filter(Boolean)
})

// Same-file neighbors
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

function githubUrl(filePath: string, line?: number) {
  const base = 'https://github.com/jonsmirl/thesis/blob/main'
  const url = `${base}/${filePath}`
  return line ? `${url}#L${line}` : url
}
</script>

<style scoped>
.container { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.breadcrumb { font-size: 0.85rem; color: #666; margin-bottom: 1rem; }
.breadcrumb a { color: #0066cc; text-decoration: none; }
.detail-header { margin-bottom: 1.5rem; }
.detail-header h2 { margin: 0 0 0.5rem; font-family: 'SF Mono', 'Fira Code', monospace; }
.badges { display: flex; gap: 0.25rem; }
.badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 3px; background: #f0f0f0; color: #555; }
.badge.proved { background: #e6f4ea; color: #1a7f37; }
.badge.sorry { background: #fff3cd; color: #856404; }
.badge.axiom { background: #e8d5f5; color: #6f42c1; }
.badge.trivial { background: #d1ecf1; color: #0c5460; }
.badge.paper { background: #e7f0ff; color: #0550ae; }
.badge.marquee { background: #fef3c7; color: #92400e; font-weight: 600; }
.section { margin-bottom: 1.5rem; }
.section h3 { font-size: 0.9rem; color: #666; margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
.docstring { margin: 0; line-height: 1.6; white-space: pre-wrap; }
.meta { font-size: 0.9rem; }
.meta code { background: #f6f8fa; padding: 0.15rem 0.4rem; border-radius: 3px; }
.dep-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.dep-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.75rem;
  color: #111;
  text-decoration: none;
}
.dep-chip:hover { background: #eef1f5; border-color: #0066cc; }
.dep-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ccc;
}
.dep-dot.proved { background: #22c55e; }
.dep-dot.sorry { background: #fbbf24; }
.dep-dot.axiom { background: #a78bfa; }
.dep-dot.trivial { background: #67e8f9; }
.file-link { color: #0066cc; text-decoration: none; font-family: monospace; }
.file-link:hover { text-decoration: underline; }
.badge { text-decoration: none; }
.source-details { margin-bottom: 1.5rem; border: 1px solid #eee; border-radius: 6px; }
.section-summary { padding: 0.6rem 1rem; cursor: pointer; background: #fafafa; border-radius: 6px; list-style: none; }
.section-summary::-webkit-details-marker { display: none; }
.section-summary::before { content: '\25B6 '; font-size: 0.7rem; color: #999; }
.source-details[open] > .section-summary::before { content: '\25BC '; }
.source-details[open] > .section-summary { border-radius: 6px 6px 0 0; border-bottom: 1px solid #eee; }
.section-summary h3 { display: inline; font-size: 0.9rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
</style>
