<script setup lang="ts">
const props = defineProps<{
  stepId: string
  dependsOn: string[]
  body: string
  otherStepIds: string[]
  index: number
  isLast: boolean
}>()

const emit = defineEmits<{
  'update:stepId': [value: string]
  'update:dependsOn': [value: string[]]
  'update:body': [value: string]
  delete: []
}>()

function toggleDep(id: string) {
  const current = [...props.dependsOn]
  const idx = current.indexOf(id)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(id)
  }
  emit('update:dependsOn', current)
}
</script>

<template>
  <div class="step-card" :class="{ 'step-card--output': isLast }">
    <div class="step-header">
      <span class="step-number">#{{ index + 1 }}</span>
      <input
        :value="stepId"
        class="step-id-input"
        type="text"
        placeholder="step_id"
        @input="emit('update:stepId', ($event.target as HTMLInputElement).value)"
      />
      <span v-if="isLast" class="step-output-badge">output</span>
      <div class="step-spacer" />
      <button class="step-delete-btn" title="Remove step" @click="emit('delete')">
        &times;
      </button>
    </div>

    <div v-if="otherStepIds.length > 0" class="step-deps">
      <span class="step-deps-label">depends_on:</span>
      <button
        v-for="sid in otherStepIds"
        :key="sid"
        class="dep-chip"
        :class="{ 'dep-chip--active': dependsOn.includes(sid) }"
        @click="toggleDep(sid)"
      >
        {{ sid }}
      </button>
    </div>

    <textarea
      :value="body"
      class="step-body"
      placeholder="Describe what this step does..."
      rows="4"
      @input="emit('update:body', ($event.target as HTMLTextAreaElement).value)"
    />
  </div>
</template>

<style scoped>
.step-card {
  background: var(--c-abyss);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.step-card--output {
  border-color: var(--c-glow-dim);
}

.step-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-deep);
  border-bottom: 1px solid var(--c-trench);
}

.step-number {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-glow);
  flex-shrink: 0;
}

.step-id-input {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--c-foam);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: var(--sp-1) var(--sp-2);
  outline: none;
  min-width: 80px;
  max-width: 160px;
}

.step-id-input:focus {
  border-color: var(--c-glow-dim);
  background: var(--c-abyss);
}

.step-output-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--c-abyss);
  background: var(--c-glow);
  padding: 1px var(--sp-2);
  border-radius: var(--radius-full);
}

.step-spacer {
  flex: 1;
}

.step-delete-btn {
  font-size: var(--fs-lg);
  line-height: 1;
  color: var(--c-drift);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 var(--sp-1);
  transition: color var(--dur-fast) var(--ease-out);
}

.step-delete-btn:hover {
  color: var(--c-error);
}

.step-deps {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--c-trench);
  flex-wrap: wrap;
}

.step-deps-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--c-drift);
  flex-shrink: 0;
}

.dep-chip {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--c-drift);
  background: var(--c-deep);
  border: 1px solid var(--c-shelf);
  border-radius: var(--radius-full);
  padding: 1px var(--sp-2);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.dep-chip:hover {
  border-color: var(--c-glow-dim);
  color: var(--c-foam);
}

.dep-chip--active {
  background: var(--c-glow-faint);
  border-color: var(--c-glow-dim);
  color: var(--c-glow);
}

.step-body {
  width: 100%;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--c-foam);
  background: transparent;
  border: none;
  padding: var(--sp-3);
  resize: vertical;
  outline: none;
  line-height: var(--lh-body);
  box-sizing: border-box;
}

.step-body:focus {
  background: var(--c-deep);
}
</style>
