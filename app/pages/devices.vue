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

// Device panel state
const panel = ref<{ token: string; deviceType: string } | null>(null)
const panelTab = ref<'skills' | 'logs'>('skills')
const deviceInfo = ref<any>(null)

// Skills tab
interface SkillEntry {
  name: string
  skill_class: string
  compiled_at: string
  onDevice: boolean
  selected: boolean
}
const allSkills = ref<SkillEntry[]>([])
const skillsLoading = ref(false)
const deploying = ref(false)
const deployMessage = ref('')

// Logs tab
const logLines = ref<any[]>([])
const logPage = ref(0)
const logTotalPages = ref(0)
const logLoading = ref(false)
const logError = ref('')

async function queryDevice(token: string, request: any): Promise<any> {
  const headers = await getAuthHeaders()
  const resp = await fetch(proxyUrl.value, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'query', token, request }),
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(body)
  }
  const data = await resp.json()
  return data.response
}

async function openPanel(device: DeviceWithStatus) {
  panel.value = { token: device.token, deviceType: device.device_type }
  panelTab.value = 'skills'
  deployMessage.value = ''
  deviceInfo.value = null
  allSkills.value = []
  logLines.value = []

  await loadSkillsTab(device.token)
}

async function loadSkillsTab(token: string) {
  skillsLoading.value = true
  try {
    // Fetch user's skills from Supabase and device's installed skills in parallel
    const db = await cesclaw()
    const [supabaseResult, deviceSkills, status] = await Promise.all([
      db.from('compiled_skills').select('name, skill_class, compiled_at, verified').order('name'),
      queryDevice(token, { type: 'get_skills' }).catch(() => ({ skills: [] })),
      queryDevice(token, { type: 'get_status' }).catch(() => null),
    ])

    deviceInfo.value = status
    const onDeviceNames = new Set((deviceSkills?.skills || []).map((s: any) => s.name))

    allSkills.value = ((supabaseResult.data || []) as any[]).map(s => ({
      name: s.name,
      skill_class: s.skill_class,
      compiled_at: s.compiled_at,
      onDevice: onDeviceNames.has(s.name),
      selected: onDeviceNames.has(s.name),
    }))
  } catch (e: any) {
    error.value = e.message
  } finally {
    skillsLoading.value = false
  }
}

function toggleSkill(skill: SkillEntry) {
  skill.selected = !skill.selected
}

const hasChanges = computed(() => {
  return allSkills.value.some(s => s.selected !== s.onDevice)
})

const toInstall = computed(() => allSkills.value.filter(s => s.selected && !s.onDevice).map(s => s.name))
const toRemove = computed(() => allSkills.value.filter(s => !s.selected && s.onDevice).map(s => s.name))

async function deploySkills() {
  if (!panel.value || !hasChanges.value) return
  deploying.value = true
  deployMessage.value = ''
  try {
    // Send install/remove lists via RPC query — device fetches from Supabase
    const result = await queryDevice(panel.value.token, {
      type: 'sync_skills',
      install: toInstall.value,
      remove: toRemove.value,
    })

    const installed = result?.installed || 0
    const removed = result?.removed || 0
    deployMessage.value = `Deployed: ${installed} installed, ${removed} removed`

    // Refresh skill list
    await loadSkillsTab(panel.value.token)
  } catch (e: any) {
    deployMessage.value = `Error: ${e.message}`
  } finally {
    deploying.value = false
  }
}

async function switchTab(tab: 'skills' | 'logs') {
  panelTab.value = tab
  if (tab === 'logs' && panel.value) {
    await fetchLogs(panel.value.token, 0)
  }
}

async function fetchLogs(token: string, page: number) {
  logLoading.value = true
  logError.value = ''
  try {
    const result = await queryDevice(token, { type: 'fetch_logs', page, lines: 50 })
    logLines.value = result.lines || []
    logPage.value = result.page || 0
    logTotalPages.value = result.total_pages || 0
  } catch (e: any) {
    logError.value = e.message || 'Failed to fetch logs'
  } finally {
    logLoading.value = false
  }
}

function closePanel() {
  panel.value = null
}

async function logPagePrev() {
  if (!panel.value || logPage.value <= 0) return
  await fetchLogs(panel.value.token, logPage.value - 1)
}

