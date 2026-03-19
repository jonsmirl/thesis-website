<template>
  <div class="container">

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
        aria-label="Search declarations"
        @input="onSearchInput"
      />
      <select v-model="filterKind" class="filter-select">
        <option value="">All kinds</option>
        <option v-for="k in kinds" :key="k" :value="k">{{ k }}</option>
      </select>
      <select v-model="filterCategory" class="filter-select">
        <option value="">All categories</option>
        <option v-for="c in categories" :key="c" :value="c">{{ CATEGORY_LABELS[c] || c }}</option>
      </select>
      <select v-model="filterStatus" class="filter-select">
        <option value="">All statuses</option>
        <option value="proved">proved</option>
        <option value="sorry">sorry</option>
        <option value="axiom">axiom</option>
        <option value="trivial">trivial</option>
      </select>
      <label v-if="filterMarquee" class="marquee-label"><input type="checkbox" v-model="filterMarquee" /> Key only</label>
      <button v-if="searchInput || filterKind || filterCategory || filterStatus || filterMarquee" class="clear-btn" @click="clearFilters">Clear</button>
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
            <a class="badge badge--kind" href="#" @click.prevent="filterKind = t.kind">{{ t.kind }}</a>
            <a class="badge" :class="`badge--${t.status}`" href="#" @click.prevent="filterStatus = t.status">{{ t.status }}</a>
            <a class="badge badge--paper" v-if="t.category" href="#" @click.prevent="filterCategory = t.category">{{ CATEGORY_LABELS[t.category] || t.category }}</a>
          </div>
        </div>
        <p v-if="t.docstring" class="docstring"><MathInline :text="truncate(t.docstring, 200)" /></p>
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
import { githubUrl } from '~/utils/formatting'

const route = useRoute()
const client = useSupabaseClient()

const searchInput = ref('')
const search = ref('')
const filterKind = ref((route.query.kind as string) || '')
const filterCategory = ref((route.query.category as string) || '')
const filterStatus = ref((route.query.status as string) || '')
const filterMarquee = ref((route.query.marquee as string) === 'true')
const page = ref(1)
const perPage = 50

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = searchInput.value
  }, 300)
}

if (route.query.q) {
  searchInput.value = route.query.q as string
  search.value = route.query.q as string
}

const CATEGORY_LABELS: Record<string, string> = {
  'foundations': 'Foundations',
  'curvature-roles': 'Curvature Roles',
  'information-geometry': 'Info Geometry',
  'ces-potential': 'CES Potential',
  'dynamics-crises': 'Dynamics & Crises',
  'hierarchy': 'Hierarchy',
  'trade': 'Trade',
  'ai-transition': 'AI Transition',
  'monetary-policy': 'Monetary Policy',
  'empirical-methods': 'Empirical Methods',
  'microeconomics': 'Microeconomics',
  'macroeconomics': 'Macroeconomics',
}

const kinds = ['axiom', 'def', 'inductive', 'lemma', 'noncomputable def', 'structure', 'theorem']
const categories = Object.keys(CATEGORY_LABELS)

const { data: totals } = await useAsyncData('theorems-totals', async () => {
  const { count, error } = await client
    .from('theorems')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return { total: count || 0 }
})

const totalCount = computed(() => totals.value?.total || 0)

const isFiltered = computed(() =>
  !!(search.value || filterKind.value || filterCategory.value || filterStatus.value || filterMarquee.value)
)

function buildQuery(countOnly = false) {
  let q = client
    .from('theorems')
    .select(
      countOnly
        ? '*'
        : 'id, name, display_name, file_path, category, kind, docstring, status, line_number, is_marquee',
      countOnly ? { count: 'exact', head: true } : { count: 'exact' }
    )

  if (search.value) {
    const pattern = `%${search.value}%`
    q = q.or(`name.ilike.${pattern},display_name.ilike.${pattern},docstring.ilike.${pattern}`)
  }
  if (filterKind.value) q = q.eq('kind', filterKind.value)
  if (filterCategory.value) q = q.eq('category', filterCategory.value)
  if (filterStatus.value) q = q.eq('status', filterStatus.value)
  if (filterMarquee.value) q = q.eq('is_marquee', true)

  if (!countOnly) {
    const from = (page.value - 1) * perPage
    q = q.order('file_path').order('line_number').range(from, from + perPage - 1)
  }

  return q
}

const { data: result, refresh } = await useAsyncData(
  'theorems-filtered',
  async () => {
    const { data, count, error } = await buildQuery()
    if (error) throw error
    return { rows: data || [], count: count || 0 }
  },
  { watch: [search, filterKind, filterCategory, filterStatus, filterMarquee, page] }
)

const rows = computed(() => result.value?.rows || [])
const filteredCount = computed(() => result.value?.count || 0)
const totalPages = computed(() => Math.ceil(filteredCount.value / perPage))

watch([search, filterKind, filterCategory, filterStatus, filterMarquee], () => { page.value = 1 })

function truncate(s: string, n: number) {
  let text = s
    .replace(/\*\*Proof\.\*\*[\s\S]*$/, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > n ? text.slice(0, n) + '...' : text
}

function clearFilters() {
  searchInput.value = ''
  search.value = ''
  filterKind.value = ''
  filterCategory.value = ''
  filterStatus.value = ''
  filterMarquee.value = false
}
</script>

<style scoped>
.back-link { font-size: 0.85rem; color: var(--color-link); text-decoration: none; }
.back-link:hover { text-decoration: underline; }
.controls { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 200px; padding: 0.5rem 0.75rem; border: 1px solid var(--color-border-input); border-radius: 4px; font-size: 0.9rem; background: var(--color-bg-page); color: var(--color-text-primary); }
.filter-select { padding: 0.5rem; border: 1px solid var(--color-border-input); border-radius: 4px; font-size: 0.85rem; background: var(--color-bg-page); color: var(--color-text-primary); }
.marquee-label { display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; color: var(--color-text-tertiary); padding: 0.5rem; }
.stats-bar { font-size: 0.8rem; color: var(--color-text-faint); margin-bottom: 0.75rem; }
.stat { margin-right: 0.5rem; }
.theorem-list { display: flex; flex-direction: column; gap: 0.5rem; }
.theorem-card { border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 0.75rem 1rem; }
.theorem-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap; }
.theorem-name { font-weight: 600; font-size: 0.95rem; color: var(--color-text-primary); text-decoration: none; font-family: var(--font-mono); }
.theorem-name:hover { color: var(--color-link); }
.badges { display: flex; gap: 0.25rem; flex-wrap: wrap; }
.badge--kind { background: var(--color-bg-hover); color: var(--color-text-tertiary); }
.docstring { margin: 0.4rem 0 0; font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.4; }
.theorem-meta { font-size: 0.75rem; color: var(--color-text-ghost); margin-top: 0.3rem; font-family: var(--font-mono); }
.pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1.5rem; }
.pagination button { padding: 0.4rem 0.8rem; border: 1px solid var(--color-border-input); border-radius: 4px; background: var(--color-bg-page); cursor: pointer; color: var(--color-text-primary); }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.clear-btn { padding: 0.5rem 0.75rem; border: 1px solid var(--color-border-input); border-radius: 4px; background: var(--color-bg-page); cursor: pointer; font-size: 0.85rem; color: var(--color-text-muted); }
.clear-btn:hover { background: var(--color-bg-hover); }
</style>
