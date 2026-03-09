<template>
  <span v-html="rendered"></span>
</template>

<script setup lang="ts">
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = defineProps<{ text: string }>()

const rendered = computed(() => {
  if (!props.text) return ''
  let html = props.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Inline math: $...$
  html = html.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })
    } catch { return tex }
  })

  return html
})
</script>
