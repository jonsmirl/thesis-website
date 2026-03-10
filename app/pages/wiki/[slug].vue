<template>
  <div>
    <NavHeader />
    <main class="container" v-if="page">
      <nav class="breadcrumb">
        <NuxtLink to="/wiki">Wiki</NuxtLink>
        <span class="sep">/</span>
        <NuxtLink v-if="category" :to="`/wiki#${category.slug}`">{{ category.title }}</NuxtLink>
        <span class="sep" v-if="category">/</span>
        <span>{{ page.title }}</span>
      </nav>

      <article class="wiki-article">
        <header>
          <h1><InlineMath :text="page.title" /></h1>
          <p class="summary"><InlineMath :text="page.summary" /></p>
          <div class="meta">
            <span class="cat-badge" v-if="category" :style="{ background: category.color + '20', color: category.color, borderColor: category.color }">
              {{ category.title }}
            </span>
            <span class="demo-indicator" v-if="page.demo_component">Interactive Demo</span>
          </div>
        </header>

        <div v-if="page.demo_component" class="demo-section">
          <DemoLoader :name="page.demo_component" :config="page.demo_config" />
        </div>

        <WikiDoc :text="page.body_md" />

        <div v-if="wikiFigures?.length" class="wiki-figures">
          <h3>Figures</h3>
          <div class="figure-grid">
            <NuxtLink v-for="fig in wikiFigures" :key="fig.slug" :to="`/figures/${fig.slug}`" class="figure-thumb">
              <img :src="fig.public_url" :alt="fig.title" loading="lazy" />
              <span class="figure-thumb-title">{{ fig.title }}</span>
            </NuxtLink>
          </div>
        </div>

        <aside class="sidebar" v-if="hasRelated">
          <div v-if="relatedPages?.length" class="related-block">
            <h3>Related Articles</h3>
            <NuxtLink
              v-for="rp in relatedPages"
              :key="rp.slug"
              :to="`/wiki/${rp.slug}`"
              class="related-link"
            >{{ rp.title }}</NuxtLink>
          </div>

          <div v-if="page.related_theorem_names?.length" class="related-block">
            <h3>Lean Theorems</h3>
            <NuxtLink
              v-for="name in page.related_theorem_names"
              :key="name"
              :to="`/theorems/${name}`"
              class="related-link theorem"
            >{{ name }}</NuxtLink>
          </div>

          <div v-if="page.related_test_slugs?.length" class="related-block">
            <h3>Empirical Tests</h3>
            <NuxtLink
              v-for="slug in page.related_test_slugs"
              :key="slug"
              :to="`/tests/${slug}`"
              class="related-link test"
            >{{ slug }}</NuxtLink>
          </div>

          <div v-if="page.related_paper_slugs?.length" class="related-block">
            <h3>Papers</h3>
            <NuxtLink
              v-for="slug in page.related_paper_slugs"
              :key="slug"
              :to="`/papers/${slug}`"
              class="related-link paper"
            >{{ slug }}</NuxtLink>
          </div>
        </aside>

        <CommentThread content-type="wiki" :content-slug="slug" />
      </article>
    </main>
    <main class="container" v-else>
      <p class="not-found">Article not found.</p>
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const client = useSupabaseClient()
const slug = route.params.slug as string

const { data: page } = await useAsyncData(`wiki-page-${slug}`, async () => {
  const { data, error } = await client
    .from('wiki_pages')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) return null
  return data
})

const { data: category } = await useAsyncData(`wiki-cat-${slug}`, async () => {
  if (!page.value?.category_id) return null
  const { data, error } = await client
    .from('wiki_categories')
    .select('*')
    .eq('id', page.value.category_id)
    .single()
  if (error) return null
  return data
})

const { data: wikiFigures } = await useAsyncData(`wiki-figures-${slug}`, async () => {
  const { data } = await client
    .from('figure_wiki_pages')
    .select('figure_id, figures(slug, title, public_url)')
    .eq('wiki_slug', slug)
    .order('sort_order')
  return data?.map((fw: any) => fw.figures).filter(Boolean) || []
})

const { data: relatedPages } = await useAsyncData(`wiki-related-${slug}`, async () => {
  if (!page.value?.related_pages?.length) return []
  const { data, error } = await client
    .from('wiki_pages')
    .select('slug, title')
    .in('slug', page.value.related_pages)
  if (error) return []
  return data
})

const hasRelated = computed(() => {
  return (relatedPages.value?.length || 0) > 0 ||
    (page.value?.related_theorem_names?.length || 0) > 0 ||
    (page.value?.related_test_slugs?.length || 0) > 0 ||
    (page.value?.related_paper_slugs?.length || 0) > 0
})

useHead({
  title: computed(() => page.value ? `${page.value.title} — CES Wiki` : 'Not Found — CES Wiki'),
  meta: [
    { name: 'description', content: computed(() => page.value?.summary || '') },
  ],
})
</script>

<style scoped>
.sep { margin: 0 0.35rem; color: var(--color-text-placeholder); }

.wiki-article header { margin-bottom: 1.5rem; }
.wiki-article h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
.summary { color: var(--color-text-tertiary); font-size: 0.95rem; margin: 0 0 0.75rem; line-height: 1.5; }
.meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.cat-badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  border: 1px solid;
  font-weight: 500;
}
.demo-indicator {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  background: var(--color-paper-bg);
  color: var(--color-link);
  font-weight: 600;
}

.demo-section {
  margin: 1.5rem 0;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  min-height: 300px;
}

.sidebar {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border-light);
}
.related-block {
  margin-bottom: 1.25rem;
}
.related-block h3 {
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
  margin: 0 0 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.related-link {
  display: inline-block;
  font-size: 0.85rem;
  color: var(--color-link);
  text-decoration: none;
  margin-right: 0.75rem;
  margin-bottom: 0.3rem;
}
.related-link:hover { text-decoration: underline; }
.related-link.theorem { color: var(--color-axiom-accent); }
.related-link.test { color: var(--color-success); }
.related-link.paper { color: var(--color-warning); }

.not-found { color: var(--color-text-faint); font-style: italic; }
.wiki-figures { margin: 2rem 0; }
.wiki-figures h3 { font-size: 0.85rem; color: var(--color-text-tertiary); margin: 0 0 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; }
.figure-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
.figure-thumb { display: block; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); overflow: hidden; text-decoration: none; color: inherit; transition: border-color 0.15s; }
.figure-thumb:hover { border-color: var(--color-link); }
.figure-thumb img { width: 100%; aspect-ratio: 16/10; object-fit: contain; background: var(--color-bg-code); }
.figure-thumb-title { display: block; padding: 0.4rem 0.6rem; font-size: 0.8rem; font-weight: 500; color: var(--color-text-secondary); }
</style>
