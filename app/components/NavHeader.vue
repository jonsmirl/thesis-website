<template>
  <header class="nav-header">
    <div class="nav-inner">
      <NuxtLink to="/" class="logo"><span class="logo-ces">ces</span>Claw</NuxtLink>
      <nav>
        <NuxtLink to="/papers">Papers</NuxtLink>
        <NuxtLink to="/wiki">Wiki</NuxtLink>
        <NuxtLink to="/theorems">Theorems</NuxtLink>
        <NuxtLink to="/tests">Tests</NuxtLink>
        <NuxtLink to="/forum">Forum</NuxtLink>
        <NuxtLink to="/skills">Skills</NuxtLink>
        <NuxtLink to="/settings">Settings</NuxtLink>
      </nav>
      <div class="user-bar" v-if="currentUser">
        <span class="email">{{ displayName }}</span>
        <span v-if="isSuperuser" class="role-badge superuser">superuser</span>
        <span v-else-if="isEditor" class="role-badge editor">editor</span>
        <NuxtLink v-if="isSuperuser" to="/admin/users" class="account-link">Admin</NuxtLink>
        <NuxtLink to="/account" class="account-link">Account</NuxtLink>
        <button @click="handleLogout">Sign out</button>
      </div>
      <div class="user-bar" v-else>
        <NuxtLink to="/login" class="account-link">Sign in</NuxtLink>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const { getUser, signOut } = useAuth()
const { isSuperuser, isEditor } = useRole()

const currentUser = ref<any>(null)
const displayName = computed(() => currentUser.value?.email || '')

onMounted(async () => {
  currentUser.value = await getUser()
})

// Also watch cookie user for reactivity on email login
const cookieUser = useSupabaseUser()
watch(cookieUser, async () => {
  currentUser.value = await getUser()
})

async function handleLogout() {
  await signOut()
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
  font-family: var(--font-brand);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--color-text-primary);
  text-decoration: none;
  white-space: nowrap;
}
.logo-ces {
  font-variant: small-caps;
  text-transform: lowercase;
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
.role-badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.role-badge.superuser {
  background: var(--color-marquee-bg);
  color: var(--color-marquee-fg);
}
.role-badge.editor {
  background: var(--color-pending-bg);
  color: var(--color-pending-fg);
}
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
.account-link { color: var(--color-text-tertiary); text-decoration: none; font-size: 0.75rem; padding: 0.25rem 0.5rem; border: 1px solid var(--color-border-input); border-radius: 4px; }
.account-link:hover { background: var(--color-bg-hover); }
</style>
