<template>
  <div class="math-doc" v-html="rendered"></div>
</template>

<script setup lang="ts">
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = defineProps<{ text: string }>()

const rendered = computed(() => {
  if (!props.text) return ''

  let html = escapeHtml(props.text)

  // Display math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })
    } catch { return tex }
  })

  // Inline math: $...$  (not preceded/followed by $)
  html = html.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })
    } catch { return tex }
  })

  // Convert newlines to <br> for paragraph breaks
  html = html.replace(/\n\n/g, '<br><br>')
  html = html.replace(/\n/g, '<br>')

  return html
})

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
</script>

<style>
.math-doc {
  line-height: 1.7;
  white-space: normal;
}
.math-doc .katex-display {
  margin: 0.75rem 0;
}
</style>
