<script setup lang="ts">
const { user, getClient, getAuthHeaders } = useAuth()
const config = useRuntimeConfig()

interface DeviceToken {
  token: string
  user_id: string
  device_type: string
  created_at: string
  expires_at: string
}

interface DeviceWithStatus extends DeviceToken {
  online: boolean | null  // null = not yet checked
  checking: boolean
}

const devices = ref<DeviceWithStatus[]>([])
const loading = ref(true)
const error = ref('')
const actionLoading = ref<string | null>(null)
const confirmDialog = ref<{ token: string; action: 'logout' | 'remove' } | null>(null)

const cesclaw = async () => (await getClient()).schema('cesclaw')

const proxyUrl = computed(() => `${config.public.supabase.url}/functions/v1/device-proxy`)

async function fetchDevices() {
  loading.value = true
  error.value = ''
  try {
    const db = await cesclaw()
    const { data, error: err } = await db
      .from('device_auth_tokens')
      .select('*')
      .order('created_at', { ascending: false })

    if (err) throw err
    devices.value = ((data as DeviceToken[]) || []).map(d => ({
      ...d,
      online: null,
      checking: false,
    }))

    // Ping each device for live status
    for (const device of devices.value) {
      pingDevice(device)
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load devices'
  } finally {
    loading.value = false
  }
}

async function pingDevice(device: DeviceWithStatus) {
  device.checking = true
  try {
    const headers = await getAuthHeaders()
    const resp = await fetch(
      `${proxyUrl.value}?action=status&token=${device.token}`,
      { headers }
    )
    if (resp.ok) {
      const data = await resp.json()
      device.online = data.connected
    } else {
      device.online = false
    }
  } catch {
    device.online = false
  } finally {
    device.checking = false
  }
}

function deviceIcon(type: string): string {
  switch (type) {
    case 'linux': return 'terminal'
    case 'ios': return 'phone'
    case 'android': return 'phone'
    default: return 'server'
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'just now'
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

function truncateToken(token: string): string {
  return token.substring(0, 8) + '...'
}

async function proxyAction(token: string, action: string, eventType?: string) {
  actionLoading.value = token
  try {
    const headers = await getAuthHeaders()
    const resp = await fetch(proxyUrl.value, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action,
        token,
        event_type: eventType,
      }),
    })
    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(body)
    }
    return await resp.json()
  } catch (e: any) {
    error.value = e.message
    return null
  } finally {
    actionLoading.value = null
  }
}

async function handleDeploy(token: string) {
  await proxyAction(token, 'notify', 'deploy_skill')
}

async function handleReauthorize(token: string) {
  await proxyAction(token, 'notify', 'reauthorize')
}

async function handleLogout(token: string) {
  await proxyAction(token, 'notify', 'logout')
  confirmDialog.value = null
  setTimeout(() => fetchDevices(), 2000)
}

async function handleRemove(token: string) {
  await proxyAction(token, 'remove')
  confirmDialog.value = null
  devices.value = devices.value.filter(d => d.token !== token)
}

function confirmAction(token: string, action: 'logout' | 'remove') {
  confirmDialog.value = { token, action }
}

function cancelConfirm() {
  confirmDialog.value = null
}

function executeConfirm() {
  if (!confirmDialog.value) return
  if (confirmDialog.value.action === 'logout') {
    handleLogout(confirmDialog.value.token)
  } else {
    handleRemove(confirmDialog.value.token)
  }
}

onMounted(() => {
  if (user.value) fetchDevices()
})

watch(user, (u) => {
  if (u) fetchDevices()
})
</script>

