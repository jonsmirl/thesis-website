<template>
  <nav class="forum-breadcrumb" aria-label="Forum navigation">
    <NuxtLink to="/forum" class="crumb">Forum</NuxtLink>
    <template v-if="categoryName">
      <span class="sep">/</span>
      <NuxtLink v-if="categorySlug" :to="`/forum/${categorySlug}`" class="crumb">{{ categoryName }}</NuxtLink>
      <span v-else class="crumb current">{{ categoryName }}</span>
    </template>
    <template v-if="topicTitle">
      <span class="sep">/</span>
      <span class="crumb current topic-crumb">{{ topicTitle }}</span>
    </template>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  categorySlug?: string
  categoryName?: string
  topicTitle?: string
}>()
</script>

<style scoped>
.forum-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border-light);
}
.crumb {
  color: var(--color-text-faint);
  text-decoration: none;
}
a.crumb:hover {
  color: var(--color-link);
}
.crumb.current {
  color: var(--color-text-tertiary);
}
.topic-crumb {
  max-width: 28ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sep {
  color: var(--color-text-placeholder);
  font-size: 0.7rem;
}
</style>
