<template>
  <div class="forum-page">
    <NavHeader />
    <main class="forum-container">
      <div class="forum-header">
        <h1>Forum</h1>
        <p class="subtitle">Discuss CES theory, formalization, and empirical methods</p>
      </div>

      <div v-if="loading" class="loading">Loading categories...</div>

      <div v-else class="category-list">
        <div class="category-table-header">
          <span class="col-cat">Category</span>
          <span class="col-topics">Topics</span>
          <span class="col-latest">Latest</span>
        </div>
        <NuxtLink
          v-for="cat in categories"
          :key="cat.id"
          :to="`/forum/${cat.slug}`"
          class="category-row"
        >
          <div class="col-cat">
            <span class="cat-name">{{ cat.name }}</span>
            <span class="cat-desc">{{ cat.description }}</span>
          </div>
          <div class="col-topics">
            <span class="topic-count">{{ cat.topic_count }}</span>
          </div>
          <div class="col-latest">
            <template v-if="cat.latest_topic">
              <span class="latest-title">{{ cat.latest_topic.title }}</span>
              <span class="latest-time">{{ timeAgo(cat.latest_topic.last_activity_at) }}</span>
            </template>
            <span v-else class="no-topics">No topics yet</span>
          </div>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const { fetchCategories } = useForum()

const categories = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    categories.value = await fetchCategories()
  } catch (e) {
    console.error('Failed to load categories:', e)
  } finally {
    loading.value = false
  }
})

function timeAgo(dateStr: string) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

useHead({ title: 'Forum — CES Formalization' })
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
.forum-header {
  margin-bottom: 1.5rem;
}
.forum-header h1 {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.25rem;
}
.subtitle {
  font-size: 0.85rem;
  color: var(--color-text-faint);
  margin: 0;
}
.loading {
  color: var(--color-text-faint);
  font-size: 0.9rem;
  padding: 2rem 0;
}
.category-list {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.category-table-header {
  display: grid;
  grid-template-columns: 1fr 5rem 12rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-faint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.category-row {
  display: grid;
  grid-template-columns: 1fr 5rem 12rem;
  align-items: center;
  padding: 0.75rem;
  text-decoration: none;
  border-bottom: 1px solid var(--color-border-faint);
  transition: background 0.1s;
}
.category-row:last-child { border-bottom: none; }
.category-row:hover { background: var(--color-bg-hover); }
.cat-name {
  display: block;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.3;
}
.cat-desc {
  display: block;
  font-size: 0.78rem;
  color: var(--color-text-faint);
  margin-top: 0.1rem;
  line-height: 1.35;
}
.col-topics {
  text-align: center;
}
.topic-count {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.col-latest {
  padding-left: 0.5rem;
}
.latest-title {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}
.latest-time {
  font-size: 0.7rem;
  color: var(--color-text-placeholder);
}
.no-topics {
  font-size: 0.78rem;
  color: var(--color-text-placeholder);
  font-style: italic;
}

@media (max-width: 640px) {
  .category-table-header { display: none; }
  .category-row {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
  .col-topics, .col-latest { display: none; }
}
</style>
