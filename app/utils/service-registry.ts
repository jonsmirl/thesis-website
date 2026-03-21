/**
 * Service definitions registry.
 * Maps each service to the YAML frontmatter fields it contributes.
 */

export interface ServiceDefinition {
  id: string
  label: string
  emoji: string
  category: 'oauth' | 'permission' | 'api-key'
  provider?: 'google' | 'github' | 'microsoft'
  services: string[]
  required_tokens: string[]
  fetch_allowlist: string[]
  required_permissions: string[]
  env: string[]
}

export const SERVICE_REGISTRY: ServiceDefinition[] = [
  {
    id: 'google-calendar',
    label: 'Google Cal',
    emoji: '\uD83D\uDCC5',
    category: 'oauth',
    provider: 'google',
    services: ['google-calendar'],
    required_tokens: ['google'],
    fetch_allowlist: ['https://www.googleapis.com/calendar/*'],
    required_permissions: [],
    env: [],
  },
  {
    id: 'gmail',
    label: 'Gmail',
    emoji: '\uD83D\uDCE7',
    category: 'oauth',
    provider: 'google',
    services: ['gmail'],
    required_tokens: ['google'],
    fetch_allowlist: ['https://www.googleapis.com/gmail/*'],
    required_permissions: [],
    env: [],
  },
  {
    id: 'github',
    label: 'GitHub',
    emoji: '\uD83D\uDC19',
    category: 'oauth',
    provider: 'github',
    services: ['github'],
    required_tokens: ['github'],
    fetch_allowlist: ['https://api.github.com/*'],
    required_permissions: [],
    env: [],
  },
  {
    id: 'microsoft-calendar',
    label: 'MS Cal',
    emoji: '\uD83D\uDCC6',
    category: 'oauth',
    provider: 'microsoft',
    services: ['microsoft-calendar'],
    required_tokens: ['microsoft'],
    fetch_allowlist: ['https://graph.microsoft.com/*'],
    required_permissions: [],
    env: [],
  },
  {
    id: 'geolocation',
    label: 'Location',
    emoji: '\uD83C\uDF0D',
    category: 'permission',
    services: ['geolocation'],
    required_tokens: [],
    fetch_allowlist: [],
    required_permissions: ['geolocation'],
    env: [],
  },
  {
    id: 'weather',
    label: 'Weather',
    emoji: '\u26C5',
    category: 'api-key',
    services: ['weather'],
    required_tokens: [],
    fetch_allowlist: ['https://api.openweathermap.org/*'],
    required_permissions: [],
    env: ['OPENWEATHER_API_KEY'],
  },
]

const registryById = new Map(SERVICE_REGISTRY.map(s => [s.id, s]))

/** Look up a service definition by ID. */
export function getServiceDef(id: string): ServiceDefinition | undefined {
  return registryById.get(id)
}

/** Union all field arrays from enabled services, deduplicated. */
export function computeFrontmatterFields(enabledIds: Iterable<string>) {
  const services: string[] = []
  const required_tokens: string[] = []
  const fetch_allowlist: string[] = []
  const required_permissions: string[] = []
  const env: string[] = []

  for (const id of enabledIds) {
    const def = registryById.get(id)
    if (!def) continue
    services.push(...def.services)
    required_tokens.push(...def.required_tokens)
    fetch_allowlist.push(...def.fetch_allowlist)
    required_permissions.push(...def.required_permissions)
    env.push(...def.env)
  }

  return {
    services: [...new Set(services)],
    required_tokens: [...new Set(required_tokens)],
    fetch_allowlist: [...new Set(fetch_allowlist)],
    required_permissions: [...new Set(required_permissions)],
    env: [...new Set(env)],
  }
}

/**
 * Reverse operation: given frontmatter arrays, infer which services are enabled.
 * Returns enabled service IDs plus any "extras" — values that don't match a known service.
 */
export function inferEnabledServices(frontmatter: {
  services?: string[]
  required_tokens?: string[]
  fetch_allowlist?: string[]
  required_permissions?: string[]
  env?: string[]
}): { enabled: string[]; extras: typeof frontmatter } {
  const enabled: string[] = []

  const remainingServices = new Set(frontmatter.services || [])
  const remainingTokens = new Set(frontmatter.required_tokens || [])
  const remainingFetch = new Set(frontmatter.fetch_allowlist || [])
  const remainingPerms = new Set(frontmatter.required_permissions || [])
  const remainingEnv = new Set(frontmatter.env || [])

  // For each registry service, check if all its contributed values are present
  for (const def of SERVICE_REGISTRY) {
    const allServicesPresent = def.services.every(s => remainingServices.has(s))
    if (!allServicesPresent) continue

    // Service name matches — claim it
    enabled.push(def.id)
    for (const s of def.services) remainingServices.delete(s)
    for (const t of def.required_tokens) remainingTokens.delete(t)
    for (const f of def.fetch_allowlist) remainingFetch.delete(f)
    for (const p of def.required_permissions) remainingPerms.delete(p)
    for (const e of def.env) remainingEnv.delete(e)
  }

  const extras: typeof frontmatter = {}
  if (remainingServices.size) extras.services = [...remainingServices]
  if (remainingTokens.size) extras.required_tokens = [...remainingTokens]
  if (remainingFetch.size) extras.fetch_allowlist = [...remainingFetch]
  if (remainingPerms.size) extras.required_permissions = [...remainingPerms]
  if (remainingEnv.size) extras.env = [...remainingEnv]

  return { enabled, extras }
}
