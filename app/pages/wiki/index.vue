<template>
  <div>
    <NavHeader />
    <main class="container">
      <div class="wiki-header">
        <h1>Economics Wiki</h1>
        <p class="subtitle">CES curvature theory explained for economists — interactive demos, cross-linked articles, no login required</p>
        <div class="search-bar">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search articles..."
            class="search-input"
          />
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
          <div class="cat-pages">
            <NuxtLink
              v-for="page in pagesByCategory[cat.id]"
              :key="page.slug"
              :to="`/wiki/${page.slug}`"
              class="page-link"
            >
              <InlineMath :text="page.title" />
              <span v-if="page.demo_component" class="demo-badge">3D</span>
            </NuxtLink>
          </div>
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
    { name: 'description', content: 'Interactive knowledge base explaining CES curvature theory for economists. 63 cross-linked articles with 3D demos.' },
  ],
})
</script>

<style scoped>
.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.wiki-header {
  margin-bottom: 2rem;
}
.wiki-header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}
.subtitle {
  color: #555;
  font-size: 0.95rem;
  margin: 0 0 1rem;
}
.search-bar {
  margin-top: 1rem;
}
.search-input {
  width: 100%;
  max-width: 480px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
}
.search-input:focus { border-color: #0066cc; }

.search-results {
  margin-bottom: 2rem;
}
.search-results h2 {
  font-size: 1rem;
  margin: 0 0 0.75rem;
  color: #333;
}
.search-result {
  display: block;
  padding: 0.75rem 1rem;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  text-decoration: none;
  color: inherit;
}
.search-result:hover { border-color: #0066cc; }
.result-title { font-weight: 600; font-size: 0.95rem; }
.result-cat { font-size: 0.8rem; margin-left: 0.5rem; }
.result-summary { margin: 0.25rem 0 0; font-size: 0.85rem; color: #666; }
.no-results { color: #888; font-style: italic; }

.categories-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 640px) {
  .categories-grid { grid-template-columns: 1fr 1fr; }
}

.category-card {
  border: 1px solid #eee;
  border-left: 4px solid #666;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  background: white;
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
  background: #f0f0f0;
  padding: 0.1rem 0.4rem;
  border-radius: 8px;
  color: #666;
}
.cat-desc {
  font-size: 0.85rem;
  color: #666;
  margin: 0 0 0.75rem;
}
.cat-pages {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.page-link {
  font-size: 0.85rem;
  color: #0066cc;
  text-decoration: none;
  padding: 0.15rem 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.page-link:hover { text-decoration: underline; }
.demo-badge {
  font-size: 0.65rem;
  background: #e8f4ff;
  color: #0066cc;
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
  font-weight: 600;
}
</style>
