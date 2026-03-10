<template>
  <div class="forum-page">
    <NavHeader />
    <main class="forum-container">
      <ForumBreadcrumb :category-slug="categorySlug" :category-name="categoryName" />

      <div class="topic-header">
        <h1>{{ categoryName }}</h1>
        <NuxtLink v-if="user" :to="`/forum/${categorySlug}/new`" class="btn-new">
          New Topic
        </NuxtLink>
      </div>

      <div class="sort-bar">
        <button
          v-for="s in sorts"
          :key="s.key"
          class="sort-tab"
          :class="{ active: sort === s.key }"
          @click="changeSort(s.key)"
        >{{ s.label }}</button>
        <span class="topic-total" v-if="total">{{ total }} topics</span>
      </div>

      <div v-if="loading" class="loading">Loading topics...</div>

      <div v-else-if="topics.length === 0" class="empty">
        No topics yet.
        <NuxtLink v-if="user" :to="`/forum/${categorySlug}/new`">Start the first discussion.</NuxtLink>
      </div>

      <div v-else class="topic-list">
        <ForumTopicCard
          v-for="t in topics"
          :key="t.id"
          :topic="t"
          :category-slug="categorySlug"
        />
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button :disabled="page <= 1" @click="goPage(page - 1)">Prev</button>
        <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
        <button :disabled="page >= totalPages" @click="goPage(page + 1)">Next</button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const user = useSupabaseUser()
const { fetchTopics, fetchCategories } = useForum()

const categorySlug = computed(() => route.params.category as string)
const categoryName = ref('')
const topics = ref<any[]>([])
const total = ref(0)
const loading = ref(true)
const sort = ref<'active' | 'newest' | 'top'>('active')
const page = ref(1)
const limit = 25
const totalPages = computed(() => Math.ceil(total.value / limit))

const sorts = [
  { key: 'active' as const, label: 'Active' },
  { key: 'newest' as const, label: 'Newest' },
  { key: 'top' as const, label: 'Top' },
]

async function loadTopics() {
  loading.value = true
  try {
    const result = await fetchTopics(categorySlug.value, { sort: sort.value, page: page.value, limit })
    topics.value = result.topics
    total.value = result.total
  } catch (e) {
    console.error('Failed to load topics:', e)
  } finally {
    loading.value = false
  }
}

function changeSort(s: 'active' | 'newest' | 'top') {
  sort.value = s
  page.value = 1
  loadTopics()
}

function goPage(p: number) {
  page.value = p
  loadTopics()
}

onMounted(async () => {
  // Resolve category name
  try {
    const cats = await fetchCategories()
    const cat = cats.find((c: any) => c.slug === categorySlug.value)
    if (cat) categoryName.value = cat.name
  } catch {}
  await loadTopics()
})

useHead({ title: computed(() => `${categoryName.value || 'Forum'} — CES Formalization`) })
</script>

<style scoped>
.forum-page {
  min-height: 100vh;
  background: var(--color-bg-page);
  font-family: var(--font-sans);
}
.forum-container {
  max-width: var(--container-width);
  margin: 0 auto;
  padding: 1.5rem var(--container-padding);
}
.topic-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.topic-header h1 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}
.btn-new {
  padding: 0.4rem 0.85rem;
  background: var(--color-btn-accent);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 0.82rem;
  font-weight: 500;
  text-decoration: none;
  font-family: var(--font-sans);
}
.btn-new:hover { background: var(--color-btn-accent-hover); }
.sort-bar {
  display: flex;
  align-items: center;
  gap: 0;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 0;
}
.sort-tab {
  background: none;
  border: none;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  font-family: var(--font-sans);
  color: var(--color-text-faint);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.sort-tab:hover { color: var(--color-text-tertiary); }
.sort-tab.active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-text-primary);
}
.topic-total {
  margin-left: auto;
  font-size: 0.72rem;
  color: var(--color-text-placeholder);
}
.loading, .empty {
  color: var(--color-text-faint);
  font-size: 0.9rem;
  padding: 2rem 0;
}
.empty a {
  color: var(--color-link);
}
.topic-list {
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  font-size: 0.82rem;
}
.pagination button {
  padding: 0.3rem 0.7rem;
  background: none;
  border: 1px solid var(--color-border-input);
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
  font-family: var(--font-sans);
}
.pagination button:hover:not(:disabled) { background: var(--color-bg-hover); }
.pagination button:disabled { opacity: 0.4; cursor: default; }
.page-info { color: var(--color-text-faint); }
</style>
