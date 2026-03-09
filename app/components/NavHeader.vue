<template>
  <header class="nav-header">
    <div class="nav-inner">
      <NuxtLink to="/" class="logo">CES Formalization</NuxtLink>
      <nav>
        <NuxtLink to="/wiki">Wiki</NuxtLink>
        <NuxtLink to="/papers">Papers</NuxtLink>
        <NuxtLink to="/theorems">Theorems</NuxtLink>
        <NuxtLink to="/tests">Tests</NuxtLink>
      </nav>
      <div class="user-bar" v-if="user">
        <span class="email">{{ user.email }}</span>
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
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-page);
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-inner {
  max-width: var(--container-width);
  margin: 0 auto;
  padding: 0.75rem var(--container-padding);
  display: flex;
  align-items: center;
  gap: 1.5rem;
  font-family: var(--font-sans);
}
.logo {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--color-text-primary);
  text-decoration: none;
  white-space: nowrap;
}
nav {
  display: flex;
  gap: 1rem;
}
nav a {
  color: var(--color-text-tertiary);
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0.25rem 0;
  border-bottom: 2px solid transparent;
}
nav a:hover { color: var(--color-text-primary); }
nav a.router-link-active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-text-primary);
}
.user-bar {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
}
.email { color: var(--color-text-faint); }
.user-bar button {
  padding: 0.25rem 0.5rem;
  background: none;
  border: 1px solid var(--color-border-input);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}
.user-bar button:hover { background: var(--color-bg-hover); }
</style>
