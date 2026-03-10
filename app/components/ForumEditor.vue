<template>
  <div class="forum-editor">
    <div class="editor-tabs">
      <button
        class="tab"
        :class="{ active: mode === 'write' }"
        @click="mode = 'write'"
      >Write</button>
      <button
        class="tab"
        :class="{ active: mode === 'preview' }"
        @click="mode = 'preview'"
      >Preview</button>
      <span class="hint">Markdown + LaTeX ($...$) supported</span>
    </div>

    <textarea
      v-if="mode === 'write'"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      class="editor-textarea"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    ></textarea>

    <div
      v-else
      class="editor-preview"
      :style="{ minHeight: rows * 1.6 + 'rem' }"
      v-html="renderedPreview"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { autoDetectMath } from '~/utils/math-render'
import { marked } from 'marked'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  rows?: number
}>(), {
  placeholder: 'Write your post... (Markdown + LaTeX supported)',
  rows: 8,
})

defineEmits<{ 'update:modelValue': [value: string] }>()

const mode = ref<'write' | 'preview'>('write')

const renderedPreview = computed(() => {
  if (!props.modelValue.trim()) return '<p style="color: var(--color-text-placeholder)">Nothing to preview</p>'
  // Render markdown, then apply KaTeX auto-detection
  const html = marked.parse(props.modelValue) as string
  return autoDetectMath(html)
})
</script>

<style scoped>
.forum-editor {
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg-page);
}
.editor-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0 0.5rem;
}
.tab {
  background: none;
  border: none;
  padding: 0.45rem 0.75rem;
  font-size: 0.8rem;
  font-family: var(--font-sans);
  color: var(--color-text-faint);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab:hover { color: var(--color-text-tertiary); }
.tab.active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-text-primary);
  background: var(--color-bg-page);
}
.hint {
  margin-left: auto;
  font-size: 0.7rem;
  color: var(--color-text-placeholder);
  font-family: var(--font-sans);
}
.editor-textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: none;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.55;
  resize: vertical;
  box-sizing: border-box;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}
.editor-textarea:focus {
  outline: none;
}
.editor-preview {
  padding: 0.65rem 0.75rem;
  font-family: var(--font-serif);
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  overflow-wrap: break-word;
}
.editor-preview :deep(p) { margin: 0 0 0.6rem; }
.editor-preview :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: var(--color-bg-code);
  padding: 0.1em 0.3em;
  border-radius: var(--radius-sm);
}
.editor-preview :deep(pre) {
  background: var(--color-bg-code);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  overflow-x: auto;
  font-size: 0.82rem;
}
.editor-preview :deep(blockquote) {
  border-left: 3px solid var(--color-border-heavy);
  margin: 0 0 0.6rem;
  padding: 0.25rem 0.75rem;
  color: var(--color-text-muted);
}
</style>
