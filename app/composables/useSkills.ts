/**
 * Skills composable — CRUD for compiled skills via Supabase (cesclaw schema).
 */

export type LlmTier = 'none' | 'nano' | 'local_3b' | 'cloud_required'

export interface LlmStep {
  index: number
  original_prompt: string
  distilled_prompt: string
  few_shot_examples: { input: string; output: string }[]
  output_schema: Record<string, unknown> | null
  max_tokens: number
}

export interface StepManifestEntry {
  id: string
  depends_on: string[]
  is_output_step: boolean
  skill_class: 'deterministic' | 'llm_assisted' | 'llm_required'
}

export interface CompiledSkill {
  id: string
  name: string
  description: string
  skill_class: 'deterministic' | 'llm_assisted' | 'llm_required'
  llm_tier: LlmTier
  source_markdown: string
  compiled_script: string | null
  llm_steps: LlmStep[] | null
  verified: boolean
  compiled_at: string
  updated_at: string
  skill_type: 'skill' | 'workflow'
  schedule: string | null
  trigger_events: string[]
  step_count: number
  step_manifest: StepManifestEntry[] | null
}

export interface CompileResponse {
  name: string
  skill_class: string
  llm_tier: LlmTier
  compiled_script: string | null
  llm_steps: LlmStep[] | null
  verified: boolean
  cached: boolean
  skill_type: 'skill' | 'workflow'
  schedule: string | null
  trigger_events: string[]
  step_count: number
  step_manifest: StepManifestEntry[] | null
  error?: string
  retry_after?: number
}

export function useSkills() {
  const { getClient } = useAuth()

  // Helper to access the cesclaw schema — uses the auth-aware client
  const cesclaw = async () => (await getClient()).schema('cesclaw')

  async function listSkills(): Promise<CompiledSkill[]> {
    const db = await cesclaw()
    const { data, error } = await db
      .from('compiled_skills')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return (data as CompiledSkill[]) || []
  }

  async function compileSkill(skillMarkdown: string): Promise<CompileResponse> {
    const config = useRuntimeConfig()
    const { getAuthHeaders } = useAuth()
    const headers = await getAuthHeaders()

    const data = await $fetch(`${config.public.supabase.url}/functions/v1/compile-skill`, {
      method: 'POST',
      headers,
      body: { skill_markdown: skillMarkdown },
    })

    return data as CompileResponse
  }

  async function deleteSkill(id: string): Promise<void> {
    const db = await cesclaw()
    const { error } = await db
      .from('compiled_skills')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  return { listSkills, compileSkill, deleteSkill }
}
