<template>
  <div class="container--reading">
    <NavHeader />
    <div class="account-card">
      <h2>Account</h2>

      <!-- Provider info -->
      <div v-if="provider" class="provider-info">
        <p>Signed in via <strong>{{ provider }}</strong></p>
        <p class="email-display">{{ userEmail }}</p>
      </div>

      <!-- Display name / institution editing -->
      <div class="profile-section">
        <h3>Profile</h3>
        <label>
          Display Name
          <input
            v-model="displayName"
            type="text"
            placeholder="Display name"
            :disabled="profileLoading"
          />
        </label>
        <label>
          Institution
          <input
            v-model="institution"
            type="text"
            placeholder="Institution (optional)"
            :disabled="profileLoading"
          />
        </label>
        <button @click="saveProfile" :disabled="profileLoading">
          {{ profileLoading ? 'Saving...' : 'Save profile' }}
        </button>
        <p v-if="profileSuccess" class="success">{{ profileSuccess }}</p>
        <p v-if="profileError" class="error">{{ profileError }}</p>
      </div>

      <!-- Password change (email users only) -->
      <div v-if="provider === 'email'" class="password-section">
        <h3>Change Password</h3>
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
  </div>
</template>

<script setup lang="ts">
const { getUser, getClient, getSession } = useAuth()

const provider = ref<string | null>(null)
const userEmail = ref('')
const displayName = ref('')
const institution = ref('')
const profileLoading = ref(false)
const profileSuccess = ref('')
const profileError = ref('')

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

onMounted(async () => {
  const user = await getUser()
  if (!user) {
    navigateTo('/login')
    return
  }

  userEmail.value = user.email || ''

  // Detect provider
  const session = await getSession()
  if (session?.user?.app_metadata?.provider) {
    provider.value = session.user.app_metadata.provider
  } else {
    provider.value = 'email'
  }

  // Load profile
  const client = await getClient()
  const { data } = await client
    .from('community_profiles')
    .select('display_name, institution')
    .eq('user_id', user.id)
    .maybeSingle()

  if (data) {
    displayName.value = data.display_name || ''
    institution.value = data.institution || ''
  }
})

async function saveProfile() {
  profileLoading.value = true
  profileSuccess.value = ''
  profileError.value = ''

  try {
    const user = await getUser()
    if (!user) throw new Error('Not authenticated')

    const client = await getClient()
    const { error: err } = await client
      .from('community_profiles')
      .update({
        display_name: displayName.value || null,
        institution: institution.value || null,
      })
      .eq('user_id', user.id)

    if (err) throw err
    profileSuccess.value = 'Profile updated.'
  } catch (e: any) {
    profileError.value = e.message || 'Failed to update profile.'
  } finally {
    profileLoading.value = false
  }
}

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
  const client = await getClient()
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
h3 {
  font-size: 1rem;
  margin: 1.5rem 0 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-light);
}
h3:first-of-type {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}
.provider-info {
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}
.provider-info strong {
  text-transform: capitalize;
}
.email-display {
  color: var(--color-text-faint);
  font-size: 0.85rem;
}
label {
  display: block;
  font-size: 0.82rem;
  color: var(--color-text-tertiary);
  margin-bottom: 0.75rem;
}
label input {
  margin-top: 0.2rem;
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
.password-section {
  margin-top: 0;
}
</style>
