<template>
  <div class="demo-container">
    <div class="demo-toolbar">
      <span class="demo-label">Interactive Demo</span>
    </div>
    <div class="demo-canvas">
      <div v-if="error" class="demo-error">{{ error }}</div>
      <component :is="demoComponent" v-else-if="demoComponent" :config="config" />
      <div v-else class="demo-loading">Loading...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, shallowRef } from 'vue'

const props = defineProps<{
  name: string
  config?: Record<string, any> | null
}>()

const error = ref<string | null>(null)

const loaders: Record<string, () => Promise<any>> = {
  CesIsoquant: () => import('./demos/CesIsoquant.client.vue'),
  CurvatureDegradation: () => import('./demos/CurvatureDegradation.client.vue'),
  CrisisSequence: () => import('./demos/CrisisSequence.client.vue'),
  RegimeDiagram: () => import('./demos/RegimeDiagram.client.vue'),
  DampingCancellation: () => import('./demos/DampingCancellation.client.vue'),
  SmirlCurve: () => import('./demos/SmirlCurve.client.vue'),
}

const demoComponent = shallowRef<ReturnType<typeof defineAsyncComponent> | null>(null)

if (loaders[props.name]) {
  demoComponent.value = defineAsyncComponent({
    loader: loaders[props.name],
    onError(err) {
      console.error(`Demo "${props.name}" failed to load:`, err)
      error.value = `Failed to load demo: ${err.message}`
    },
  })
}
</script>

<style scoped>
.demo-container {
  background: var(--color-bg-surface-alt);
}
.demo-toolbar {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border-medium);
}
.demo-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.demo-canvas {
  min-height: 400px;
  position: relative;
}
.demo-loading {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-faint);
}
.demo-error {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-inconsistent-fg, #c00);
  font-size: 0.85rem;
}
</style>
