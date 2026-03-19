<template>
  <div class="container">

    <div class="page-header page-header--flex">
      <div>
        <h2>Empirical Test Scorecard</h2>
        <p class="subtitle">{{ tests.length }} tests</p>
      </div>
      <NuxtLink to="/tests/download" class="download-btn">
        &#8615; Download &amp; Run the Tests
      </NuxtLink>
    </div>

    <!-- Skeleton loading -->
    <template v-if="!tests">
      <div class="scorecard">
        <div v-for="i in 4" :key="i" class="score-item-skeleton skeleton" />
      </div>
      <div class="test-list">
        <div v-for="i in 6" :key="i" class="test-skeleton skeleton" />
      </div>
    </template>

    <template v-else>
      <div class="scorecard">
        <div class="score-item score-item--consistent" :class="{ 'score-item--active': filterStatus === 'CONSISTENT' }" @click="toggleStatus('CONSISTENT')">
          <span class="score-count">{{ statusCount('CONSISTENT') }}</span>
          <span class="score-label">Consistent</span>
        </div>
        <div class="score-item score-item--ambiguous" :class="{ 'score-item--active': filterStatus === 'AMBIGUOUS' }" @click="toggleStatus('AMBIGUOUS')">
          <span class="score-count">{{ statusCount('AMBIGUOUS') }}</span>
          <span class="score-label">Ambiguous</span>
        </div>
        <div class="score-item score-item--inconsistent" :class="{ 'score-item--active': filterStatus === 'INCONSISTENT' }" @click="toggleStatus('INCONSISTENT')">
          <span class="score-count">{{ statusCount('INCONSISTENT') }}</span>
          <span class="score-label">Inconsistent</span>
        </div>
        <div class="score-item score-item--pending" :class="{ 'score-item--active': filterStatus === 'PENDING' }" @click="toggleStatus('PENDING')">
          <span class="score-count">{{ statusCount('PENDING') }}</span>
          <span class="score-label">Pending</span>
        </div>
      </div>

      <div class="controls">
        <select v-model="filterStatus" class="filter-select">
          <option value="">All statuses</option>
          <option value="CONSISTENT">Consistent</option>
          <option value="AMBIGUOUS">Ambiguous</option>
          <option value="INCONSISTENT">Inconsistent</option>
          <option value="PENDING">Pending</option>
        </select>
        <select v-model="filterCategory" class="filter-select">
          <option value="">All categories</option>
          <option v-for="c in categories" :key="c" :value="c">{{ CATEGORY_LABELS[c] || c }}</option>
        </select>
        <select v-model="filterConfidence" class="filter-select">
          <option value="">All confidence</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <div class="test-list">
        <div v-for="t in filtered" :key="t.id" class="test-card">
          <div class="test-header">
            <NuxtLink :to="`/tests/${t.slug}`" class="test-name">{{ formatName(t.name) }}</NuxtLink>
            <div class="badges">
              <span class="badge" :class="`badge--${t.status?.toLowerCase()}`">{{ t.status }}</span>
              <span class="badge badge--paper" v-if="t.category">{{ CATEGORY_LABELS[t.category] || t.category }}</span>
              <span v-if="t.confidence" class="badge" :class="`badge--confidence-${t.confidence.toLowerCase()}`">{{ t.confidence }}</span>
            </div>
          </div>
          <p v-if="t.description" class="description"><MathInline :text="truncate(t.description, 200)" /></p>
          <div v-if="t.statistics" class="stats">
            <span v-for="(v, k) in topStats(t.statistics)" :key="k" class="stat-item">
              {{ k }}: {{ typeof v === 'number' ? v.toFixed(4) : v }}
            </span>
          </div>
          <div class="test-meta" v-if="t.script_path">
            <code>{{ t.script_path }}</code>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatName } from '~/utils/formatting'

const client = useSupabaseClient()

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

const filterStatus = ref('')
const filterCategory = ref('')
const filterConfidence = ref('')

const { data: tests } = await useAsyncData('tests', async () => {
  const { data, error } = await client
    .from('tests')
    .select('*')
    .order('category')
    .order('name')
  if (error) throw error
  return data || []
})

const categories = computed(() => [...new Set(tests.value?.map(t => t.category).filter(Boolean))].sort())

const filtered = computed(() => {
  let result = tests.value || []
  if (filterStatus.value) result = result.filter(t => t.status === filterStatus.value)
  if (filterCategory.value) result = result.filter(t => t.category === filterCategory.value)
  if (filterConfidence.value) result = result.filter(t => t.confidence === filterConfidence.value)
  return [...result].sort((a, b) => formatName(a.name).localeCompare(formatName(b.name)))
})

function toggleStatus(status: string) {
  filterStatus.value = filterStatus.value === status ? '' : status
}

function statusCount(status: string) {
  return (tests.value || []).filter(t => t.status === status).length
}

function truncate(s: string, n: number) {
  let clean = s.replace(/^=+\s*$/gm, '').replace(/\n{2,}/g, '\n').trim()
  const lines = clean.split('\n').filter(l => l.trim())
  const desc = lines.length > 1 ? lines.slice(1).join(' ') : lines[0] || ''
  const flat = desc.replace(/\s+/g, ' ').trim()
  return flat.length > n ? flat.slice(0, n) + '...' : flat
}

function topStats(stats: Record<string, any>) {
  const keys = Object.keys(stats).slice(0, 4)
  return Object.fromEntries(keys.map(k => [k, stats[k]]))
}
</script>

<style scoped>
.page-header--flex { display: flex; justify-content: space-between; align-items: center; }
.scorecard { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.score-item { flex: 1; min-width: 120px; padding: 1rem; border-radius: var(--radius-lg); text-align: center; cursor: pointer; transition: box-shadow 0.15s, transform 0.15s; }
.score-item:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.score-item--active { box-shadow: 0 0 0 2px var(--color-text-primary); }
.score-item--consistent { background: var(--color-consistent-bg); }
.score-item--ambiguous { background: var(--color-ambiguous-bg); }
.score-item--inconsistent { background: var(--color-inconsistent-bg); }
.score-item--pending { background: var(--color-pending-bg); }
.score-count { display: block; font-size: 2rem; font-weight: 700; }
.score-label { font-size: 0.8rem; color: var(--color-text-tertiary); }
.controls { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.filter-select { padding: 0.5rem; border: 1px solid var(--color-border-input); border-radius: 4px; font-size: 0.85rem; background: var(--color-bg-page); color: var(--color-text-primary); }
.test-list { display: flex; flex-direction: column; gap: 0.5rem; }
.test-card { border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 0.75rem 1rem; }
.test-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap; }
.test-name { font-weight: 600; font-size: 0.95rem; color: var(--color-text-primary); text-decoration: none; }
.test-name:hover { color: var(--color-link); }
.badges { display: flex; gap: 0.25rem; }
.description { margin: 0.4rem 0 0; font-size: 0.85rem; color: var(--color-text-secondary); }
.stats { display: flex; gap: 0.75rem; margin-top: 0.4rem; flex-wrap: wrap; }
.stat-item { font-size: 0.8rem; color: var(--color-text-tertiary); font-family: var(--font-mono); background: var(--color-bg-code); padding: 0.15rem 0.4rem; border-radius: var(--radius-sm); }
.test-meta { font-size: 0.75rem; color: var(--color-text-ghost); margin-top: 0.3rem; }
.test-meta code { font-family: var(--font-mono); }

/* Skeletons */
.score-item-skeleton { flex: 1; min-width: 120px; height: 72px; }
.test-skeleton { height: 80px; }
</style>
