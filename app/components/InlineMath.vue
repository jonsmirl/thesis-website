<template>
  <span v-html="rendered"></span>
</template>

<script setup lang="ts">
import { renderKatex, escapeHtmlFull } from '~/utils/math-render'

const props = defineProps<{ text: string }>()

const rendered = computed(() => {
  if (!props.text) return ''
  // Split on $...$ boundaries, escape non-math parts, render math parts
  const parts = props.text.split(/(?<!\$)\$(?!\$)/)
  return parts.map((part, i) => {
    if (i % 2 === 0) {
      return escapeHtmlFull(part)
    }
    return renderKatex(part)
  }).join('')
})
</script>
