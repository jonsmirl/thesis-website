<template>
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center;">
    <p>Confirming authentication...</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const client = useSupabaseClient()
const { data } = await client.auth.getSession()
if (data.session) {
  navigateTo('/')
}
</script>
