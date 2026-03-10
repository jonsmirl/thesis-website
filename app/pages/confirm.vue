<template>
  <div class="login-container">
    <div class="login-card">
      <template v-if="mode === 'recovery'">
        <h1>Set New Password</h1>
        <p class="subtitle">Enter your new password below.</p>
        <form @submit.prevent="handleReset">
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
      </template>
      <template v-else-if="mode === 'confirming'">
        <h1>Signing you in...</h1>
        <p class="subtitle">Processing your authentication.</p>
        <p v-if="error" class="error">{{ error }}</p>
      </template>
      <template v-else>
        <h1>Confirmed</h1>
        <p class="subtitle">Redirecting...</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const cookieClient = useSupabaseClient()
const mode = ref<'confirming' | 'recovery' | 'done'>('confirming')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

onMounted(async () => {
  const hash = window.location.hash.substring(1)
  const params = new URLSearchParams(hash)
  const type = params.get('type')
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  // Recovery flow (password reset)
  if (type === 'recovery') {
    const { data, error: err } = await cookieClient.auth.getSession()
    if (err || !data.session) {
      error.value = 'Recovery link expired or invalid. Please request a new one.'
      return
    }
    mode.value = 'recovery'
    return
  }

  // OAuth implicit flow — access_token in hash fragment
  if (accessToken) {
    try {
      const authClient = useAuthClient()

      // Set session from hash tokens
      const { data, error: setErr } = await authClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      })

      if (data?.session?.user) {
        // Ensure community profile exists via Edge Function
        try {
          const config = useRuntimeConfig()
          await $fetch(`${config.public.supabase.url}/functions/v1/ensure-profile`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${data.session.access_token}`,
              'Content-Type': 'application/json',
              'apikey': config.public.supabase.key,
            },
          })
        } catch (e) {
          // Profile may already exist, not fatal
          console.warn('[Confirm] ensure-profile:', e)
        }

        mode.value = 'done'
        navigateTo('/')
        return
      }

      if (setErr) {
        error.value = 'Authentication failed. Please try again.'
        return
      }
    } catch (err: any) {
      error.value = err.message || 'Authentication failed.'
      return
    }
  }

  // Regular email confirmation
  const { data } = await cookieClient.auth.getSession()
  if (data.session) {
    mode.value = 'done'
    navigateTo('/')
  }
})

async function handleReset() {
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
  const { error: err } = await cookieClient.auth.updateUser({
    password: newPassword.value,
  })
  if (err) {
    error.value = err.message
  } else {
    success.value = 'Password updated. Redirecting...'
    setTimeout(() => navigateTo('/'), 1500)
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
.success {
  color: var(--color-consistent-fg);
  margin: 0.75rem 0 0;
  font-size: 0.85rem;
}
</style>
