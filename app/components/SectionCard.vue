<template>
  <NuxtLink :to="`/theorems/section/${section.number}`" class="section-card" :style="{ borderLeftColor: section.color }">
    <div class="card-top">
      <span class="section-number" :style="{ color: section.color }">{{ section.number }}</span>
      <div class="card-info">
        <h3 class="card-title">{{ section.title }}</h3>
        <p class="card-desc">{{ section.description }}</p>
      </div>
    </div>
    <div class="card-stats">
      <span class="pill" v-if="section.theorem_count">{{ section.theorem_count }} declarations</span>
      <span class="pill marquee" v-if="section.marquee_count">{{ section.marquee_count }} key theorems</span>
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
  }
}>()
</script>

<style scoped>
.section-card {
  display: block;
  border: 1px solid #e5e7eb;
  border-left-width: 4px;
  border-radius: 6px;
  padding: 1rem 1.25rem;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.15s, border-left-width 0.15s;
  background: white;
}
.section-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
  color: #111;
}
.card-desc {
  margin: 0;
  font-size: 0.85rem;
  color: #666;
  line-height: 1.4;
}
.card-stats {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}
.pill {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  background: #f3f4f6;
  color: #555;
}
.pill.marquee {
  background: #ecfdf5;
  color: #059669;
}
</style>
