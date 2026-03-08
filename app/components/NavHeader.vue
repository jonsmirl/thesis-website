<template>
  <header class="nav-header">
    <div class="nav-inner">
      <NuxtLink to="/" class="logo">CES Formalization</NuxtLink>
      <nav>
        <NuxtLink to="/papers">Papers</NuxtLink>
        <NuxtLink to="/theorems">Theorems</NuxtLink>
        <NuxtLink to="/tests">Tests</NuxtLink>
      </nav>
      <div class="user-bar">
        <span class="email">{{ user?.email }}</span>
        <button @click="handleLogout">Sign out</button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const client = useSupabaseClient()

async function handleLogout() {
  await client.auth.signOut()
  navigateTo('/login')
}
</script>

<style scoped>
.nav-header {
  border-bottom: 1px solid #eee;
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.logo {
  font-weight: 700;
  font-size: 1.1rem;
  color: #111;
  text-decoration: none;
  white-space: nowrap;
}
nav {
  display: flex;
  gap: 1rem;
}
nav a {
  color: #555;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0.25rem 0;
  border-bottom: 2px solid transparent;
}
nav a:hover { color: #111; }
nav a.router-link-active {
  color: #111;
  border-bottom-color: #111;
}
.user-bar {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
}
.email { color: #888; }
.user-bar button {
  padding: 0.25rem 0.5rem;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  color: #555;
}
.user-bar button:hover { background: #f5f5f5; }
</style>