<template>
  <div class="page-inner">
    <div class="page-header">
      <NuxtLink to="/" class="back-link">
        ← Back
      </NuxtLink>
      <h1 class="page-title">Devices</h1>
      <p class="page-sub">
        Manage connected cesClaw agents. Devices register themselves when you run the binary.
      </p>
    </div>

    <!-- Auth gate -->
    <div v-if="!user" class="auth-gate">
      <p class="auth-gate-text">Sign in to manage devices.</p>
      <NuxtLink to="/login" class="auth-gate-btn">Sign in</NuxtLink>
    </div>

    <template v-else>
      <!-- Error banner -->
      <div v-if="error" class="error-banner" @click="error = ''">
        {{ error }}
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="device-list">
        <div v-for="i in 2" :key="i" class="device-card skeleton">
          <div class="skel-icon"></div>
          <div class="skel-lines">
            <div class="skel-line w60"></div>
            <div class="skel-line w40"></div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="devices.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <p class="empty-text">No devices registered</p>
        <p class="empty-hint">
          Run <code>./cesclaw</code> on a Linux machine to register it.
        </p>
      </div>

      <!-- Device list -->
      <div v-else class="device-list">
        <div
          v-for="device in devices"
          :key="device.token"
          class="device-card"
          :class="{ expired: isExpired(device.expires_at) }"
        >
          <div class="device-main">
            <div class="device-icon">
              <svg v-if="deviceIcon(device.device_type) === 'terminal'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              <svg v-else-if="deviceIcon(device.device_type) === 'phone'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
            </div>

            <div class="device-info">
              <div class="device-name">
                <span class="status-dot" :class="{
                  online: device.online === true,
                  offline: device.online === false,
                  checking: device.online === null,
                }" :title="device.online === true ? 'Online' : device.online === false ? 'Offline' : 'Checking...'"></span>
                {{ device.device_type }}
                <span class="device-token" :title="device.token">{{ truncateToken(device.token) }}</span>
              </div>
              <div class="device-meta">
                Registered {{ formatDate(device.created_at) }}
                <span v-if="device.online === true" class="badge badge-online">online</span>
                <span v-else-if="device.online === false && !device.checking" class="badge badge-offline">offline</span>
                <span v-if="isExpired(device.expires_at)" class="badge badge-expired">auth expired</span>
              </div>
            </div>
          </div>

          <div class="device-actions">
            <button
              class="action-btn deploy"
              :disabled="actionLoading === device.token || device.online !== true"
              @click="handleDeploy(device.token)"
              title="Deploy compiled skills to device (must be online)"
            >
              Deploy
            </button>
            <button
              class="action-btn reauth"
              :disabled="actionLoading === device.token || device.online !== true"
              @click="handleReauthorize(device.token)"
              title="Send reauthorize signal to device (must be online)"
            >
              Reauthorize
            </button>
            <button
              class="action-btn logout-btn"
              :disabled="actionLoading === device.token || device.online !== true"
              @click="confirmAction(device.token, 'logout')"
              title="Remotely log out and wipe device tokens (must be online)"
            >
              Logout
            </button>
            <button
              class="action-btn remove-btn"
              :disabled="actionLoading === device.token"
              @click="confirmAction(device.token, 'remove')"
              title="Remove device registration"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <!-- Confirm dialog -->
      <Teleport to="body">
        <div v-if="confirmDialog" class="confirm-overlay" @click.self="cancelConfirm">
          <div class="confirm-card">
            <p class="confirm-title" v-if="confirmDialog.action === 'logout'">
              Log out this device?
            </p>
            <p class="confirm-title" v-else>
              Remove this device?
            </p>
            <p class="confirm-body" v-if="confirmDialog.action === 'logout'">
              This will wipe the device's tokens and stop the daemon. The user must be physically present to re-authenticate.
            </p>
            <p class="confirm-body" v-else>
              This removes the device registration. The daemon will lose its TURN connection on next heartbeat.
            </p>
            <div class="confirm-actions">
              <button class="confirm-cancel" @click="cancelConfirm">Cancel</button>
              <button
                class="confirm-execute"
                :class="{ destructive: confirmDialog.action === 'logout' }"
                @click="executeConfirm"
              >
                {{ confirmDialog.action === 'logout' ? 'Log out device' : 'Remove device' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.page-inner {
  max-width: var(--max-content);
  margin: 0 auto;
  padding: var(--sp-8) var(--sp-5);
}

.back-link {
  display: inline-block;
  font-size: var(--fs-sm);
  color: var(--c-drift);
  margin-bottom: var(--sp-6);
  transition: color var(--dur-fast) var(--ease-out);
}
.back-link:hover {
  color: var(--c-glow);
}

.page-header {
  margin-bottom: var(--sp-8);
}

.page-title {
  font-family: var(--font-brand);
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-crest);
  letter-spacing: -0.02em;
  margin-bottom: var(--sp-3);
}

.page-sub {
  font-size: var(--fs-sm);
  color: var(--c-drift);
  line-height: var(--lh-body);
  margin: 0;
}

/* Auth gate */
.auth-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-10);
  text-align: center;
}
.auth-gate-text {
  font-size: var(--fs-base);
  color: var(--c-drift);
}
.auth-gate-btn {
  display: inline-block;
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-abyss);
  background: var(--c-glow);
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--radius-full);
  transition: all var(--dur-fast) var(--ease-out);
}
.auth-gate-btn:hover {
  background: var(--c-glow-bright);
  box-shadow: var(--shadow-glow);
}

/* Error */
.error-banner {
  background: #3d1117;
  color: #f85149;
  border: 1px solid #f8514933;
  border-radius: var(--radius-md);
  padding: var(--sp-3) var(--sp-4);
  margin-bottom: var(--sp-6);
  font-size: var(--fs-sm);
  cursor: pointer;
}

