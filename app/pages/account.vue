<template>
  <div class="container--reading">
    <NavHeader />
    <div class="account-card">
      <h2>Change Password</h2>
      <form @submit.prevent="handleChange">
        <input
          v-model="newPassword"
          type="password"
          placeholder="New password"
          required
          minlength="8"
          :disabled="loading"
          aria-label="New password"
        />
        <input
          v-model="confirmPassword"
          type="password"
          placeholder="Confirm password"
          required
          minlength="8"
          :disabled="loading"
          aria-label="Confirm password"
        />
        <button type="submit" :disabled="loading">
          {{ loading ? 'Updating...' : 'Update password' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="success" class="success">{{ success }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()

// Redirect if not logged in
if (!user.value) {
  navigateTo('/login')
}

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function handleChange() {
  error.value = ''
  success.value = ''

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  if (newPassword.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }

  loading.value = true
  const { error: err } = await client.auth.updateUser({
    password: newPassword.value,
  })
  if (err) {
    error.value = err.message
  } else {
    success.value = 'Password updated successfully.'
    newPassword.value = ''
    confirmPassword.value = ''
  }
  loading.value = false
}
</script>

<style scoped>
.account-card {
  max-width: 400px;
  margin: 3rem auto;
}
h2 {
  font-size: 1.3rem;
  margin: 0 0 1.5rem;
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
.success {
  color: var(--color-consistent-fg);
  margin: 0.75rem 0 0;
  font-size: 0.85rem;
}
</style>
