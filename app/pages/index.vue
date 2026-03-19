<script setup lang="ts">
import { marked } from 'marked'

const loading = ref(false)
const result = ref<any>(null)
const error = ref('')

const client = useSupabaseClient()

const renderedHtml = computed(() => {
  if (!result.value?.markdown) return ''
  return marked.parse(result.value.markdown) as string
})

async function handleQuery(query: string) {
  loading.value = true
  error.value = ''
  result.value = null

  try {
    const { data, error: fnError } = await client.functions.invoke('preprocess-query', {
      body: { query },
    })

    if (fnError) {
      error.value = fnError.message || 'Edge function error'
      return
    }

    if (data?.gibberish) {
      error.value = 'That doesn\'t look like a search query. Try something else.'
      return
    }

    result.value = data
  } catch (e: any) {
    error.value = e?.message || 'Query failed'
  } finally {
    loading.value = false
  }
}

function handleFollowUp(query: string) {
  handleQuery(query)
}
</script>

<template>
  <div class="page">
    <!-- Hero -->
    <div v-if="!result && !loading && !error" class="hero">
      <div class="hero-glow" />
      <h1 class="hero-title">
        <span class="hero-ces">ces</span><span class="hero-accent">Claw</span>
      </h1>
      <p class="hero-sub">No install. No API keys. Just ask.</p>
      <p class="hero-status">
        <span class="status-dot status-dot--ready" />
        Gemini Flash Lite
      </p>
    </div>

    <!-- Article result -->
    <div v-else-if="result" class="result-view">
      <article class="entry">
        <div class="entry-query">
          <span class="entry-query-icon">&#x2192;</span>
          {{ result.query }}
        </div>

        <!-- Disambiguation meanings -->
        <div v-if="result.ambiguous && result.meanings?.length" class="meanings">
          <div v-for="(m, i) in result.meanings" :key="i" class="meaning-row">
            <button class="meaning-topic" @click="handleFollowUp(m.topic)">{{ m.topic }}</button>
            <span class="meaning-desc">{{ m.description }}</span>
          </div>
        </div>

        <!-- Article content -->
        <div v-if="renderedHtml" class="entry-content" v-html="renderedHtml" />

        <!-- Follow-ups -->
        <div v-if="result.follow_ups?.length" class="entry-followups">
          <button
            v-for="followUp in result.follow_ups"
            :key="followUp"
            class="followup-chip"
            @click="handleFollowUp(followUp)"
          >
            {{ followUp }}
          </button>
        </div>

        <div class="entry-meta">
          {{ result.generated_by }} &middot; {{ new Date(result.timestamp).toLocaleString() }}
        </div>
      </article>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="result-view">
      <div class="loading-state">
        <span class="prompt-spinner" />
        <span>Generating...</span>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="result-view">
      <div class="error-card">{{ error }}</div>
    </div>

    <!-- Prompt input -->
    <div class="prompt-area">
      <PromptInput :loading="loading" @submit="handleQuery" />
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - var(--header-h));
  padding: 0 var(--sp-5);
  overflow: hidden;
}

.hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
}

.hero-glow {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--c-glow-dim) 0%, transparent 70%);
  filter: blur(60px);
  pointer-events: none;
  animation: breathe 6s ease-in-out infinite;
}

.hero-title {
  font-family: var(--font-brand);
  font-size: var(--fs-3xl);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--c-crest);
  position: relative;
  z-index: 1;
}

.hero-ces { font-variant: small-caps; text-transform: lowercase; }
.hero-accent { color: var(--c-glow); font-weight: 400; }

.hero-sub {
  font-size: var(--fs-md);
  color: var(--c-drift);
  margin-top: var(--sp-3);
  position: relative;
  z-index: 1;
}

.hero-status {
  font-size: var(--fs-xs);
  color: var(--c-shelf);
  margin-top: var(--sp-4);
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.status-dot--ready { background: var(--c-glow); box-shadow: 0 0 6px var(--c-glow); }

/* ─── Result ─── */
.result-view {
  flex: 1;
  max-width: var(--max-content);
  width: 100%;
  margin: 0 auto;
  padding: var(--sp-6) 0;
  overflow-y: auto;
}

.entry {
  animation: fadeInUp var(--dur-slow) var(--ease-out) both;
}

.entry-query {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  font-family: var(--font-brand);
  font-size: var(--fs-md);
  color: var(--c-glow);
  margin-bottom: var(--sp-5);
  letter-spacing: -0.01em;
}

.entry-query-icon { flex-shrink: 0; opacity: 0.5; font-size: var(--fs-sm); }

.entry-content { color: var(--c-foam); line-height: var(--lh-relaxed); }
.entry-content :deep(h1), .entry-content :deep(h2), .entry-content :deep(h3) { color: var(--c-crest); }
.entry-content :deep(a) { color: var(--c-glow); text-decoration: underline; text-underline-offset: 3px; }
.entry-content :deep(a:hover) { color: var(--c-glow-bright); }
.entry-content :deep(ul), .entry-content :deep(ol) { padding-left: var(--sp-6); }
.entry-content :deep(li) { margin-bottom: var(--sp-2); }

/* ─── Disambiguation meanings ─── */
.meanings {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin-bottom: var(--sp-5);
}

.meaning-row {
  display: flex;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-deep);
  border-radius: var(--radius-sm);
}

.meaning-topic {
  font-weight: 600;
  color: var(--c-glow);
  font-size: var(--fs-sm);
  min-width: 10rem;
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-body);
  padding: 0;
}

.meaning-topic:hover { color: var(--c-glow-bright); }

.meaning-desc { font-size: var(--fs-sm); color: var(--c-drift); }

/* ─── Follow-ups ─── */
.entry-followups {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-5);
}

.followup-chip {
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  color: var(--c-drift);
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}

.followup-chip:hover {
  color: var(--c-glow);
  border-color: var(--c-glow-dim);
  background: var(--c-glow-faint);
}

.entry-meta {
  margin-top: var(--sp-5);
  font-size: var(--fs-xs);
  color: var(--c-shelf);
}

/* ─── Loading ─── */
.loading-state {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  color: var(--c-drift);
  font-size: var(--fs-sm);
  padding: var(--sp-8) 0;
}

.prompt-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--c-drift);
  border-top-color: var(--c-glow);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Error ─── */
.error-card {
  padding: var(--sp-4);
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  color: var(--c-drift);
  font-size: var(--fs-sm);
}

/* ─── Prompt area ─── */
.prompt-area {
  flex-shrink: 0;
  padding: var(--sp-4) 0 var(--sp-6);
  background: linear-gradient(to top, var(--c-void) 60%, transparent);
}

@media (max-width: 640px) {
  .hero-title { font-size: var(--fs-2xl); }
  .hero-sub { font-size: var(--fs-base); }
  .page { padding: 0 var(--sp-3); }
  .prompt-area { padding: var(--sp-3) 0 var(--sp-4); }
  .meaning-row { flex-direction: column; gap: var(--sp-1); }
  .meaning-topic { min-width: unset; }
}
</style>
