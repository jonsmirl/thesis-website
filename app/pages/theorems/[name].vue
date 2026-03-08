<template>
  <div class="container">
    <NavHeader />

    <div v-if="theorem">
      <div class="breadcrumb">
        <NuxtLink to="/theorems">Theorems</NuxtLink> / {{ theorem.name }}
      </div>

      <div class="detail-header">
        <h2>{{ theorem.display_name || theorem.name }}</h2>
        <div class="badges">
          <span class="badge kind">{{ theorem.kind }}</span>
          <span class="badge" :class="theorem.status">{{ theorem.status }}</span>
          <span class="badge paper" v-if="theorem.paper">{{ theorem.paper }}</span>
        </div>
      </div>

      <div v-if="theorem.docstring" class="section">
        <h3>Documentation</h3>
        <p class="docstring">{{ theorem.docstring }}</p>
      </div>

      <div v-if="theorem.source_code" class="section">
        <h3>Source</h3>
        <pre class="source-code">{{ theorem.source_code }}</pre>
      </div>

      <div class="section">
        <h3>Location</h3>
        <p class="meta">
          <code>{{ theorem.file_path }}</code>
          <span v-if="theorem.line_number"> line {{ theorem.line_number }}</span>
        </p>
      </div>

      <div v-if="theorem.section" class="section">
        <h3>Section</h3>
        <p>{{ theorem.section }}</p>
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
    .select('*')
    .eq('name', route.params.name)
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
.detail-header h2 { margin: 0 0 0.5rem; font-family: 'SF Mono', 'Fira Code', monospace; }
.badges { display: flex; gap: 0.25rem; }
.badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 3px; background: #f0f0f0; color: #555; }
.badge.proved { background: #e6f4ea; color: #1a7f37; }
.badge.sorry { background: #fff3cd; color: #856404; }
.badge.axiom { background: #e8d5f5; color: #6f42c1; }
.badge.trivial { background: #d1ecf1; color: #0c5460; }
.badge.paper { background: #e7f0ff; color: #0550ae; }
.section { margin-bottom: 1.5rem; }
.section h3 { font-size: 0.9rem; color: #666; margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
.docstring { margin: 0; line-height: 1.6; white-space: pre-wrap; }
.source-code { background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 6px; padding: 1rem; font-size: 0.85rem; overflow-x: auto; line-height: 1.5; font-family: 'SF Mono', 'Fira Code', monospace; }
.meta { font-size: 0.9rem; }
.meta code { background: #f6f8fa; padding: 0.15rem 0.4rem; border-radius: 3px; }
</style>
