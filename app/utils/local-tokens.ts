/**
 * Service token + preference helpers using localStorage.
 * Platform sandbox (same-origin) is the security boundary — no encryption needed.
 */

const TOKEN_PREFIX = 'cesclaw-oauth-'
const PREF_PREFIX = 'cesclaw-pref-'

interface StoredToken {
  access_token: string
  refresh_token?: string
  expires_at?: number
  scope?: string
}

// ─── Service OAuth tokens (Google Calendar, GitHub, etc.) ───────────────────

export function saveServiceToken(provider: string, data: StoredToken): void {
  localStorage.setItem(`${TOKEN_PREFIX}${provider}`, JSON.stringify(data))
}

export function getServiceToken(provider: string): StoredToken | null {
  try {
    const raw = localStorage.getItem(`${TOKEN_PREFIX}${provider}`)
    if (!raw) return null
    const data: StoredToken = JSON.parse(raw)
    if (data.expires_at && Date.now() > data.expires_at) {
      localStorage.removeItem(`${TOKEN_PREFIX}${provider}`)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function removeServiceToken(provider: string): void {
  localStorage.removeItem(`${TOKEN_PREFIX}${provider}`)
}

export function getAllServiceTokens(): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(TOKEN_PREFIX)) continue
    try {
      const data: StoredToken = JSON.parse(localStorage.getItem(key)!)
      if (data.expires_at && Date.now() > data.expires_at) continue
      tokens[key.slice(TOKEN_PREFIX.length)] = data.access_token
    } catch {
      // skip corrupt entries
    }
  }
  return tokens
}

export function getConnectedProviders(): string[] {
  const providers: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(TOKEN_PREFIX)) {
      providers.push(key.slice(TOKEN_PREFIX.length))
    }
  }
  return providers
}

// ─── Preferences (units, location cache, etc.) ─────────────────────────────

export function getPreference<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${PREF_PREFIX}${key}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setPreference(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(`${PREF_PREFIX}${key}`)
    } else {
      localStorage.setItem(`${PREF_PREFIX}${key}`, JSON.stringify(value))
    }
  } catch {
    // storage full or unavailable
  }
}

// ─── Wallet ─────────────────────────────────────────────────────────────────

interface WalletData {
  address: string
  private_key: string
  balance_usdc: number
  spend_cap_usdc: number
}

export function getWallet(): WalletData | null {
  return getPreference<WalletData>('wallet')
}

export function setWallet(wallet: WalletData): void {
  setPreference('wallet', wallet)
}

export function removeWallet(): void {
  setPreference('wallet', null)
}
