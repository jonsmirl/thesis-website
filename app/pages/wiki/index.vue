<template>
  <div>
    <NavHeader />
    <main class="container">
      <div class="wiki-header">
        <h1>Economics Wiki</h1>
        <p class="subtitle">CES curvature theory explained for economists — interactive demos, cross-linked articles, no login required</p>
        <div class="search-sort-row">
          <div class="search-bar">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search articles..."
              class="search-input"
              aria-label="Search wiki articles"
            />
          </div>
          <button class="sort-toggle" @click="sortByImpact = !sortByImpact" :class="{ active: sortByImpact }">
            {{ sortByImpact ? 'By Impact' : 'A\u2013Z' }}
          </button>
        </div>
      </div>

      <div v-if="searchQuery && searchResults?.length" class="search-results">
        <h2>Search Results</h2>
        <NuxtLink
          v-for="page in searchResults"
          :key="page.slug"
          :to="`/wiki/${page.slug}`"
          class="search-result"
        >
          <span class="result-title"><InlineMath :text="page.title" /></span>
          <span class="result-cat" :style="{ color: categoryColor(page.category_id) }">
            {{ categoryTitle(page.category_id) }}
          </span>
          <p class="result-summary"><InlineMath :text="page.summary" /></p>
        </NuxtLink>
      </div>

      <div v-else-if="searchQuery" class="search-results">
        <p class="no-results">No articles match "{{ searchQuery }}"</p>
      </div>

      <div v-else class="categories-grid">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="category-card"
          :style="{ borderLeftColor: cat.color }"
        >
          <div class="cat-header">
            <span class="cat-icon" v-if="cat.icon">{{ cat.icon }}</span>
            <h2>{{ cat.title }}</h2>
            <span class="cat-count">{{ pageCounts[cat.id] || 0 }}</span>
          </div>
          <p class="cat-desc" v-if="cat.description">{{ cat.description }}</p>
          <table class="cat-table">
            <tbody>
              <tr v-for="page in sortedPages(cat.id)" :key="page.slug">
                <td class="score-col">
                  <span v-if="scoreMap[page.slug]" class="badge" :class="scoreBadgeClass(scoreMap[page.slug])">
                    {{ Math.round(scoreMap[page.slug]) }}
                  </span>
                  <span v-else class="score-empty">&mdash;</span>
                </td>
                <td>
                  <NuxtLink :to="`/wiki/${page.slug}`" class="page-link">
                    <InlineMath :text="page.title" />
                    <span v-if="page.demo_component" class="demo-badge">3D</span>
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const client = useSupabaseClient()

const { data: categories } = await useAsyncData('wiki-categories', async () => {
  const { data, error } = await client
    .from('wiki_categories')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data || []
})

const { data: allPages } = await useAsyncData('wiki-pages-index', async () => {
  const { data, error } = await client
    .from('wiki_pages')
    .select('slug, title, summary, category_id, demo_component')
    .order('title')
  if (error) throw error
  return data || []
})

const { data: allScores } = await useAsyncData('wiki-scores-index', async () => {
  const { data, error } = await client
    .from('wiki_scores')
    .select('wiki_slug, impact_score')
  if (error) return []
  return data || []
})

const scoreMap = computed(() => {
  const map: Record<string, number> = {}
  for (const s of allScores.value || []) {
    map[s.wiki_slug] = s.impact_score
  }
  return map
})

const sortByImpact = ref(false)

function scoreBadgeClass(score: number) {
  if (score >= 80) return 'badge--score-high'
  if (score >= 50) return 'badge--score-medium'
  return 'badge--score-low'
}

function sortedPages(catId: number) {
  const pages = pagesByCategory.value[catId] || []
  if (!sortByImpact.value) return pages
  return [...pages].sort((a, b) => (scoreMap.value[b.slug] || 0) - (scoreMap.value[a.slug] || 0))
}

const pagesByCategory = computed(() => {
  const map: Record<number, any[]> = {}
  for (const p of allPages.value || []) {
    if (!map[p.category_id]) map[p.category_id] = []
    map[p.category_id].push(p)
  }
  return map
})

