<template>
  <div
    class="skeleton"
    :style="{
      width: width,
      height: height,
      borderRadius: radius || 'var(--radius-md)',
    }"
  />
</template>

<script setup lang="ts">
defineProps<{
  width?: string
  height?: string
  radius?: string
}>()
</script>
