<template>
  <div class="container--reading">
    <NavHeader />

    <div v-if="figure">
      <div class="breadcrumb">
        <NuxtLink to="/figures">Figures</NuxtLink> / {{ figure.title }}
      </div>

      <div class="detail-header">
        <h2>{{ figure.title }}</h2>
        <div class="badges">
          <span class="badge badge--paper" v-if="figure.paper_number">Paper {{ figure.paper_number }}</span>
          <span class="badge badge--cat" v-if="figure.category">{{ CATEGORY_LABELS[figure.category] || figure.category }}</span>
        </div>
      </div>

      <div class="figure-display">
        <img :src="figure.public_url" :alt="figure.title" />
      </div>

      <div v-if="figure.caption" class="section">
        <p class="caption">{{ figure.caption }}</p>
      </div>

      <div v-if="figure.source_script" class="section">
        <h3>Source</h3>
        <code class="script-path">{{ figure.source_script }}</code>
        <div v-if="figure.generation_command" class="repro-cmd">
          <code>{{ figure.generation_command }}</code>
        </div>
      </div>

      <div v-if="figure.generation_code" class="section">
        <h3>
          <button class="collapse-toggle" @click="showCode = !showCode">
            {{ showCode ? '&#9662;' : '&#9656;' }} Generation Code
          </button>
        </h3>
        <PythonHighlight v-if="showCode" :code="figure.generation_code" />
      </div>

      <div v-if="figure.data_sources?.length" class="section">
        <h3>Data Sources</h3>
        <ul class="data-sources">
          <li v-for="ds in figure.data_sources" :key="ds">{{ ds }}</li>
        </ul>
      </div>

      <div v-if="linkedTests?.length" class="section">
        <h3>Linked Tests</h3>
        <div class="link-list">
          <NuxtLink v-for="t in linkedTests" :key="t.test_slug" :to="`/tests/${t.test_slug}`" class="link-chip link-chip--test">
            {{ t.test_slug }}
          </NuxtLink>
        </div>
      </div>

      <div v-if="linkedWiki?.length" class="section">
        <h3>Wiki Articles</h3>
        <div class="link-list">
          <NuxtLink v-for="w in linkedWiki" :key="w.wiki_slug" :to="`/wiki/${w.wiki_slug}`" class="link-chip link-chip--wiki">
            {{ w.wiki_slug }}
          </NuxtLink>
        </div>
      </div>

      <div v-if="linkedTheorems?.length" class="section">
        <h3>Lean Theorems</h3>
        <div class="link-list">
          <NuxtLink v-for="th in linkedTheorems" :key="th.theorem_name" :to="`/theorems/${th.theorem_name}`" class="link-chip link-chip--theorem">
            {{ th.theorem_name }}
          </NuxtLink>
        </div>
      </div>

      <div class="meta-bar">
        <span v-if="figure.width && figure.height">{{ figure.width }} x {{ figure.height }}px</span>
        <span v-if="figure.file_size">{{ (figure.file_size / 1024).toFixed(0) }} KB</span>
      </div>
    </div>

    <div v-else>
      <p>Figure not found.</p>
      <NuxtLink to="/figures">Back to gallery</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
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

const showCode = ref(false)
const route = useRoute()
const client = useSupabaseClient()
const slug = route.params.slug as string

const { data: figure } = await useAsyncData(`figure-${slug}`, async () => {
  const { data, error } = await client
    .from('figures')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) return null
  return data
})

const { data: linkedTests } = await useAsyncData(`figure-tests-${slug}`, async () => {
  if (!figure.value) return []
  const { data } = await client
    .from('figure_tests')
    .select('test_slug, sort_order')
    .eq('figure_id', figure.value.id)
    .order('sort_order')
  return data || []
})

const { data: linkedWiki } = await useAsyncData(`figure-wiki-${slug}`, async () => {
  if (!figure.value) return []
  const { data } = await client
    .from('figure_wiki_pages')
    .select('wiki_slug, sort_order')
    .eq('figure_id', figure.value.id)
    .order('sort_order')
  return data || []
})

const { data: linkedTheorems } = await useAsyncData(`figure-theorems-${slug}`, async () => {
  if (!figure.value) return []
  const { data } = await client
    .from('figure_theorems')
    .select('theorem_name, sort_order')
    .eq('figure_id', figure.value.id)
    .order('sort_order')
  return data || []
})

useHead({
  title: computed(() => figure.value ? `${figure.value.title} — CES Figures` : 'Not Found'),
  meta: [
    { name: 'description', content: computed(() => figure.value?.caption || '') },
  ],
})
</script>

<style scoped>
.detail-header { margin-bottom: 1.5rem; }
.detail-header h2 { margin: 0 0 0.5rem; font-size: 1.5rem; }
.badges { display: flex; gap: 0.3rem; }
.badge { font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: var(--radius-sm); font-weight: 600; }
.badge--paper { background: var(--color-paper-bg, #f0f0ff); color: var(--color-link); }
.badge--cat { background: var(--color-bg-surface-warm); color: var(--color-text-tertiary); }

.figure-display {
  margin: 1rem 0 1.5rem;
  text-align: center;
  background: var(--color-bg-code);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: 1rem;
}
.figure-display img {
  max-width: 100%;
  height: auto;
}

.caption {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.section { margin-bottom: 2rem; }
.section h3 { font-size: 0.85rem; color: var(--color-text-muted); margin: 0 0 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }

.script-path { display: block; font-family: var(--font-mono); font-size: 0.85rem; background: var(--color-bg-code); padding: 0.5rem 0.75rem; border-radius: 4px; border: 1px solid var(--color-border-medium); }
.repro-cmd { margin-top: 0.5rem; }
.repro-cmd code { display: block; font-family: var(--font-mono); font-size: 0.85rem; background: var(--color-bg-code); padding: 0.5rem 0.75rem; border-radius: 4px; border: 1px solid var(--color-border-medium); color: var(--color-text-secondary); }

.collapse-toggle { background: none; border: none; cursor: pointer; font: inherit; color: inherit; padding: 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; color: var(--color-text-muted); }
.collapse-toggle:hover { color: var(--color-text-primary); }

.data-sources { padding-left: 1.5rem; }
.data-sources li { font-size: 0.9rem; margin: 0.25rem 0; color: var(--color-text-secondary); }

.link-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.link-chip {
  display: inline-block;
  font-size: 0.85rem;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  font-weight: 500;
}
.link-chip:hover { text-decoration: underline; }
.link-chip--test { background: var(--color-consistent-bg); color: var(--color-success, #16a34a); }
.link-chip--wiki { background: var(--color-bg-surface-warm); color: var(--color-link); }
.link-chip--theorem { background: var(--color-paper-bg, #f0f0ff); color: var(--color-axiom-accent, #7c3aed); }

.meta-bar {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--color-text-ghost);
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-light);
}
</style>
