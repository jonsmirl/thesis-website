<template>
  <div>
    <NavHeader />
    <main class="container" v-if="paper">
      <nav class="breadcrumb">
        <NuxtLink to="/papers">Papers</NuxtLink>
        <span class="sep">/</span>
        <span v-if="paper.paper_number">Paper {{ paper.paper_number }}</span>
        <span v-else>{{ paper.title }}</span>
      </nav>

      <div class="paper-layout" :class="{ 'toc-collapsed': tocCollapsed }">
        <!-- Left sidebar: TOC -->
        <aside class="toc-sidebar" v-if="tocItems.length">
          <button class="toc-toggle" @click="tocCollapsed = !tocCollapsed" :title="tocCollapsed ? 'Show table of contents' : 'Hide table of contents'">
            {{ tocCollapsed ? '\u25B6' : '\u25C0' }}
          </button>
          <nav class="toc-nav" v-show="!tocCollapsed">
            <h3 class="toc-heading">Contents</h3>
            <ul class="toc-list">
              <li v-for="item in tocItems" :key="item.id" :class="`toc-level-${item.level}`">
                <a :href="`#${item.id}`" :class="{ active: activeSection === item.id }">{{ item.num }} {{ item.title }}</a>
              </li>
            </ul>
          </nav>
        </aside>

        <!-- Center: Article -->
        <article class="paper-article">
          <header class="paper-header">
            <h1>{{ paper.title }}</h1>
            <div class="paper-meta">
              <span v-if="paper.paper_number" class="badge badge--paper">Paper {{ paper.paper_number }}</span>
              <span v-if="paper.status" class="badge" :class="`badge--${paper.status}`">{{ paper.status }}</span>
              <span v-if="paper.target_journal" class="badge badge--journal">{{ paper.target_journal }}</span>
            </div>
            <div class="paper-authors" v-if="paper.authors?.length">
              {{ paper.authors.join(', ') }}
              <span v-if="paper.date" class="paper-date">&mdash; {{ formatDate(paper.date) }}</span>
            </div>
            <div v-if="paper.abstract" class="paper-abstract">
              <strong>Abstract.</strong> {{ paper.abstract }}
            </div>
          </header>

          <!-- Native article body -->
          <div v-if="paper.body_md">
            <PaperDoc :text="paper.body_md" :bibliography="paper.bibliography || []" />
          </div>

          <!-- Fallback: iframe for legacy papers -->
          <div v-else-if="paper.number" class="legacy-section">
            <iframe
              :src="`/papers/paper-${paper.number.toLowerCase()}.html`"
              class="paper-frame"
              frameborder="0"
            />
          </div>

          <CommentThread content-type="paper" :content-slug="slug" />
        </article>

        <!-- Right sidebar: Related content -->
        <aside class="related-sidebar" v-if="hasRelated || paper.body_md">
          <div v-if="paper.body_md && paper.target_journal !== 'Introductory'" class="related-block">
            <a :href="`/papers/pdf/${slug}.pdf`" class="pdf-btn" download>PDF Download</a>
          </div>

          <div v-if="relatedWiki?.length" class="related-block">
            <h3>Related Wiki Articles</h3>
            <NuxtLink
              v-for="wp in relatedWiki"
              :key="wp.slug"
              :to="`/wiki/${wp.slug}`"
              class="related-link wiki"
            >{{ wp.title }}</NuxtLink>
          </div>

          <div v-if="paper.related_theorem_names?.length" class="related-block">
            <h3>Lean Theorems</h3>
            <NuxtLink
              v-for="name in paper.related_theorem_names"
              :key="name"
              :to="`/theorems/${name}`"
              class="related-link theorem"
            >{{ name.replace(/_/g, ' ') }}</NuxtLink>
          </div>

          <div v-if="relatedTests?.length" class="related-block">
            <h3>Empirical Tests</h3>
            <div v-for="t in relatedTests" :key="t.slug" class="test-card">
              <NuxtLink :to="`/tests/${t.slug}`" class="test-name">{{ formatName(t.name) }}</NuxtLink>
              <span class="badge" :class="`badge--${t.status?.toLowerCase()}`">{{ t.status }}</span>
              <NuxtLink v-if="t.figure" :to="`/figures/${t.figure.slug}`" class="test-thumb">
                <img :src="t.figure.public_url" :alt="t.figure.title" loading="lazy" />
              </NuxtLink>
            </div>
          </div>
        </aside>
      </div>
    </main>
    <main class="container" v-else>
      <p class="not-found">Paper not found.</p>
      <NuxtLink to="/papers">Back to papers</NuxtLink>
    </main>
  </div>
