<template>
  <div class="container">
    <NavHeader />

    <div class="page-header">
      <h2>All Lean 4 Declarations</h2>
      <p class="subtitle">{{ theorems.length }} declarations across {{ uniqueFiles }} files</p>
      <NuxtLink to="/theorems" class="back-link">Back to section overview</NuxtLink>
    </div>

    <div class="controls">
      <input
        v-model="search"
        type="text"
        placeholder="Search theorems..."
        class="search-input"
      />
      <select v-model="filterKind" class="filter-select">
        <option value="">All kinds</option>
        <option v-for="k in kinds" :key="k" :value="k">{{ k }}</option>
      </select>
      <select v-model="filterPaper" class="filter-select">
        <option value="">All papers</option>
        <option v-for="p in papers" :key="p" :value="p">{{ p }}</option>
      </select>
      <select v-model="filterStatus" class="filter-select">
        <option value="">All statuses</option>
        <option value="proved">proved</option>
        <option value="sorry">sorry</option>
        <option value="axiom">axiom</option>
        <option value="trivial">trivial</option>
      </select>
    </div>

    <div class="stats-bar">
      <span class="stat">{{ filtered.length }} results</span>
      <span class="stat" v-if="filterKind || filterPaper || filterStatus || search">
        (filtered from {{ theorems.length }})
      </span>
    </div>

    <div class="theorem-list">
      <div v-for="t in paginated" :key="t.id" class="theorem-card">
        <div class="theorem-header">
          <NuxtLink :to="`/theorems/${t.name}`" class="theorem-name">{{ t.display_name || t.name }}</NuxtLink>
          <div class="badges">
            <span class="badge kind">{{ t.kind }}</span>
            <span class="badge" :class="t.status">{{ t.status }}</span>
            <span class="badge paper" v-if="t.paper">{{ t.paper }}</span>
          </div>
        </div>
        <p v-if="t.docstring" class="docstring">{{ truncate(t.docstring, 200) }}</p>
        <div class="theorem-meta">
          <span>{{ t.file_path }}</span>
          <span v-if="t.line_number">:{{ t.line_number }}</span>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="page <= 1" @click="page--">&laquo; Prev</button>
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++">Next &raquo;</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const client = useSupabaseClient()

const search = ref('')
const filterKind = ref('')
const filterPaper = ref('')
const filterStatus = ref((route.query.status as string) || '')
const page = ref(1)
const perPage = 50

const { data: theorems } = await useAsyncData('theorems-all', async () => {
  // Supabase defaults to 1000 rows max; fetch all ~1870 in two pages
  const pageSize = 1000
  let all: any[] = []
  let from = 0
  while (true) {
    const { data, error } = await client
      .from('theorems')
      .select('id, name, display_name, file_path, paper, kind, docstring, status, line_number')
      .order('file_path')
      .order('line_number')
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
})

const kinds = computed(() => [...new Set(theorems.value?.map(t => t.kind))].sort())
const papers = computed(() => [...new Set(theorems.value?.map(t => t.paper).filter(Boolean))].sort())
const uniqueFiles = computed(() => new Set(theorems.value?.map(t => t.file_path)).size)

const filtered = computed(() => {
  let result = theorems.value || []
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.display_name?.toLowerCase().includes(q) ||
      t.docstring?.toLowerCase().includes(q)
    )
  }
  if (filterKind.value) result = result.filter(t => t.kind === filterKind.value)
  if (filterPaper.value) result = result.filter(t => t.paper === filterPaper.value)
  if (filterStatus.value) result = result.filter(t => t.status === filterStatus.value)
  return result
})

const totalPages = computed(() => Math.ceil(filtered.value.length / perPage))
const paginated = computed(() => {
  const start = (page.value - 1) * perPage
  return filtered.value.slice(start, start + perPage)
})

watch([search, filterKind, filterPaper, filterStatus], () => { page.value = 1 })

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '...' : s
}
</script>

<style scoped>
.container { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.page-header { margin-bottom: 1rem; }
.page-header h2 { margin: 0 0 0.25rem; }
.subtitle { color: #666; margin: 0; font-size: 0.9rem; }
.back-link { font-size: 0.85rem; color: #0066cc; text-decoration: none; }
.back-link:hover { text-decoration: underline; }
.controls { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 200px; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem; }
.filter-select { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; background: white; }
.stats-bar { font-size: 0.8rem; color: #888; margin-bottom: 0.75rem; }
.stat { margin-right: 0.5rem; }
.theorem-list { display: flex; flex-direction: column; gap: 0.5rem; }
.theorem-card { border: 1px solid #eee; border-radius: 6px; padding: 0.75rem 1rem; }
.theorem-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap; }
.theorem-name { font-weight: 600; font-size: 0.95rem; color: #111; text-decoration: none; font-family: 'SF Mono', 'Fira Code', monospace; }
.theorem-name:hover { color: #0066cc; }
.badges { display: flex; gap: 0.25rem; flex-wrap: wrap; }
.badge { font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 3px; background: #f0f0f0; color: #555; }
.badge.proved { background: #e6f4ea; color: #1a7f37; }
.badge.sorry { background: #fff3cd; color: #856404; }
.badge.axiom { background: #e8d5f5; color: #6f42c1; }
.badge.trivial { background: #d1ecf1; color: #0c5460; }
.badge.paper { background: #e7f0ff; color: #0550ae; }
.docstring { margin: 0.4rem 0 0; font-size: 0.85rem; color: #444; line-height: 1.4; }
.theorem-meta { font-size: 0.75rem; color: #999; margin-top: 0.3rem; font-family: monospace; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1.5rem; }
.pagination button { padding: 0.4rem 0.8rem; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
