<script setup lang="ts">
import type { ServiceDefinition } from '~/utils/service-registry'

defineProps<{
  service: ServiceDefinition
  enabled: boolean
  connected: boolean
}>()

defineEmits<{
  toggle: []
  connect: []
}>()
</script>

<template>
  <button
    class="tile"
    :class="{
      'tile--enabled': enabled && connected,
      'tile--needs-connect': enabled && !connected && service.category === 'oauth',
      'tile--off': !enabled,
    }"
    @click="$emit('toggle')"
  >
    <span class="tile-emoji">{{ service.emoji }}</span>
    <span class="tile-label">{{ service.label }}</span>
    <span v-if="enabled && connected" class="tile-status tile-status--ok" />
    <button
      v-else-if="enabled && !connected && service.category === 'oauth'"
      class="tile-connect"
      @click.stop="$emit('connect')"
    >
      Connect
    </button>
    <span v-else class="tile-status tile-status--off" />
  </button>
</template>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-1);
  min-width: 0;
  padding: var(--sp-3);
  background: var(--c-abyss);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  cursor: pointer;
  opacity: 0.55;
  transition: all var(--dur-fast) var(--ease-out);
  font-family: var(--font-body);
}

.tile:hover {
  opacity: 0.8;
  border-color: var(--c-drift);
}

.tile--enabled {
  opacity: 1;
  border-color: var(--c-glow-dim);
}

.tile--enabled:hover {
  opacity: 1;
  border-color: var(--c-glow);
}

.tile--needs-connect {
  opacity: 1;
  border-color: var(--c-warning);
}

.tile-emoji {
  font-size: 1.6rem;
  line-height: 1;
}

.tile-label {
  font-size: var(--fs-xs);
  font-weight: 500;
  color: var(--c-foam);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.tile-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tile-status--ok {
  background: var(--c-glow);
  box-shadow: 0 0 6px var(--c-glow-dim);
}

.tile-status--off {
  background: var(--c-trench);
}

.tile-connect {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  color: var(--c-abyss);
  background: var(--c-warning);
  border: none;
  border-radius: var(--radius-full);
  padding: 1px var(--sp-2);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}

.tile-connect:hover {
  filter: brightness(1.1);
}
</style>