</template>

<script setup lang="ts">
import { formatName } from '~/utils/formatting'

const route = useRoute()
const client = useSupabaseClient()
const slug = route.params.slug as string

const tocCollapsed = ref(false)
const activeSection = ref('')

// Check screen size for default TOC state
onMounted(() => {
  if (window.innerWidth < 1024) {
    tocCollapsed.value = true
  }

  // Scrollspy for TOC
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        activeSection.value = entry.target.id
      }
    }
  }, { rootMargin: '-80px 0px -70% 0px' })

  nextTick(() => {
    document.querySelectorAll('.paper-article h2[id], .paper-article h3[id]').forEach(el => {
      observer.observe(el)
    })
  })
})

const { data: paper } = await useAsyncData(`paper-${slug}`, async () => {
  const { data, error } = await client
    .from('papers')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) return null
  return data
})

// Parse TOC from paper.toc or extract from body
const tocItems = computed(() => {
  if (paper.value?.toc?.length) return paper.value.toc
  // Fallback: extract from body_md
  if (!paper.value?.body_md) return []
  const items: Array<{ id: string; title: string; level: number; num: string }> = []
  const counters = [0, 0, 0]
  paper.value.body_md.replace(/^(#{2,4}) (.+)$/gm, (_m: string, hashes: string, title: string) => {
    const level = hashes.length
    if (level === 2) { counters[0]++; counters[1] = 0; counters[2] = 0 }
    else if (level === 3) { counters[1]++; counters[2] = 0 }
    else { counters[2]++ }
    const num = level === 2 ? `${counters[0]}`
      : level === 3 ? `${counters[0]}.${counters[1]}`
      : `${counters[0]}.${counters[1]}.${counters[2]}`
    items.push({ id: `sec-${num.replace(/\./g, '-')}`, title, level, num: `${num}.` })
    return ''
  })
  return items
})

// Fetch related wiki pages
const { data: relatedWiki } = await useAsyncData(`paper-wiki-${slug}`, async () => {
  const slugs = paper.value?.related_wiki_slugs
  if (!slugs?.length) return []
  const { data } = await client
    .from('wiki_pages')
    .select('slug, title')
    .in('slug', slugs)
  return data || []
})

// Fetch related tests with figures
const { data: relatedTests } = await useAsyncData(`paper-tests-${slug}`, async () => {
  const testSlugs = paper.value?.related_test_slugs
  if (!testSlugs?.length) return []
  const { data: tests } = await client
    .from('tests')
    .select('slug, name, status')
    .in('slug', testSlugs)
  if (!tests?.length) return []
  const enriched = await Promise.all(tests.map(async (t: any) => {
    const { data: figs } = await client
      .from('figure_tests')
      .select('figure_id, figures(slug, title, public_url)')
      .eq('test_slug', t.slug)
      .order('sort_order')
      .limit(1)
    const figure = figs?.[0]?.figures || null
    return { ...t, figure }
  }))
  return enriched
})

const hasRelated = computed(() => {
  return (relatedWiki.value?.length || 0) > 0 ||
    (paper.value?.related_theorem_names?.length || 0) > 0 ||
    (relatedTests.value?.length || 0) > 0
})

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

