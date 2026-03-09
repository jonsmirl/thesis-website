<template>
  <span v-html="rendered"></span>
</template>

<script setup lang="ts">
import { escapeHtml, renderKatex, texify, autoDetectMath, GREEK_PAT } from '~/utils/math-render'

const props = defineProps<{ text: string }>()

const rendered = computed(() => {
  if (!props.text) return ''
  let s = escapeHtml(props.text)

  // Explicit $...$
  s = s.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_m, tex) => renderKatex(tex))

  // Auto-detect math patterns
  s = autoDetectMath(s)

  return s
})
</script>
