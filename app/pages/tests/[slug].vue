<template>
  <div class="container--reading">
    <NavHeader />

    <div v-if="test">
      <div class="breadcrumb">
        <NuxtLink to="/tests">Tests</NuxtLink> / {{ test.name }}
      </div>

      <div class="detail-header">
        <h2>{{ formatName(test.name) }}</h2>
        <div class="badges">
          <span class="badge" :class="`badge--${test.status?.toLowerCase()}`">{{ test.status }}</span>
          <span class="badge badge--paper" v-if="test.paper">{{ test.paper }}</span>
        </div>
      </div>

      <div v-if="test.description" class="section">
        <h3>Description</h3>
        <TestDoc :text="test.description" />
      </div>

      <div v-if="predictionVerdicts && Object.keys(predictionVerdicts).length" class="section">
        <h3>Prediction Verdicts</h3>
        <div class="verdict-grid">
          <div v-for="(verdict, label) in predictionVerdicts" :key="label" class="verdict-item">
            <span class="verdict-label">{{ label }}</span>
            <span class="verdict-badge" :class="`verdict-badge--${verdict.toLowerCase()}`">{{ verdict }}</span>
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
      <CommentThread content-type="test" :content-slug="(route.params.slug as string)" />
    </div>
    <div v-else>
      <p>Test not found.</p>
      <NuxtLink to="/tests">Back to tests</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatName } from '~/utils/formatting'

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

function formatStatKey(key: string): string {
  return key.replace(/_/g, ' ')
}

function formatStatVal(v: any): string {
  if (Array.isArray(v)) {
    return '[' + v.map(x => typeof x === 'number' ? x.toFixed(4) : x).join(', ') + ']'
  }
  if (typeof v === 'number') {
    if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(3)
    if (Number.isInteger(v)) return v.toString()
    return v.toFixed(4)
  }
  return String(v)
}
</script>

<style scoped>
.detail-header { margin-bottom: 1.5rem; }
.detail-header h2 { margin: 0 0 0.5rem; font-size: 1.5rem; }
.badges { display: flex; gap: 0.3rem; }
.badge { font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: var(--radius-sm); font-weight: 600; }
.section { margin-bottom: 2rem; }
.section h3 { font-size: 0.85rem; color: var(--color-text-muted); margin: 0 0 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.verdict-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.verdict-item { display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.6rem; background: var(--color-bg-surface-warm); border-radius: 4px; border: 1px solid var(--color-border); }
.verdict-label { font-weight: 600; font-size: 0.85rem; color: var(--color-text-secondary); }
.verdict-badge { font-size: 0.75rem; padding: 0.15rem 0.4rem; border-radius: var(--radius-sm); font-weight: 600; }
.verdict-badge--consistent { background: var(--color-consistent-bg); color: var(--color-consistent-fg); }
.verdict-badge--ambiguous { background: var(--color-ambiguous-bg); color: var(--color-ambiguous-fg); }
.verdict-badge--inconsistent { background: var(--color-inconsistent-bg); color: var(--color-inconsistent-fg); }
.stats-table { border-collapse: collapse; width: 100%; }
.stats-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--color-border-light); font-size: 0.9rem; }
.stat-key { font-weight: 600; color: var(--color-text-secondary); width: 40%; }
.stat-val { font-family: var(--font-mono); font-size: 0.88rem; color: var(--color-text-primary); }
.script-path { display: block; font-family: var(--font-mono); font-size: 0.85rem; background: var(--color-bg-code); padding: 0.5rem 0.75rem; border-radius: 4px; border: 1px solid var(--color-border-medium); }
.repro { background: var(--color-bg-code); border: 1px solid var(--color-border-medium); border-radius: var(--radius-md); padding: 1rem; font-size: 0.85rem; overflow-x: auto; line-height: 1.6; }
.data-sources { padding-left: 1.5rem; }
.data-sources li { font-size: 0.9rem; margin: 0.25rem 0; color: var(--color-text-secondary); }
</style>