/* Device list */
.device-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.device-card {
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  padding: var(--sp-4) var(--sp-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  transition: border-color var(--dur-fast) var(--ease-out);
  animation: fadeInUp var(--dur-slow) var(--ease-out) backwards;
}
.device-card:nth-child(2) { animation-delay: 60ms; }
.device-card:nth-child(3) { animation-delay: 120ms; }
.device-card:nth-child(4) { animation-delay: 180ms; }

.device-card:hover {
  border-color: var(--c-shelf);
}

.device-card.expired {
  border-color: #f8514933;
}

.device-main {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  min-width: 0;
}

.device-icon {
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-trench);
  border-radius: var(--radius-sm);
  color: var(--c-glow);
}
.device-icon svg {
  width: 1.1rem;
  height: 1.1rem;
}

.device-info {
  min-width: 0;
}

.device-name {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-crest);
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.device-token {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 400;
  color: var(--c-drift);
  background: var(--c-trench);
  padding: 0.1em 0.4em;
  border-radius: var(--radius-sm);
}

.device-meta {
  font-size: var(--fs-xs);
  color: var(--c-drift);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.badge {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.1em 0.5em;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-online {
  background: #0d2818;
  color: #56d364;
}

.badge-offline {
  background: var(--c-trench);
  color: var(--c-drift);
}

.badge-expired {
  background: #3d1117;
  color: #f85149;
}

/* Status dot */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--c-shelf);
}
.status-dot.online {
  background: #3fb950;
  box-shadow: 0 0 6px #3fb95066;
}
.status-dot.offline {
  background: var(--c-shelf);
}
.status-dot.checking {
  background: var(--c-shelf);
  animation: breathe 1.5s ease-in-out infinite;
}

/* Actions */
.device-actions {
  display: flex;
  gap: var(--sp-2);
  flex-shrink: 0;
}

.action-btn {
  font-family: var(--font-body);
  font-size: var(--fs-xs);
  font-weight: 500;
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-trench);
  background: var(--c-deep);
  color: var(--c-foam);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}
.action-btn:hover:not(:disabled) {
  background: var(--c-trench);
  border-color: var(--c-shelf);
}
.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn.deploy:hover:not(:disabled) {
  color: var(--c-glow);
  border-color: var(--c-glow-dim);
  background: var(--c-glow-faint);
}

.action-btn.reauth:hover:not(:disabled) {
  color: var(--c-glow);
  border-color: var(--c-glow-dim);
}

.action-btn.logout-btn:hover:not(:disabled) {
  color: var(--c-warning);
  border-color: #f59e0b44;
}

.action-btn.remove-btn:hover:not(:disabled) {
  color: #f85149;
  border-color: #f8514944;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--sp-16) var(--sp-4);
  text-align: center;
}
.empty-icon {
  width: 3rem;
  height: 3rem;
  color: var(--c-shelf);
  margin-bottom: var(--sp-4);
}
.empty-icon svg {
  width: 100%;
  height: 100%;
}
.empty-text {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-foam);
  margin-bottom: var(--sp-2);
}
.empty-hint {
  font-size: var(--fs-sm);
  color: var(--c-drift);
  margin: 0;
}
.empty-hint code {
  font-size: 0.8em;
}

/* Skeleton */
.device-card.skeleton {
  padding: var(--sp-5);
  pointer-events: none;
}
.skel-icon {
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--c-trench) 0%, var(--c-shelf) 50%, var(--c-trench) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
.skel-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.skel-line {
  height: 0.75rem;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--c-trench) 0%, var(--c-shelf) 50%, var(--c-trench) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
.skel-line.w60 { width: 60%; }
.skel-line.w40 { width: 40%; }

/* Confirm dialog */
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(6, 10, 20, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn var(--dur-fast) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.confirm-card {
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-lg);
  padding: var(--sp-6);
  width: 100%;
  max-width: 380px;
  box-shadow: var(--shadow-lg);
  animation: fadeInUp var(--dur-normal) var(--ease-spring);
}

.confirm-title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-crest);
  margin-bottom: var(--sp-3);
}

.confirm-body {
  font-size: var(--fs-sm);
  color: var(--c-drift);
  line-height: var(--lh-body);
  margin-bottom: var(--sp-6);
}

.confirm-actions {
  display: flex;
  gap: var(--sp-3);
  justify-content: flex-end;
}

.confirm-cancel {
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 500;
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-trench);
  background: var(--c-deep);
  color: var(--c-foam);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.confirm-cancel:hover {
  background: var(--c-trench);
}

.confirm-execute {
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 600;
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-glow-dim);
  background: var(--c-glow);
  color: var(--c-abyss);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.confirm-execute:hover {
  background: var(--c-glow-bright);
  box-shadow: var(--shadow-glow);
}
.confirm-execute.destructive {
  background: #f85149;
  border-color: #f8514966;
  color: white;
}
.confirm-execute.destructive:hover {
  background: #ff6b63;
  box-shadow: 0 0 20px #f8514933;
}

/* Responsive */
@media (max-width: 640px) {
  .page-inner {
    padding: var(--sp-3);
  }
  .device-card {
    flex-direction: column;
    align-items: stretch;
  }
  .device-actions {
    justify-content: flex-end;
    margin-top: var(--sp-2);
  }
}
</style>