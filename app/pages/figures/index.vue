<template>
  <div class="container">

    <div class="page-header">
      <h2>Figure Gallery</h2>
      <p class="subtitle">{{ figures?.length || 0 }} figures</p>
    </div>

    <!-- Skeleton loading -->
    <template v-if="!figures">
      <div class="gallery">
        <div v-for="i in 6" :key="i" class="figure-skeleton skeleton" />
      </div>
    </template>

    <template v-else>
      <div class="controls">
        <select v-model="filterCategory" class="filter-select">
          <option value="">All categories</option>
          <option v-for="c in categories" :key="c" :value="c">{{ CATEGORY_LABELS[c] || c }}</option>
        </select>
        <select v-model="filterPaper" class="filter-select">
          <option value="">All papers</option>
          <option v-for="p in papers" :key="p" :value="p">Paper {{ p }}</option>
        </select>
      </div>

      <div class="gallery">
        <NuxtLink
          v-for="fig in filtered"
          :key="fig.id"
          :to="`/figures/${fig.slug}`"
          class="figure-card"
        >
          <div class="figure-img-wrap">
            <img :src="fig.public_url" :alt="fig.title" loading="lazy" />
          </div>
          <div class="figure-info">
            <h3>{{ fig.title }}</h3>
            <div class="badges">
              <span class="badge badge--paper" v-if="fig.paper_number">Paper {{ fig.paper_number }}</span>
              <span class="badge badge--cat" v-if="fig.category">{{ CATEGORY_LABELS[fig.category] || fig.category }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>

      <p v-if="filtered.length === 0" class="empty">No figures match the current filters.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
const client = useSupabaseClient()

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

const filterCategory = ref('')
const filterPaper = ref('')

const { data: figures } = await useAsyncData('figures', async () => {
  const { data, error } = await client
    .from('figures')
    .select('id, slug, title, caption, public_url, category, paper_number')
    .order('paper_number')
    .order('title')
  if (error) throw error
  return data || []
})

const categories = computed(() =>
  [...new Set(figures.value?.map(f => f.category).filter(Boolean))].sort()
)

const papers = computed(() =>
  [...new Set(figures.value?.map(f => f.paper_number).filter(Boolean))].sort((a, b) => a - b)
)

const filtered = computed(() => {
  let result = figures.value || []
  if (filterCategory.value) result = result.filter(f => f.category === filterCategory.value)
  if (filterPaper.value) result = result.filter(f => f.paper_number === Number(filterPaper.value))
  return result
})

useHead({
  title: 'Figure Gallery — CES Framework',
  meta: [{ name: 'description', content: 'Figures from the CES production economics framework' }],
})
</script>

<style scoped>
.controls { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.filter-select { padding: 0.5rem; border: 1px solid var(--color-border-input); border-radius: 4px; font-size: 0.85rem; background: var(--color-bg-page); color: var(--color-text-primary); }

.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.figure-card {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.figure-card:hover {
  border-color: var(--color-link);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.figure-img-wrap {
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--color-bg-code);
  display: flex;
  align-items: center;
  justify-content: center;
}
.figure-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.figure-info {
  padding: 0.75rem;
}
.figure-info h3 {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.4rem;
  line-height: 1.3;
}

.badges { display: flex; gap: 0.25rem; flex-wrap: wrap; }
.badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
}
.badge--paper { background: var(--color-paper-bg, #f0f0ff); color: var(--color-link); }
.badge--cat { background: var(--color-bg-surface-warm); color: var(--color-text-tertiary); }

.empty { color: var(--color-text-faint); font-style: italic; text-align: center; padding: 2rem; }

/* Skeletons */
.figure-skeleton { height: 240px; border-radius: var(--radius-md); }
</style>
