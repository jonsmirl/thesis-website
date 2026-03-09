<template>
  <div class="demo-container">
    <div class="demo-toolbar">
      <span class="demo-label">Interactive Demo</span>
    </div>
    <div class="demo-canvas">
      <component :is="demoComponent" v-if="demoComponent" :config="config" />
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

const demoComponents: Record<string, () => ReturnType<typeof defineAsyncComponent>> = {
  CesIsoquant: () => defineAsyncComponent(() => import('./demos/CesIsoquant.client.vue')),
  CurvatureDegradation: () => defineAsyncComponent(() => import('./demos/CurvatureDegradation.client.vue')),
  CrisisSequence: () => defineAsyncComponent(() => import('./demos/CrisisSequence.client.vue')),
  RegimeDiagram: () => defineAsyncComponent(() => import('./demos/RegimeDiagram.client.vue')),
  DampingCancellation: () => defineAsyncComponent(() => import('./demos/DampingCancellation.client.vue')),
  SmirlCurve: () => defineAsyncComponent(() => import('./demos/SmirlCurve.client.vue')),
}

const demoComponent = shallowRef<ReturnType<typeof defineAsyncComponent> | null>(null)

if (demoComponents[props.name]) {
  demoComponent.value = demoComponents[props.name]()
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
</style>
