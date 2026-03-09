<template>
  <span v-html="rendered"></span>
</template>

<script setup lang="ts">
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = defineProps<{ text: string }>()

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const rendered = computed(() => {
  if (!props.text) return ''
  // Split on $...$ boundaries, escape non-math parts, render math parts
  const parts = props.text.split(/(?<!\$)\$(?!\$)/)
  return parts.map((part, i) => {
    if (i % 2 === 0) {
      // Outside math: escape HTML
      return escapeHtml(part)
    }
    // Inside math: render with KaTeX (no HTML escaping)
    try {
      return katex.renderToString(part.trim(), { displayMode: false, throwOnError: false })
    } catch { return escapeHtml(part) }
  }).join('')
})
</script>
