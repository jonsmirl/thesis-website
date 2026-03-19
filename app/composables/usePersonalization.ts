/**
 * Personalization composable — geolocation, locale, and user preferences.
 * All data stays on-device (localStorage + browser APIs).
 */
import { getPreference, setPreference } from '~/utils/local-tokens'

interface LocationData {
  lat: number
  lng: number
  city?: string
  zip?: string
  expires_at: number
}

interface LocaleData {
  language: string
  timezone: string
  currency: string
  units: 'metric' | 'imperial'
}

export function usePersonalization() {
  // ─── Locale (synchronous from browser) ───────────────────────────────────

  function getLocale(): LocaleData {
    const language = navigator.language || 'en-US'
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

    let currency = 'USD'
    try {
      const parts = new Intl.NumberFormat(language, { style: 'currency', currency: 'USD' })
        .resolvedOptions()
      currency = parts.currency || 'USD'
    } catch {}

    const units: 'metric' | 'imperial' = language === 'en-US' ? 'imperial' : 'metric'

    return { language, timezone, currency, units }
  }

  // ─── Geolocation ──────────────────────────────────────────────────────────

  function getCachedLocation(): LocationData | null {
    const cached = getPreference<LocationData>('location_cache')
    if (!cached) return null
    if (Date.now() > cached.expires_at) return null
    return cached
  }

  async function requestLocation(): Promise<LocationData | null> {
    if (!navigator.geolocation) return null

    const cached = getCachedLocation()
    if (cached) return cached

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc: LocationData = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            expires_at: Date.now() + 60 * 60 * 1000,
          }

          try {
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`,
            )
            if (resp.ok) {
              const data = await resp.json()
              loc.city = data.address?.city || data.address?.town || data.address?.village
              loc.zip = data.address?.postcode
            }
          } catch {}

          setPreference('location_cache', loc)
          resolve(loc)
        },
        () => resolve(null),
        { timeout: 10000, maximumAge: 60000 },
      )
    })
  }

  // ─── Units preference (overrides locale default) ──────────────────────────

  function getUnits(): 'metric' | 'imperial' {
    const pref = getPreference<'metric' | 'imperial'>('units')
    if (pref) return pref
    return getLocale().units
  }

  function setUnits(units: 'metric' | 'imperial') {
    setPreference('units', units)
  }

  // ─── Build full pagelet context ───────────────────────────────────────────

  async function buildContext(
    query: string,
    params: Record<string, unknown>,
    requiredPermissions: string[],
    tokens: Record<string, string>,
    fetchAllowlist: string[],
  ) {
    let location = null
    if (requiredPermissions.includes('geolocation')) {
      location = await requestLocation()
    }

    const locale = getLocale()
    const units = getUnits()

    return {
      query,
      params,
      location: location ? { lat: location.lat, lng: location.lng, city: location.city, zip: location.zip } : null,
      locale: { ...locale, units },
      tokens,
      device: {
        online: navigator.onLine,
        platform: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      },
      _fetchAllowlist: fetchAllowlist,
    }
  }

  return {
    getLocale,
    requestLocation,
    getCachedLocation,
    getUnits,
    setUnits,
    buildContext,
  }
}
