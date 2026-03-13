<template>
  <div class="score-bar">
    <span class="score-bar__label">{{ label }}</span>
    <div class="score-bar__track">
      <div
        class="score-bar__fill"
        :class="tierClass"
        :style="{ width: pct + '%' }"
      />
    </div>
    <span class="score-bar__value" :class="tierClass">{{ value.toFixed(1) }}</span>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string
  value: number
  max?: number
}>(), { max: 10 })

const pct = computed(() => Math.min(100, Math.max(0, (props.value / props.max) * 100)))

const tierClass = computed(() => {
  if (props.value >= 7) return 'score-bar--high'
  if (props.value >= 4) return 'score-bar--medium'
  return 'score-bar--low'
})
</script>

<style scoped>
.score-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}
.score-bar__label {
  flex: 0 0 140px;
  color: var(--color-text-muted);
  text-align: right;
  white-space: nowrap;
}
.score-bar__track {
  flex: 1;
  height: 8px;
  background: var(--color-bg-inset);
  border-radius: 4px;
  overflow: hidden;
}
.score-bar__fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}
.score-bar__value {
  flex: 0 0 2rem;
  font-weight: 600;
  font-size: 0.75rem;
  text-align: right;
}

/* Tier colors */
.score-bar--high .score-bar__fill,
.score-bar--high.score-bar__fill { background: var(--color-score-high); }
.score-bar--high.score-bar__value { color: var(--color-score-high); }

.score-bar--medium .score-bar__fill,
.score-bar--medium.score-bar__fill { background: var(--color-score-medium); }
.score-bar--medium.score-bar__value { color: var(--color-score-medium); }

.score-bar--low .score-bar__fill,
.score-bar--low.score-bar__fill { background: var(--color-score-low); }
.score-bar--low.score-bar__value { color: var(--color-score-low); }
</style>