useHead({
  title: computed(() => paper.value ? `${paper.value.title} — CES Proofs` : 'Not Found'),
  meta: [
    { name: 'description', content: computed(() => paper.value?.abstract || '') },
  ],
})
</script>

<style scoped>
.sep { margin: 0 0.35rem; color: var(--color-text-placeholder); }

.paper-layout {
  display: grid;
  grid-template-columns: 220px 1fr 240px;
  gap: 2rem;
  align-items: start;
}
.paper-layout.toc-collapsed {
  grid-template-columns: 32px 1fr 240px;
}

/* TOC Sidebar */
.toc-sidebar {
  position: sticky;
  top: 4rem;
}
.toc-toggle {
  position: absolute;
  top: 0;
  right: 0;
  background: none;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 0.15rem 0.35rem;
  font-size: 0.7rem;
  color: var(--color-text-muted);
}
.toc-toggle:hover { background: var(--color-bg-hover); }
.toc-heading {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 0.5rem;
}
.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.toc-list li { margin-bottom: 0.2rem; }
.toc-list a {
  display: block;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: 0.15rem 0.4rem;
  border-radius: var(--radius-sm);
  line-height: 1.35;
}
.toc-list a:hover { background: var(--color-bg-hover); }
.toc-list a.active {
  color: var(--color-link);
  background: rgba(59, 130, 246, 0.08);
  font-weight: 500;
}
.toc-level-3 { padding-left: 0.75rem; }
.toc-level-4 { padding-left: 1.5rem; }

/* Article */
.paper-header { margin-bottom: 2rem; }
.paper-header h1 { margin: 0 0 0.5rem; font-size: 1.6rem; line-height: 1.3; }
.paper-meta {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.badge--draft { background: var(--color-bg-hover); color: var(--color-text-muted); }
.badge--published { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.badge--journal { background: var(--color-bg-hover); color: var(--color-text-tertiary); font-style: italic; }
.paper-authors {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
}
.paper-date { color: var(--color-text-muted); }
.paper-abstract {
  font-family: var(--font-serif);
  font-size: 0.93rem;
  line-height: 1.65;
  color: var(--color-text-secondary);
  padding: 0.75rem 1rem;
  background: var(--color-bg-code);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-border-medium);
}

/* Legacy iframe */
.legacy-section { margin-top: 1.5rem; }
.paper-frame { width: 100%; height: 80vh; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); }

/* Right sidebar */
.related-sidebar {
  position: sticky;
  top: 4rem;
  font-size: 0.85rem;
}
.related-block { margin-bottom: 1.25rem; }
.related-block h3 {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 0.4rem;
}
.related-link {
  display: block;
  font-size: 0.83rem;
  color: var(--color-link);
  text-decoration: none;
  margin-bottom: 0.25rem;
  padding: 0.15rem 0;
}
.related-link:hover { text-decoration: underline; }
.related-link.theorem { color: var(--color-axiom-accent); }
.related-link.wiki { color: var(--color-link); }

.test-card {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.test-name {
  color: var(--color-success);
  text-decoration: none;
  font-size: 0.83rem;
}
.test-name:hover { text-decoration: underline; }
.test-thumb { display: block; width: 60px; }
.test-thumb img {
  width: 100%;
  aspect-ratio: 16/10;
  object-fit: contain;
  background: var(--color-bg-code);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
}

.pdf-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: #fff;
  background: var(--color-link);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: opacity 0.15s;
}
.pdf-btn:hover { opacity: 0.85; }

.not-found { color: var(--color-text-faint); font-style: italic; }

/* Responsive */
@media (max-width: 1280px) {
  .paper-layout {
    grid-template-columns: 200px 1fr;
  }
  .related-sidebar {
    position: static;
    grid-column: 1 / -1;
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border-light);
    margin-top: 2rem;
  }
}
@media (max-width: 1024px) {
  .paper-layout, .paper-layout.toc-collapsed {
    grid-template-columns: 1fr;
  }
  .toc-sidebar {
    position: static;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border-light);
  }
}
</style>
