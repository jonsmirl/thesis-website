<template>
  <div class="container">
    <NavHeader />

    <div class="page-header">
      <h2>All Lean 4 Declarations</h2>
      <p class="subtitle">{{ totalCount }} declarations</p>
      <NuxtLink to="/theorems" class="back-link">Back to section overview</NuxtLink>
    </div>

    <div class="controls">
      <input
        v-model="searchInput"
        type="text"
        placeholder="Search theorems..."
        class="search-input"
        @input="onSearchInput"
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
      <label v-if="filterMarquee" class="marquee-label"><input type="checkbox" v-model="filterMarquee" /> Key only</label>
      <button v-if="searchInput || filterKind || filterPaper || filterStatus || filterMarquee" class="clear-btn" @click="clearFilters">Clear</button>
    </div>

    <div class="stats-bar">
      <span class="stat">{{ filteredCount }} results</span>
      <span class="stat" v-if="isFiltered">
        (filtered from {{ totalCount }})
      </span>
    </div>

    <div class="theorem-list">
      <div v-for="t in rows" :key="t.id" class="theorem-card">
        <div class="theorem-header">
          <NuxtLink :to="`/theorems/${t.name}`" class="theorem-name">{{ t.display_name || t.name }}</NuxtLink>
          <div class="badges">
            <a class="badge kind" href="#" @click.prevent="filterKind = t.kind">{{ t.kind }}</a>
            <a class="badge" :class="t.status" href="#" @click.prevent="filterStatus = t.status">{{ t.status }}</a>
            <a class="badge paper" v-if="t.paper" href="#" @click.prevent="filterPaper = t.paper">{{ t.paper }}</a>
          </div>
        </div>
        <p v-if="t.docstring" class="docstring">{{ truncate(t.docstring, 200) }}</p>
        <div class="theorem-meta">
          <a :href="githubUrl(t.file_path, t.line_number)" target="_blank" class="file-link">
            {{ t.file_path }}<span v-if="t.line_number">:{{ t.line_number }}</span>
          </a>
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

const searchInput = ref('')
const search = ref('')
const filterKind = ref((route.query.kind as string) || '')
const filterPaper = ref((route.query.paper as string) || '')
const filterStatus = ref((route.query.status as string) || '')
const filterMarquee = ref((route.query.marquee as string) === 'true')
const page = ref(1)
const perPage = 50

// Debounce search to avoid a query per keystroke
let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = searchInput.value
  }, 300)
}

// Initialize search from URL if present
if (route.query.q) {
  searchInput.value = route.query.q as string
  search.value = route.query.q as string
}

// Static dropdown options (stable, no need to fetch dynamically)
const kinds = ['axiom', 'def', 'inductive', 'lemma', 'noncomputable def', 'structure', 'theorem']
const papers = ['applications', 'curvature_roles', 'dynamics', 'entry_exit', 'foundations', 'hierarchy', 'macro_extension', 'potential', 'two_world']

// Total declaration count (unfiltered)
const { data: totals } = await useAsyncData('theorems-totals', async () => {
  const { count, error } = await client
    .from('theorems')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return { total: count || 0 }
})

const totalCount = computed(() => totals.value?.total || 0)

const isFiltered = computed(() =>
  !!(search.value || filterKind.value || filterPaper.value || filterStatus.value || filterMarquee.value)
)

// Build Supabase query with current filters
function buildQuery(countOnly = false) {
  let q = client
    .from('theorems')
    .select(
      countOnly
        ? '*'
        : 'id, name, display_name, file_path, paper, kind, docstring, status, line_number, is_marquee',
      countOnly ? { count: 'exact', head: true } : { count: 'exact' }
    )

  if (search.value) {
    const pattern = `%${search.value}%`
    q = q.or(`name.ilike.${pattern},display_name.ilike.${pattern},docstring.ilike.${pattern}`)
  }
  if (filterKind.value) q = q.eq('kind', filterKind.value)
  if (filterPaper.value) q = q.eq('paper', filterPaper.value)
  if (filterStatus.value) q = q.eq('status', filterStatus.value)
  if (filterMarquee.value) q = q.eq('is_marquee', true)

  if (!countOnly) {
    const from = (page.value - 1) * perPage
    q = q.order('file_path').order('line_number').range(from, from + perPage - 1)
  }

  return q
}

// Fetch filtered page of results
const { data: result, refresh } = await useAsyncData(
  'theorems-filtered',
  async () => {
    const { data, count, error } = await buildQuery()
    if (error) throw error
    return { rows: data || [], count: count || 0 }
  },
  { watch: [search, filterKind, filterPaper, filterStatus, filterMarquee, page] }
)

const rows = computed(() => result.value?.rows || [])
const filteredCount = computed(() => result.value?.count || 0)
const totalPages = computed(() => Math.ceil(filteredCount.value / perPage))

// Reset page when filters change (but not when page itself changes)
watch([search, filterKind, filterPaper, filterStatus, filterMarquee], () => { page.value = 1 })

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '...' : s
}

function githubUrl(filePath: string, line?: number) {
  const base = 'https://github.com/jonsmirl/thesis/blob/main'
  const url = `${base}/${filePath}`
  return line ? `${url}#L${line}` : url
}

function clearFilters() {
  searchInput.value = ''
  search.value = ''
  filterKind.value = ''
  filterPaper.value = ''
  filterStatus.value = ''
  filterMarquee.value = false
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
.marquee-label { display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; color: #555; padding: 0.5rem; }
.stats-bar { font-size: 0.8rem; color: #888; margin-bottom: 0.75rem; }
.stat { margin-right: 0.5rem; }
.theorem-list { display: flex; flex-direction: column; gap: 0.5rem; }
.theorem-card { border: 1px solid #eee; border-radius: 6px; padding: 0.75rem 1rem; }
.theorem-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap; }
.theorem-name { font-weight: 600; font-size: 0.95rem; color: #111; text-decoration: none; font-family: 'SF Mono', 'Fira Code', monospace; }
.theorem-name:hover { color: #0066cc; }
.badges { display: flex; gap: 0.25rem; flex-wrap: wrap; }
.badge { font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 3px; background: #f0f0f0; color: #555; text-decoration: none; }
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
.file-link { color: #0066cc; text-decoration: none; font-family: monospace; font-size: 0.75rem; }
.file-link:hover { text-decoration: underline; }
.clear-btn { padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 4px; background: #fff; cursor: pointer; font-size: 0.85rem; color: #666; }
.clear-btn:hover { background: #f5f5f5; }
</style>
