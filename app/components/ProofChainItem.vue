<template>
  <div class="chain-item">
    <div class="timeline-dot" :class="item.status" :style="{ borderColor: accentColor }"></div>
    <div class="chain-content">
      <details>
        <summary class="chain-summary">
          <NuxtLink :to="`/theorems/${item.name}`" class="thm-name" @click.stop>{{ item.name }}</NuxtLink>
          <span class="badge" :class="item.status">{{ item.status }}</span>
          <span class="check-comment" v-if="item.check_comment">{{ item.check_comment }}</span>
        </summary>
        <div class="chain-detail">
          <p v-if="item.docstring" class="docstring">{{ item.docstring }}</p>
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
              <code>{{ item.file_path }}<span v-if="item.line_number">:{{ item.line_number }}</span></code>
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  border: 2px solid #ccc;
  background: white;
  flex-shrink: 0;
  margin-top: 0.35rem;
  z-index: 1;
}
.timeline-dot.proved { background: #22c55e; border-color: #16a34a; }
.timeline-dot.sorry { background: #fbbf24; border-color: #d97706; }
.timeline-dot.axiom { background: #a78bfa; border-color: #7c3aed; }
.timeline-dot.trivial { background: #67e8f9; border-color: #06b6d4; }
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
  color: #999;
  transition: transform 0.15s;
}
details[open] > .chain-summary::before { transform: rotate(90deg); }
.thm-name {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-weight: 600;
  font-size: 0.9rem;
  color: #111;
  text-decoration: none;
}
.thm-name:hover { color: #0066cc; }
.badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  background: #f0f0f0;
  color: #555;
}
.badge.proved { background: #e6f4ea; color: #1a7f37; }
.badge.sorry { background: #fff3cd; color: #856404; }
.badge.axiom { background: #e8d5f5; color: #6f42c1; }
.badge.trivial { background: #d1ecf1; color: #0c5460; }
.check-comment {
  font-size: 0.8rem;
  color: #666;
  font-style: italic;
}
.chain-detail {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 6px;
}
.docstring {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: #444;
  line-height: 1.5;
  white-space: pre-wrap;
}
.detail-meta {
  margin-top: 0.75rem;
  font-size: 0.8rem;
}
.dep-list {
  margin-bottom: 0.4rem;
}
.dep-list strong {
  color: #666;
  margin-right: 0.3rem;
}
.dep-link {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.75rem;
  color: #0066cc;
  text-decoration: none;
  margin-right: 0.5rem;
}
.dep-link:hover { text-decoration: underline; }
.file-loc {
  margin-top: 0.4rem;
  color: #999;
}
.file-loc code {
  font-size: 0.75rem;
  background: #f0f0f0;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}
</style>
