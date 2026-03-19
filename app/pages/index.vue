<script setup lang="ts">
const loading = ref(false)
const rawQuery = ref('')
const result = ref<any>(null)
const error = ref('')
const aiAvailable = ref(false)
let session: any = null

// Check if Chrome built-in AI is available
// API is the global LanguageModel (not window.ai.languageModel)
onMounted(async () => {
  if (import.meta.client) {
    try {
      const LM = (globalThis as any).LanguageModel
      if (LM) {
        const avail = await LM.availability()
        aiAvailable.value = avail === 'readily' || avail === 'after-download'
        if (aiAvailable.value) {
          session = await LM.create({
            systemPrompt: `You are a search query preprocessor. Given a raw user query, respond with ONLY a JSON object (no markdown, no backticks) with these fields:
- corrected: the spell-corrected query
- ambiguous: boolean, true if the query is short/vague with multiple possible meanings
- classification: one of "gibberish", "ambiguous", "clear"
- meanings: if ambiguous, array of possible meanings (max 5), each with {topic, description}
- expanded: the query expanded with enough context to be unambiguous for embedding search
- confidence: 0-1 how confident you are in the interpretation`
          })
        }
      }
    } catch (e) {
      console.warn('Chrome AI not available:', e)
    }
  }
})

async function handleQuery(query: string) {
  rawQuery.value = query
  loading.value = true
  error.value = ''
  result.value = null

  try {
    if (!session) {
      error.value = 'Chrome built-in AI not available. Enable chrome://flags/#optimization-guide-on-device-model'
      return
    }

    const response = await session.prompt(`Preprocess this search query: "${query}"`)

    // Try to parse as JSON
    try {
      result.value = JSON.parse(response)
    } catch {
      // If it wrapped in markdown code block, strip it
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      try {
        result.value = JSON.parse(cleaned)
      } catch {
        result.value = { raw: response }
      }
    }
  } catch (e: any) {
    error.value = e?.message || 'Query preprocessing failed'
  } finally {
    loading.value = false
  }
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
      <p class="hero-sub">Query Preprocessor Lab</p>
      <p class="hero-status">
        <span class="status-dot" :class="aiAvailable ? 'status-dot--ready' : 'status-dot--off'" />
        {{ aiAvailable ? 'Gemini Nano ready' : 'Chrome AI not available' }}
      </p>
    </div>

    <!-- Result -->
    <div v-else-if="result" class="result-view">
      <div class="result-card">
        <div class="result-header">
          <span class="result-label">Raw query</span>
          <span class="result-value query-value">{{ rawQuery }}</span>
        </div>

        <div v-if="result.corrected" class="result-row">
          <span class="result-label">Corrected</span>
          <span class="result-value">{{ result.corrected }}</span>
        </div>

        <div v-if="result.classification" class="result-row">
          <span class="result-label">Classification</span>
          <span class="result-badge" :class="`badge--${result.classification}`">
            {{ result.classification }}
          </span>
        </div>

        <div v-if="result.ambiguous !== undefined" class="result-row">
          <span class="result-label">Ambiguous</span>
          <span class="result-value">{{ result.ambiguous ? 'Yes' : 'No' }}</span>
        </div>

        <div v-if="result.expanded" class="result-row">
          <span class="result-label">Expanded</span>
          <span class="result-value">{{ result.expanded }}</span>
        </div>

        <div v-if="result.confidence !== undefined" class="result-row">
          <span class="result-label">Confidence</span>
          <span class="result-value">{{ (result.confidence * 100).toFixed(0) }}%</span>
        </div>

        <div v-if="result.meanings?.length" class="meanings">
          <span class="result-label">Possible meanings</span>
          <div v-for="(m, i) in result.meanings" :key="i" class="meaning-row">
            <span class="meaning-topic">{{ m.topic }}</span>
            <span class="meaning-desc">{{ m.description }}</span>
          </div>
        </div>

        <details class="raw-json">
          <summary>Raw JSON</summary>
          <pre>{{ JSON.stringify(result, null, 2) }}</pre>
        </details>
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="result-view">
      <div class="loading-state">
        <span class="prompt-spinner" />
        <span>Processing with Gemini Nano...</span>
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

.hero-ces {
  font-variant: small-caps;
  text-transform: lowercase;
}

.hero-accent {
  color: var(--c-glow);
  font-weight: 400;
}

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

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot--ready {
  background: var(--c-glow);
  box-shadow: 0 0 6px var(--c-glow);
}

.status-dot--off {
  background: var(--c-drift);
}

/* ─── Result ─── */
.result-view {
  flex: 1;
  max-width: var(--max-content);
  width: 100%;
  margin: 0 auto;
  padding: var(--sp-6) 0;
  overflow-y: auto;
}

.result-card {
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-lg);
  padding: var(--sp-5);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  animation: fadeInUp var(--dur-slow) var(--ease-out) both;
}

.result-header {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--c-trench);
}

.result-row {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
}

.result-label {
  font-size: var(--fs-xs);
  color: var(--c-drift);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  min-width: 8rem;
  flex-shrink: 0;
}

.result-value {
  font-size: var(--fs-base);
  color: var(--c-foam);
}

.query-value {
  font-family: var(--font-brand);
  color: var(--c-glow);
  font-size: var(--fs-md);
}

.result-badge {
  font-size: var(--fs-xs);
  padding: var(--sp-1) var(--sp-2);
  border-radius: var(--radius-sm);
  font-weight: 600;
  text-transform: uppercase;
}

.badge--clear {
  background: #0d2818;
  color: #56d364;
}

.badge--ambiguous {
  background: #3b2e00;
  color: #e3b341;
}

.badge--gibberish {
  background: #3d1117;
  color: #f85149;
}

.meanings {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.meaning-row {
  display: flex;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-abyss);
  border-radius: var(--radius-sm);
  margin-left: 8rem;
}

.meaning-topic {
  font-weight: 600;
  color: var(--c-crest);
  font-size: var(--fs-sm);
  min-width: 10rem;
  flex-shrink: 0;
}

.meaning-desc {
  font-size: var(--fs-sm);
  color: var(--c-drift);
}

.raw-json {
  margin-top: var(--sp-2);
}

.raw-json summary {
  font-size: var(--fs-xs);
  color: var(--c-drift);
  cursor: pointer;
}

.raw-json pre {
  font-size: var(--fs-xs);
  color: var(--c-foam);
  background: var(--c-abyss);
  padding: var(--sp-3);
  border-radius: var(--radius-sm);
  overflow-x: auto;
  margin-top: var(--sp-2);
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

@keyframes spin {
  to { transform: rotate(360deg); }
}

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
  .result-row { flex-direction: column; gap: var(--sp-1); }
  .result-label { min-width: unset; }
  .meaning-row { margin-left: 0; }
}
</style>
