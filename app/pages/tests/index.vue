<template>
  <div class="container">
    <NavHeader />

    <div class="page-header">
      <div>
        <h2>Empirical Test Scorecard</h2>
        <p class="subtitle">{{ tests.length }} tests</p>
      </div>
      <NuxtLink to="/tests/download" class="download-btn">
        &#8615; Download &amp; Run the Tests
      </NuxtLink>
    </div>

    <div class="scorecard">
      <div class="score-item consistent">
        <span class="score-count">{{ statusCount('CONSISTENT') }}</span>
        <span class="score-label">Consistent</span>
      </div>
      <div class="score-item ambiguous">
        <span class="score-count">{{ statusCount('AMBIGUOUS') }}</span>
        <span class="score-label">Ambiguous</span>
      </div>
      <div class="score-item inconsistent">
        <span class="score-count">{{ statusCount('INCONSISTENT') }}</span>
        <span class="score-label">Inconsistent</span>
      </div>
      <div class="score-item pending">
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
      <select v-model="filterPaper" class="filter-select">
        <option value="">All papers</option>
        <option v-for="p in papers" :key="p" :value="p">{{ p }}</option>
      </select>
    </div>

    <div class="test-list">
      <div v-for="t in filtered" :key="t.id" class="test-card">
        <div class="test-header">
          <NuxtLink :to="`/tests/${t.slug}`" class="test-name">{{ formatName(t.name) }}</NuxtLink>
          <div class="badges">
            <span class="badge" :class="t.status?.toLowerCase()">{{ t.status }}</span>
            <span class="badge paper" v-if="t.paper">{{ t.paper }}</span>
          </div>
        </div>
        <p v-if="t.description" class="description">{{ truncate(t.description, 200) }}</p>
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
  </div>
</template>

<script setup lang="ts">
const client = useSupabaseClient()

const filterStatus = ref('')
const filterPaper = ref('')

const { data: tests } = await useAsyncData('tests', async () => {
  const { data, error } = await client
    .from('tests')
    .select('*')
    .order('paper')
    .order('name')
  if (error) throw error
  return data || []
})

const papers = computed(() => [...new Set(tests.value?.map(t => t.paper).filter(Boolean))].sort())

const filtered = computed(() => {
  let result = tests.value || []
  if (filterStatus.value) result = result.filter(t => t.status === filterStatus.value)
  if (filterPaper.value) result = result.filter(t => t.paper === filterPaper.value)
  return result
})

function statusCount(status: string) {
  return (tests.value || []).filter(t => t.status === status).length
}

function truncate(s: string, n: number) {
  // Strip separator lines, extra whitespace
  let clean = s.replace(/^=+\s*$/gm, '').replace(/\n{2,}/g, '\n').trim()
  // Take first meaningful line(s)
  const lines = clean.split('\n').filter(l => l.trim())
  // Skip the title line, take the description
  const desc = lines.length > 1 ? lines.slice(1).join(' ') : lines[0] || ''
  const flat = desc.replace(/\s+/g, ' ').trim()
  return flat.length > n ? flat.slice(0, n) + '...' : flat
}

function formatName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bV(\d)/g, 'v$1')
    .replace(/\bOecd\b/g, 'OECD')
    .replace(/\bBea\b/g, 'BEA')
    .replace(/\bCes\b/g, 'CES')
    .replace(/\bCpi\b/g, 'CPI')
    .replace(/\bDid\b/g, 'DID')
    .replace(/\bImf\b/g, 'IMF')
    .replace(/\bIo\b/g, 'I/O')
    .replace(/\bIes\b/g, 'IES')
    .replace(/\bOos\b/g, 'OOS')
    .replace(/\bMle\b/g, 'MLE')
    .replace(/\bMp\b/g, 'MP')
    .replace(/\bDtc\b/g, 'DTC')
}

function topStats(stats: Record<string, any>) {
  const keys = Object.keys(stats).slice(0, 4)
  return Object.fromEntries(keys.map(k => [k, stats[k]]))
}
</script>

<style scoped>
.container { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.page-header h2 { margin: 0 0 0.25rem; }
.subtitle { color: #666; margin: 0; font-size: 0.9rem; }
.scorecard { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.score-item { flex: 1; min-width: 120px; padding: 1rem; border-radius: 8px; text-align: center; }
.score-item.consistent { background: #e6f4ea; }
.score-item.ambiguous { background: #fff3cd; }
.score-item.inconsistent { background: #f8d7da; }
.score-item.pending { background: #f0f0f0; }
.download-btn { display: inline-block; padding: 0.5rem 1rem; background: #0550ae; color: #fff; text-decoration: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; transition: background 0.15s; white-space: nowrap; }
.download-btn:hover { background: #033d8b; }
.score-count { display: block; font-size: 2rem; font-weight: 700; }
.score-label { font-size: 0.8rem; color: #555; }
.controls { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.filter-select { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; background: white; }
.test-list { display: flex; flex-direction: column; gap: 0.5rem; }
.test-card { border: 1px solid #eee; border-radius: 6px; padding: 0.75rem 1rem; }
.test-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap; }
.test-name { font-weight: 600; font-size: 0.95rem; color: #111; text-decoration: none; }
.test-name:hover { color: #0066cc; }
.badges { display: flex; gap: 0.25rem; }
.badge { font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 3px; background: #f0f0f0; color: #555; }
.badge.consistent { background: #e6f4ea; color: #1a7f37; }
.badge.ambiguous { background: #fff3cd; color: #856404; }
.badge.inconsistent { background: #f8d7da; color: #842029; }
.badge.pending { background: #f0f0f0; color: #555; }
.badge.paper { background: #e7f0ff; color: #0550ae; }
.description { margin: 0.4rem 0 0; font-size: 0.85rem; color: #444; }
.stats { display: flex; gap: 0.75rem; margin-top: 0.4rem; flex-wrap: wrap; }
.stat-item { font-size: 0.8rem; color: #555; font-family: monospace; background: #f6f8fa; padding: 0.15rem 0.4rem; border-radius: 3px; }
.test-meta { font-size: 0.75rem; color: #999; margin-top: 0.3rem; }
.test-meta code { font-family: monospace; }
</style>