async function logPageNext() {
  if (!panel.value || logPage.value >= logTotalPages.value - 1) return
  await fetchLogs(panel.value.token, logPage.value + 1)
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
              class="action-btn manage-btn"
              :disabled="device.online !== true"
              @click="openPanel(device)"
              title="Manage skills and view logs (must be online)"
            >
              Manage
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

      <!-- Device management panel -->
      <Teleport to="body">
        <div v-if="panel" class="log-overlay" @click.self="closePanel">
          <div class="log-panel">
            <div class="log-header">
              <div class="log-title">
                <span class="log-device-type">{{ panel.deviceType }}</span>
                {{ panel.token.substring(0, 8) }}...
                <span v-if="deviceInfo" class="log-version">v{{ deviceInfo.version || '?' }}</span>
              </div>
              <button class="log-close" @click="closePanel">&times;</button>
            </div>

            <!-- Tabs -->
            <div class="panel-tabs">
              <button class="panel-tab" :class="{ active: panelTab === 'skills' }" @click="switchTab('skills')">Skills</button>
              <button class="panel-tab" :class="{ active: panelTab === 'logs' }" @click="switchTab('logs')">Logs</button>
            </div>

            <!-- Skills tab -->
            <div v-if="panelTab === 'skills'" class="log-content">
              <div v-if="skillsLoading" class="log-loading">Loading skills...</div>
              <div v-else-if="allSkills.length === 0" class="log-empty">No compiled skills. Create one on the Skills page.</div>
              <div v-else class="skills-list">
                <div
                  v-for="skill in allSkills"
                  :key="skill.name"
                  class="skill-row"
                  :class="{ changed: skill.selected !== skill.onDevice }"
                  @click="toggleSkill(skill)"
                >
                  <div class="skill-check" :class="{ checked: skill.selected }">
                    <svg v-if="skill.selected" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
                  </div>
                  <div class="skill-info">
                    <div class="skill-name">{{ skill.name }}</div>
                    <div class="skill-meta">
                      <span class="skill-class-tag">{{ skill.skill_class }}</span>
                      <span v-if="skill.onDevice && skill.selected" class="skill-status on-device">on device</span>
                      <span v-else-if="skill.selected && !skill.onDevice" class="skill-status to-install">will install</span>
                      <span v-else-if="!skill.selected && skill.onDevice" class="skill-status to-remove">will remove</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Deploy bar (skills tab only) -->
            <div v-if="panelTab === 'skills' && allSkills.length > 0" class="deploy-bar">
              <div class="deploy-summary">
                <span v-if="!hasChanges" class="deploy-status">No changes</span>
                <span v-else class="deploy-status has-changes">
                  {{ toInstall.length ? `+${toInstall.length} install` : '' }}
                  {{ toInstall.length && toRemove.length ? ', ' : '' }}
                  {{ toRemove.length ? `-${toRemove.length} remove` : '' }}
                </span>
                <span v-if="deployMessage" class="deploy-msg" :class="{ 'deploy-err': deployMessage.startsWith('Error') }">{{ deployMessage }}</span>
              </div>
              <button
                class="deploy-btn"
                :disabled="!hasChanges || deploying"
                @click="deploySkills"
              >
                {{ deploying ? 'Deploying...' : 'Deploy' }}
              </button>
            </div>

            <!-- Logs tab -->
            <div v-if="panelTab === 'logs'" class="log-content">
              <div v-if="logLoading" class="log-loading">Loading...</div>
              <div v-else-if="logError" class="log-error">{{ logError }}</div>
              <div v-else-if="logLines.length === 0" class="log-empty">No log entries</div>
              <div v-else class="log-entries">
                <div v-for="(line, i) in logLines" :key="i" class="log-entry">
                  <span v-if="line.timestamp" class="log-ts">{{ new Date(line.timestamp).toLocaleTimeString() }}</span>
                  <span v-if="line.event_type" class="log-event">{{ line.event_type }}</span>
                  <span v-if="line.action" class="log-action">{{ line.action }}</span>
                  <span class="log-detail">{{ line.message || line.result || JSON.stringify(line) }}</span>
                </div>
              </div>
            </div>

            <!-- Log pagination -->
            <div v-if="panelTab === 'logs' && logTotalPages > 1" class="log-pagination">
              <button class="log-page-btn" :disabled="logPage <= 0" @click="logPagePrev">Prev</button>
              <span class="log-page-info">{{ logPage + 1 }} / {{ logTotalPages }}</span>
              <button class="log-page-btn" :disabled="logPage >= logTotalPages - 1" @click="logPageNext">Next</button>
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

.action-btn.manage-btn:hover:not(:disabled) {
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

/* Log panel */
.log-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(6, 10, 20, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn var(--dur-fast) var(--ease-out);
}

.log-panel {
  background: var(--c-abyss);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 720px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  animation: fadeInUp var(--dur-normal) var(--ease-spring);
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-5);
  border-bottom: 1px solid var(--c-trench);
}

.log-title {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--c-crest);
}

.log-device-type {
  font-weight: 600;
  color: var(--c-glow);
  margin-right: var(--sp-2);
}

