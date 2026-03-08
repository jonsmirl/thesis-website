<template>
  <div class="container">
    <NavHeader />

    <div v-if="test">
      <div class="breadcrumb">
        <NuxtLink to="/tests">Tests</NuxtLink> / {{ test.name }}
      </div>

      <div class="detail-header">
        <h2>{{ test.name }}</h2>
        <div class="badges">
          <span class="badge" :class="test.status?.toLowerCase()">{{ test.status }}</span>
          <span class="badge paper" v-if="test.paper">{{ test.paper }}</span>
        </div>
      </div>

      <div v-if="test.description" class="section">
        <h3>Description</h3>
        <p>{{ test.description }}</p>
      </div>

      <div v-if="test.statistics && Object.keys(test.statistics).length" class="section">
        <h3>Statistics</h3>
        <table class="stats-table">
          <tr v-for="(v, k) in test.statistics" :key="k">
            <td class="stat-key">{{ k }}</td>
            <td class="stat-val">{{ typeof v === 'number' ? v.toFixed(6) : v }}</td>
          </tr>
        </table>
      </div>

      <div v-if="test.script_path" class="section">
        <h3>Script</h3>
        <code>{{ test.script_path }}</code>
      </div>

      <div v-if="test.reproduction_steps" class="section">
        <h3>Reproduction Steps</h3>
        <pre class="repro">{{ test.reproduction_steps }}</pre>
      </div>

      <div v-if="test.data_sources?.length" class="section">
        <h3>Data Sources</h3>
        <ul>
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
</script>

<style scoped>
.container { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.breadcrumb { font-size: 0.85rem; color: #666; margin-bottom: 1rem; }
.breadcrumb a { color: #0066cc; text-decoration: none; }
.detail-header { margin-bottom: 1.5rem; }
.detail-header h2 { margin: 0 0 0.5rem; }
.badges { display: flex; gap: 0.25rem; }
.badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 3px; background: #f0f0f0; color: #555; }
.badge.consistent { background: #e6f4ea; color: #1a7f37; }
.badge.ambiguous { background: #fff3cd; color: #856404; }
.badge.inconsistent { background: #f8d7da; color: #842029; }
.badge.pending { background: #f0f0f0; color: #555; }
.badge.paper { background: #e7f0ff; color: #0550ae; }
.section { margin-bottom: 1.5rem; }
.section h3 { font-size: 0.9rem; color: #666; margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
.stats-table { border-collapse: collapse; width: 100%; }
.stats-table td { padding: 0.4rem 0.75rem; border-bottom: 1px solid #eee; font-size: 0.9rem; }
.stat-key { font-weight: 600; font-family: monospace; width: 40%; }
.stat-val { font-family: monospace; }
.repro { background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 6px; padding: 1rem; font-size: 0.85rem; overflow-x: auto; }
</style>
