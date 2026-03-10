<template>
  <div class="vote-col">
    <button
      class="vote-arrow up"
      :class="{ active: myVote === 1 }"
      :disabled="disabled"
      aria-label="Upvote"
      @click="$emit('vote', 1)"
    >&#9650;</button>
    <span class="vote-score" :class="{ pos: score > 0, neg: score < 0 }">{{ score }}</span>
    <button
      class="vote-arrow down"
      :class="{ active: myVote === -1 }"
      :disabled="disabled"
      aria-label="Downvote"
      @click="$emit('vote', -1)"
    >&#9660;</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  score: number
  myVote?: number
  disabled?: boolean
}>()
defineEmits<{ vote: [value: 1 | -1] }>()
</script>

<style scoped>
.vote-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 2rem;
  gap: 0;
  user-select: none;
}
.vote-arrow {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.55rem;
  color: var(--color-text-placeholder);
  padding: 0.15rem 0.3rem;
  line-height: 1;
  border-radius: var(--radius-sm);
  transition: color 0.15s, background 0.15s;
}
.vote-arrow:hover:not(:disabled) {
  color: var(--color-text-tertiary);
  background: var(--color-bg-hover);
}
.vote-arrow.up.active { color: var(--color-success); }
.vote-arrow.down.active { color: var(--color-error); }
.vote-arrow:disabled { cursor: default; opacity: 0.4; }
.vote-score {
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  line-height: 1.3;
}
.vote-score.pos { color: var(--color-success); }
.vote-score.neg { color: var(--color-error); }
</style>