.log-close {
  background: none;
  border: none;
  color: var(--c-drift);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 var(--sp-1);
  line-height: 1;
}
.log-close:hover { color: var(--c-crest); }

.log-version {
  font-weight: 400;
  color: var(--c-drift);
  font-size: var(--fs-xs);
  margin-left: var(--sp-2);
}

/* Tabs */
.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--c-trench);
}

.panel-tab {
  flex: 1;
  padding: var(--sp-2) var(--sp-4);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--c-drift);
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.panel-tab:hover { color: var(--c-foam); }
.panel-tab.active {
  color: var(--c-glow);
  border-bottom-color: var(--c-glow);
}

/* Skills list */
.skills-list {
  display: flex;
  flex-direction: column;
}

.skill-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-1);
  border-bottom: 1px solid var(--c-deep);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}
.skill-row:hover { background: var(--c-glow-faint); }
.skill-row.changed { background: var(--c-trench); }

.skill-check {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  border: 2px solid var(--c-shelf);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--dur-fast) var(--ease-out);
}
.skill-check.checked {
  background: var(--c-glow);
  border-color: var(--c-glow);
  color: var(--c-abyss);
}
.skill-check svg { width: 0.75rem; height: 0.75rem; }

.skill-info { min-width: 0; }

.skill-name {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-crest);
}

.skill-meta {
  display: flex;
  gap: var(--sp-2);
  align-items: center;
  margin-top: 2px;
}

.skill-class-tag {
  font-size: 0.6875rem;
  background: var(--c-trench);
  color: var(--c-drift);
  padding: 0.1em 0.4em;
  border-radius: var(--radius-sm);
}

.skill-status {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.skill-status.on-device { color: var(--c-drift); }
.skill-status.to-install { color: var(--c-glow); }
.skill-status.to-remove { color: #f85149; }

/* Deploy bar */
.deploy-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-3) var(--sp-5);
  border-top: 1px solid var(--c-trench);
  gap: var(--sp-3);
}

.deploy-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.deploy-status {
  font-size: var(--fs-xs);
  color: var(--c-drift);
}
.deploy-status.has-changes { color: var(--c-glow); font-weight: 500; }

.deploy-msg {
  font-size: var(--fs-xs);
  color: var(--c-glow);
}
.deploy-msg.deploy-err { color: #f85149; }

.deploy-btn {
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 600;
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-glow-dim);
  background: var(--c-glow);
  color: var(--c-abyss);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}
.deploy-btn:hover:not(:disabled) {
  background: var(--c-glow-bright);
  box-shadow: var(--shadow-glow);
}
.deploy-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.log-info-bar {
  display: flex;
  gap: var(--sp-4);
  padding: var(--sp-2) var(--sp-5);
  font-size: var(--fs-xs);
  color: var(--c-drift);
  border-bottom: 1px solid var(--c-deep);
}

.log-skills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-5);
  border-bottom: 1px solid var(--c-deep);
}

.log-skill-tag {
  font-size: var(--fs-xs);
  background: var(--c-trench);
  color: var(--c-foam);
  padding: 0.15em 0.5em;
  border-radius: var(--radius-sm);
  display: flex;
  gap: var(--sp-2);
  align-items: center;
}

.log-skill-class {
  color: var(--c-drift);
  font-size: 0.6875rem;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-3) var(--sp-5);
  min-height: 200px;
  max-height: 50vh;
}

.log-loading, .log-empty {
  text-align: center;
  color: var(--c-drift);
  padding: var(--sp-8);
  font-size: var(--fs-sm);
}

.log-error {
  text-align: center;
  color: #f85149;
  padding: var(--sp-8);
  font-size: var(--fs-sm);
}

.log-entries {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.log-entry {
  display: flex;
  gap: var(--sp-2);
  padding: var(--sp-1) 0;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  line-height: 1.5;
  color: var(--c-foam);
  border-bottom: 1px solid var(--c-deep);
}

.log-ts {
  color: var(--c-drift);
  flex-shrink: 0;
  min-width: 5.5em;
}

.log-event {
  color: var(--c-glow);
  flex-shrink: 0;
  font-weight: 500;
}

.log-action {
  color: #58a6ff;
  flex-shrink: 0;
}

.log-detail {
  color: var(--c-foam);
  word-break: break-word;
}

.log-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-5);
  border-top: 1px solid var(--c-trench);
}

.log-page-btn {
  font-family: var(--font-body);
  font-size: var(--fs-xs);
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-trench);
  background: var(--c-deep);
  color: var(--c-foam);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.log-page-btn:hover:not(:disabled) { background: var(--c-trench); }
.log-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.log-page-info {
  font-size: var(--fs-xs);
  color: var(--c-drift);
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