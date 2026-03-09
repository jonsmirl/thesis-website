<template>
  <div class="container">
    <NavHeader />

    <div v-if="test">
      <div class="breadcrumb">
        <NuxtLink to="/tests">Tests</NuxtLink> / {{ test.name }}
      </div>

      <div class="detail-header">
        <h2>{{ formatName(test.name) }}</h2>
        <div class="badges">
          <span class="badge" :class="test.status?.toLowerCase()">{{ test.status }}</span>
          <span class="badge paper" v-if="test.paper">{{ test.paper }}</span>
        </div>
      </div>

      <div v-if="test.description" class="section">
        <h3>Description</h3>
        <TestDoc :text="test.description" />
      </div>

      <!-- Prediction verdicts (pull out of statistics for prominent display) -->
      <div v-if="predictionVerdicts && Object.keys(predictionVerdicts).length" class="section">
        <h3>Prediction Verdicts</h3>
        <div class="verdict-grid">
          <div v-for="(verdict, label) in predictionVerdicts" :key="label" class="verdict-item">
            <span class="verdict-label">{{ label }}</span>
            <span class="verdict-badge" :class="verdict.toLowerCase()">{{ verdict }}</span>
          </div>
        </div>
      </div>

      <div v-if="scalarStats && Object.keys(scalarStats).length" class="section">
        <h3>Statistics</h3>
        <table class="stats-table">
          <tr v-for="(v, k) in scalarStats" :key="k">
            <td class="stat-key">{{ formatStatKey(k as string) }}</td>
            <td class="stat-val">{{ formatStatVal(v) }}</td>
          </tr>
        </table>
      </div>

      <div v-if="test.script_path" class="section">
        <h3>Script</h3>
        <code class="script-path">{{ test.script_path }}</code>
      </div>

      <div v-if="test.reproduction_steps" class="section">
        <h3>Reproduction Steps</h3>
        <pre class="repro">{{ test.reproduction_steps }}</pre>
      </div>

      <div v-if="test.data_sources?.length" class="section">
        <h3>Data Sources</h3>
        <ul class="data-sources">
          <li v-for="ds in test.data_sources" :key="ds">{{ ds }}</li>
        </ul>
      </div>
    </div>
    <div v-else>
      <p>Test not found.</p>
      <NuxtLink to="/tests">Back to tests</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const client = useSupabaseClient()

const { data: test } = await useAsyncData(`test-${route.params.slug}`, async () => {
  const { data, error } = await client
    .from('tests')
    .select('*')
    .eq('slug', route.params.slug)
    .single()
  if (error) return null
  return data
})

// Separate prediction verdicts from scalar stats
const predictionVerdicts = computed(() => {
  return test.value?.statistics?.prediction_verdicts || null
})

const scalarStats = computed(() => {
  if (!test.value?.statistics) return null
  const stats = { ...test.value.statistics }
  delete stats.prediction_verdicts
  if (Object.keys(stats).length === 0) return null
  return stats
})

function formatName(name: string): string {
  // Convert snake_case to Title Case
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bV(\d)/g, 'v$1') // Keep v3 lowercase
    .replace(/\bOecd\b/g, 'OECD')
    .replace(/\bBea\b/g, 'BEA')
    .replace(/\bCes\b/g, 'CES')
    .replace(/\bCpi\b/g, 'CPI')
    .replace(/\bDid\b/g, 'DID')
    .replace(/\bImf\b/g, 'IMF')
    .replace(/\bIo\b/g, 'I/O')
    .replace(/\bIes\b/g, 'IES')
    .replace(/\bAic\b/g, 'AIC')
    .replace(/\bOos\b/g, 'OOS')
    .replace(/\bMle\b/g, 'MLE')
    .replace(/\bVri\b/g, 'VRI')
    .replace(/\bMp\b/g, 'MP')
    .replace(/\bR0\b/g, 'R0')
    .replace(/\bDtc\b/g, 'DTC')
    .replace(/\bHo\b/g, 'HO')
}

function formatStatKey(key: string): string {
  return key.replace(/_/g, ' ')
}

function formatStatVal(v: any): string {
  if (Array.isArray(v)) {
    return '[' + v.map(x => typeof x === 'number' ? x.toFixed(4) : x).join(', ') + ']'
  }
  if (typeof v === 'number') {
    // Use fewer decimals for cleaner display
    if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(3)
    if (Number.isInteger(v)) return v.toString()
    return v.toFixed(4)
  }
  return String(v)
}
</script>

<style scoped>
.container { max-width: 860px; margin: 0 auto; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.breadcrumb { font-size: 0.85rem; color: #666; margin-bottom: 1rem; }
.breadcrumb a { color: #0066cc; text-decoration: none; }
.detail-header { margin-bottom: 1.5rem; }
.detail-header h2 { margin: 0 0 0.5rem; font-size: 1.5rem; }
.badges { display: flex; gap: 0.3rem; }
.badge { font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 3px; background: #f0f0f0; color: #555; font-weight: 600; }
.badge.consistent { background: #e6f4ea; color: #1a7f37; }
.badge.ambiguous { background: #fff3cd; color: #856404; }
.badge.inconsistent { background: #f8d7da; color: #842029; }
.badge.pending { background: #f0f0f0; color: #555; }
.badge.paper { background: #e7f0ff; color: #0550ae; }
.section { margin-bottom: 2rem; }
.section h3 { font-size: 0.85rem; color: #666; margin: 0 0 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.verdict-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.verdict-item { display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.6rem; background: #f8f9fb; border-radius: 4px; border: 1px solid #e5e7eb; }
.verdict-label { font-weight: 600; font-size: 0.85rem; color: #334155; }
.verdict-badge { font-size: 0.75rem; padding: 0.15rem 0.4rem; border-radius: 3px; font-weight: 600; }
.verdict-badge.consistent { background: #e6f4ea; color: #1a7f37; }
.verdict-badge.ambiguous { background: #fff3cd; color: #856404; }
.verdict-badge.inconsistent { background: #f8d7da; color: #842029; }
.stats-table { border-collapse: collapse; width: 100%; }
.stats-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #eee; font-size: 0.9rem; }
.stat-key { font-weight: 600; color: #334155; width: 40%; }
.stat-val { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.88rem; color: #1a1a1a; }
.script-path { display: block; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.85rem; background: #f6f8fa; padding: 0.5rem 0.75rem; border-radius: 4px; border: 1px solid #e1e4e8; }
.repro { background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 6px; padding: 1rem; font-size: 0.85rem; overflow-x: auto; line-height: 1.6; }
.data-sources { padding-left: 1.5rem; }
.data-sources li { font-size: 0.9rem; margin: 0.25rem 0; color: #334155; }
</style>