const pageCounts = computed(() => {
  const counts: Record<number, number> = {}
  for (const p of allPages.value || []) {
    counts[p.category_id] = (counts[p.category_id] || 0) + 1
  }
  return counts
})

function categoryColor(catId: number) {
  return categories.value?.find(c => c.id === catId)?.color || '#666'
}

function categoryTitle(catId: number) {
  return categories.value?.find(c => c.id === catId)?.title || ''
}

// Search
const searchQuery = ref('')
const debouncedQuery = ref('')
let searchTimeout: ReturnType<typeof setTimeout>

watch(searchQuery, (val) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { debouncedQuery.value = val }, 300)
})

const { data: searchResults } = useAsyncData('wiki-search', async () => {
  if (!debouncedQuery.value || debouncedQuery.value.length < 2) return null
  const { data, error } = await client
    .from('wiki_pages')
    .select('slug, title, summary, category_id')
    .textSearch('search_vector', debouncedQuery.value.split(/\s+/).join(' & '), { type: 'plain' })
    .limit(20)
  if (error) throw error
  return data
}, { watch: [debouncedQuery] })

useHead({
  title: 'Economics Wiki — CES Curvature Theory',
  meta: [
    { name: 'description', content: 'Interactive knowledge base explaining CES curvature theory for economists. 123 cross-linked articles with 3D demos.' },
  ],
})
</script>

<style scoped>
.wiki-header {
  margin-bottom: 2rem;
}
.wiki-header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}
.search-sort-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}
.search-bar {
  flex: 1;
}
.search-input {
  width: 100%;
  max-width: 480px;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  outline: none;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}
.search-input:focus { border-color: var(--color-link); }
.sort-toggle {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  color: var(--color-text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}
.sort-toggle:hover { border-color: var(--color-link); color: var(--color-text-primary); }
.sort-toggle.active { border-color: var(--color-link); color: var(--color-link); font-weight: 600; }

.search-results {
  margin-bottom: 2rem;
}
.search-results h2 {
  font-size: 1rem;
  margin: 0 0 0.75rem;
  color: var(--color-text-secondary);
}
.search-result {
  display: block;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  margin-bottom: 0.5rem;
  text-decoration: none;
  color: inherit;
}
.search-result:hover { border-color: var(--color-link); }
.result-title { font-weight: 600; font-size: 0.95rem; }
.result-cat { font-size: 0.8rem; margin-left: 0.5rem; }
.result-summary { margin: 0.25rem 0 0; font-size: 0.85rem; color: var(--color-text-muted); }
.no-results { color: var(--color-text-faint); font-style: italic; }

.categories-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 640px) {
  .categories-grid { grid-template-columns: 1fr 1fr; }
}

.category-card {
  border: 1px solid var(--color-border-light);
  border-left: 4px solid var(--color-text-muted);
  border-radius: var(--radius-lg);
  padding: 1rem 1.25rem;
  background: var(--color-bg-page);
}
.cat-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.cat-icon { font-size: 1.2rem; }
.cat-header h2 { margin: 0; font-size: 1rem; flex: 1; }
.cat-count {
  font-size: 0.75rem;
  background: var(--color-bg-hover);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-lg);
  color: var(--color-text-muted);
}
.cat-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin: 0 0 0.75rem;
}
.cat-table {
  width: 100%;
  border-collapse: collapse;
}
.cat-table td {
  padding: 0.15rem 0;
  vertical-align: middle;
}
.score-col {
  width: 2.5rem;
  text-align: center;
  padding-right: 0.4rem !important;
}
.score-empty {
  font-size: 0.7rem;
  color: var(--color-text-ghost);
}
.page-link {
  font-size: 0.85rem;
  color: var(--color-link);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.page-link:hover { text-decoration: underline; }
.demo-badge {
  font-size: 0.65rem;
  background: var(--color-paper-bg);
  color: var(--color-link);
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
  font-weight: 600;
}
</style>
