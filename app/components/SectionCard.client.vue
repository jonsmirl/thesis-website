<template>
  <NuxtLink :to="`/theorems/section/${section.number}`" class="section-card" :style="{ borderLeftColor: section.color }">
    <div class="card-top">
      <span class="section-number" :style="{ color: section.color }">{{ section.number }}</span>
      <div class="card-info">
        <h3 class="card-title">{{ section.title }}</h3>
        <p class="card-desc"><MathInline :text="section.description" /></p>
      </div>
    </div>
    <div class="card-stats">
      <span class="pill" v-if="section.theorem_count">{{ section.theorem_count }} declarations</span>
      <span class="pill pill--marquee" v-if="section.marquee_count">{{ section.marquee_count }} key</span>
      <span class="pill pill--proved" v-if="section.status_counts?.proved">{{ section.status_counts.proved }} proved</span>
      <span class="pill pill--trivial" v-if="section.status_counts?.trivial">{{ section.status_counts.trivial }} trivial</span>
      <span class="pill pill--sorry" v-if="section.status_counts?.sorry">{{ section.status_counts.sorry }} sorry</span>
      <span class="pill pill--axiom" v-if="section.status_counts?.axiom">{{ section.status_counts.axiom }} axiom</span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  section: {
    number: number
    title: string
    description: string
    color: string
    theorem_count: number
    marquee_count: number
    status_counts?: Record<string, number>
  }
}>()
</script>

<style scoped>
.section-card {
  display: block;
  border: 1px solid var(--color-border);
  border-left-width: 4px;
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.15s, border-left-width 0.15s;
  background: var(--color-bg-page);
}
.section-card:hover {
  box-shadow: var(--shadow-md);
  border-left-width: 6px;
}
.card-top {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}
.section-number {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
  min-width: 2rem;
  text-align: center;
}
.card-info { flex: 1; }
.card-title {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}
.card-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}
.card-stats {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}
</style>
