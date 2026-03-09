<template>
  <div class="chain-item">
    <div class="timeline-dot" :class="`timeline-dot--${item.status}`" :style="{ borderColor: accentColor }"></div>
    <div class="chain-content">
      <details>
        <summary class="chain-summary">
          <NuxtLink :to="`/theorems/${item.name}`" class="thm-name" @click.stop>{{ item.name }}</NuxtLink>
          <span class="badge" :class="`badge--${item.status}`">{{ item.status }}</span>
          <span class="check-comment" v-if="item.check_comment">{{ item.check_comment }}</span>
        </summary>
        <div class="chain-detail">
          <MathDoc v-if="item.docstring" :text="item.docstring" class="docstring" />
          <LeanHighlight v-if="item.source_code" :code="item.source_code" />
          <div class="detail-meta">
            <div v-if="item.deps_on && item.deps_on.length" class="dep-list">
              <strong>Depends on:</strong>
              <NuxtLink
                v-for="d in item.deps_on"
                :key="d.name"
                :to="`/theorems/${d.name}`"
                class="dep-link"
              >{{ d.name }}</NuxtLink>
            </div>
            <div v-if="item.used_by && item.used_by.length" class="dep-list">
              <strong>Used by:</strong>
              <NuxtLink
                v-for="d in item.used_by"
                :key="d.name"
                :to="`/theorems/${d.name}`"
                class="dep-link"
              >{{ d.name }}</NuxtLink>
            </div>
            <div class="file-loc">
              <a :href="githubUrl(item.file_path, item.line_number)" target="_blank" class="file-link">
                {{ item.file_path }}<span v-if="item.line_number">:{{ item.line_number }}</span>
              </a>
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { githubUrl } from '~/utils/formatting'

defineProps<{
  item: {
    name: string
    status: string
    check_comment?: string
    docstring?: string
    source_code?: string
    file_path?: string
    line_number?: number
    deps_on?: { name: string }[]
    used_by?: { name: string }[]
  }
  accentColor: string
}>()
</script>

<style scoped>
.chain-item {
  display: flex;
  gap: 1rem;
  position: relative;
  padding-bottom: 0.5rem;
}
.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--color-border-input);
  background: var(--color-bg-page);
  flex-shrink: 0;
  margin-top: 0.35rem;
  z-index: 1;
}
.timeline-dot--proved { background: var(--color-proved-dot); border-color: var(--color-proved-accent); }
.timeline-dot--sorry { background: var(--color-sorry-dot); border-color: var(--color-sorry-accent); }
.timeline-dot--axiom { background: var(--color-axiom-dot); border-color: var(--color-axiom-accent); }
.timeline-dot--trivial { background: var(--color-trivial-dot); border-color: var(--color-trivial-accent); }
.chain-content { flex: 1; min-width: 0; }
.chain-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.25rem 0;
  flex-wrap: wrap;
  list-style: none;
}
.chain-summary::-webkit-details-marker { display: none; }
.chain-summary::before {
  content: '\25B6';
  font-size: 0.6rem;
  color: var(--color-text-ghost);
  transition: transform 0.15s;
}
details[open] > .chain-summary::before { transform: rotate(90deg); }
.thm-name {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text-primary);
  text-decoration: none;
}
.thm-name:hover { color: var(--color-link); }
.check-comment {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-style: italic;
}
.chain-detail {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: var(--color-bg-surface-alt);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
}
.docstring {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  white-space: pre-wrap;
  font-family: var(--font-serif);
  line-height: 1.85;
}
.detail-meta {
  margin-top: 0.75rem;
  font-size: 0.8rem;
}
.dep-list {
  margin-bottom: 0.4rem;
}
.dep-list strong {
  color: var(--color-text-muted);
  margin-right: 0.3rem;
}
.dep-link {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-link);
  text-decoration: none;
  margin-right: 0.5rem;
}
.dep-link:hover { text-decoration: underline; }
.file-loc {
  margin-top: 0.4rem;
  color: var(--color-text-ghost);
}
</style>
