<template>
  <div class="login-container">
    <div class="login-card">
      <h1>CES Formalization</h1>
      <p class="subtitle">Access restricted. Sign in to continue.</p>
      <form @submit.prevent="handleLogin">
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          required
          :disabled="loading"
          aria-label="Email address"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          required
          :disabled="loading"
          aria-label="Password"
        />
        <button type="submit" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const client = useSupabaseClient()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  const { error: err } = await client.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  if (err) {
    error.value = err.message
  } else {
    navigateTo('/')
  }
  loading.value = false
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-login);
}
.login-card {
  background: var(--color-bg-page);
  padding: 2.5rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  width: 100%;
  max-width: 380px;
}
h1 {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
}
.subtitle {
  color: var(--color-text-muted);
  margin: 0 0 1.5rem;
  font-size: 0.9rem;
}
input {
  display: block;
  width: 100%;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.75rem;
  border: 1px solid var(--color-border-input);
  border-radius: 4px;
  font-size: 0.95rem;
  box-sizing: border-box;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}
button {
  width: 100%;
  padding: 0.6rem;
  background: var(--color-btn-primary);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.95rem;
  cursor: pointer;
}
button:hover { background: var(--color-btn-primary-hover); }
button:disabled { opacity: 0.6; cursor: not-allowed; }
.error {
  color: var(--color-error);
  margin: 0.75rem 0 0;
  font-size: 0.85rem;
}
</style>
