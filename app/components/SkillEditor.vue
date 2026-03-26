<script setup lang="ts">
import type { CompiledSkill, CompileResponse, LlmTier, LlmStep, StepManifestEntry } from '~/composables/useSkills'
import {
  SERVICE_REGISTRY,
  computeFrontmatterFields,
  inferEnabledServices,
} from '~/utils/service-registry'
import { getServiceToken } from '~/utils/local-tokens'

type Tab = 'edit' | 'services' | 'compiled' | 'test'
type CompileStatus = 'idle' | 'compiling' | 'success' | 'cached' | 'error' | 'rate_limited'
type CommandDispatch = 'direct' | 'model'
type SkillType = 'skill' | 'workflow'

interface WorkflowStepDef {
  id: string
  depends_on: string[]
  body: string
}

const emit = defineEmits<{
  compiled: []
}>()

// ─── Structured state ────────────────────────────────────────────────────────

const activeTab = ref<Tab>('edit')
const skillName = ref('my-skill')
const skillDescription = ref('Describe what this skill does')
const skillType = ref<SkillType>('skill')
const enabledServices = ref(new Set<string>())
const userInvocable = ref(true)
const modelInvocable = ref(true)
const commandDispatch = ref<CommandDispatch>('model')
const instructionBody = ref(
  'Write your skill instructions here.\n\nDeterministic skills (API lookups, data transforms) compile to JS automatically.\nSkills needing summarization or reasoning are classified as LLM-assisted or LLM-required.',
)

// Workflow-specific state
const workflowSteps = ref<WorkflowStepDef[]>([
  { id: 'step1', depends_on: [], body: '' },
])
const schedule = ref('')
const triggerEvents = ref<string[]>([])
const triggerEventInput = ref('')

/** Hand-edited YAML values not matching any known service. */
const customExtras = ref<{
  services?: string[]
  required_tokens?: string[]
  fetch_allowlist?: string[]
  required_permissions?: string[]
  env?: string[]
}>({})

const compiledScript = ref<string | null>(null)
const compileStatus = ref<CompileStatus>('idle')
const compileError = ref('')
const cooldownSeconds = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null
const skillClass = ref<CompiledSkill['skill_class'] | null>(null)
const llmTier = ref<LlmTier | null>(null)
const llmSteps = ref<LlmStep[] | null>(null)
const stepManifest = ref<StepManifestEntry[] | null>(null)
const stepCount = ref(1)
const activeSkillId = ref<string | undefined>()
const importNotice = ref('')
const connectionRefreshKey = ref(0)

const { compileSkill } = useSkills()
const { connectProvider } = useOAuth()

// ─── Enabled count for tab badge ─────────────────────────────────────────────

const enabledCount = computed(() => enabledServices.value.size)

// ─── Workflow helpers ────────────────────────────────────────────────────────

function addWorkflowStep() {
  const nextNum = workflowSteps.value.length + 1
  workflowSteps.value.push({ id: `step${nextNum}`, depends_on: [], body: '' })
}

function removeWorkflowStep(index: number) {
  const removedId = workflowSteps.value[index].id
  workflowSteps.value.splice(index, 1)
  // Clean up depends_on references
  for (const step of workflowSteps.value) {
    step.depends_on = step.depends_on.filter(d => d !== removedId)
  }
}

function otherStepIds(index: number): string[] {
  return workflowSteps.value
    .filter((_, i) => i !== index)
    .map(s => s.id)
    .filter(Boolean)
}

function addTriggerEvent() {
  const val = triggerEventInput.value.trim()
  if (val && !triggerEvents.value.includes(val)) {
    triggerEvents.value.push(val)
  }
  triggerEventInput.value = ''
}

function removeTriggerEvent(index: number) {
  triggerEvents.value.splice(index, 1)
}

// ─── Serialization: structured state → source markdown ───────────────────────

const sourceMarkdown = computed(() => {
  const fields = computeFrontmatterFields(enabledServices.value)

  // Merge with custom extras
  const mergeArray = (a: string[], b?: string[]) =>
    [...new Set([...a, ...(b || [])])]

  const services = mergeArray(fields.services, customExtras.value.services)
  const required_tokens = mergeArray(fields.required_tokens, customExtras.value.required_tokens)
  const fetch_allowlist = mergeArray(fields.fetch_allowlist, customExtras.value.fetch_allowlist)
  const required_permissions = mergeArray(fields.required_permissions, customExtras.value.required_permissions)
  const env = mergeArray(fields.env, customExtras.value.env)

  const fmtArr = (arr: string[]) =>
    arr.length === 0 ? '[]' : `[${arr.join(', ')}]`

  const yamlLines = [
    `name: ${skillName.value}`,
    `description: ${skillDescription.value}`,
  ]

  if (skillType.value === 'workflow') {
    yamlLines.push(`type: workflow`)
    if (schedule.value) yamlLines.push(`schedule: "${schedule.value}"`)
    if (triggerEvents.value.length > 0) yamlLines.push(`trigger_events: ${fmtArr(triggerEvents.value)}`)
  }

  yamlLines.push(
    `services: ${fmtArr(services)}`,
    `user_invocable: ${userInvocable.value}`,
    `model_invocable: ${modelInvocable.value}`,
    `command_dispatch: ${commandDispatch.value}`,
    `env: ${fmtArr(env)}`,
    `fetch_allowlist: ${fmtArr(fetch_allowlist)}`,
    `required_tokens: ${fmtArr(required_tokens)}`,
    `required_permissions: ${fmtArr(required_permissions)}`,
  )

  const yaml = yamlLines.join('\n')

  let bodyContent: string
  if (skillType.value === 'workflow') {
    bodyContent = workflowSteps.value.map(step => {
      let section = `### Step: ${step.id}\n`
      if (step.depends_on.length > 0) {
        section += `depends_on: [${step.depends_on.join(', ')}]\n`
      }
      section += step.body
      return section
    }).join('\n\n')
  } else {
    bodyContent = instructionBody.value
  }

  return `---\n${yaml}\n---\n\n${bodyContent}\n`
})

// ─── Deserialization: source markdown → structured state ─────────────────────

function loadFromMarkdown(md: string) {
  const trimmed = md.trimStart()
  if (!trimmed.startsWith('---')) return

  const endIdx = trimmed.indexOf('---', 3)
  if (endIdx === -1) return

  const yamlBlock = trimmed.slice(3, endIdx)
  const body = trimmed.slice(endIdx + 3).replace(/^\n+/, '')

  // Simple line-by-line YAML parser for flat frontmatter
  const parseValue = (line: string): string => {
    const colonIdx = line.indexOf(':')
    return colonIdx >= 0 ? line.slice(colonIdx + 1).trim() : ''
  }

  const parseArray = (val: string): string[] => {
    const inner = val.replace(/^\[/, '').replace(/\]$/, '').trim()
    if (!inner) return []
    return inner.split(',').map(s => s.trim()).filter(Boolean)
  }

  const parsedFields: Record<string, string> = {}
  for (const line of yamlBlock.split('\n')) {
    const trimLine = line.trim()
    if (!trimLine || trimLine.startsWith('#')) continue
    const colonIdx = trimLine.indexOf(':')
    if (colonIdx < 0) continue
    const key = trimLine.slice(0, colonIdx).trim()
    parsedFields[key] = parseValue(trimLine)
  }

  skillName.value = parsedFields['name'] || 'my-skill'
  skillDescription.value = parsedFields['description'] || ''
  userInvocable.value = parsedFields['user_invocable'] !== 'false'
  modelInvocable.value = parsedFields['model_invocable'] !== 'false'
  commandDispatch.value = (parsedFields['command_dispatch'] === 'direct' ? 'direct' : 'model') as CommandDispatch

  // Workflow fields
  const isWorkflow = parsedFields['type'] === 'workflow'
  skillType.value = isWorkflow ? 'workflow' : 'skill'

  if (isWorkflow) {
    schedule.value = (parsedFields['schedule'] || '').replace(/^["']|["']$/g, '')
    triggerEvents.value = parseArray(parsedFields['trigger_events'] || '[]')
  } else {
    schedule.value = ''
    triggerEvents.value = []
  }

  const frontmatter = {
    services: parseArray(parsedFields['services'] || '[]'),
    required_tokens: parseArray(parsedFields['required_tokens'] || '[]'),
    fetch_allowlist: parseArray(parsedFields['fetch_allowlist'] || '[]'),
    required_permissions: parseArray(parsedFields['required_permissions'] || '[]'),
    env: parseArray(parsedFields['env'] || '[]'),
  }

  const { enabled, extras } = inferEnabledServices(frontmatter)
  enabledServices.value = new Set(enabled)
  customExtras.value = extras

  // Parse body — check for workflow steps
  if (isWorkflow) {
    const steps = parseWorkflowStepsFromBody(body)
    workflowSteps.value = steps.length > 0 ? steps : [{ id: 'step1', depends_on: [], body: '' }]
    instructionBody.value = ''
  } else {
    instructionBody.value = body.replace(/\n$/, '')
    workflowSteps.value = [{ id: 'step1', depends_on: [], body: '' }]
  }
}

function parseWorkflowStepsFromBody(body: string): WorkflowStepDef[] {
  const stepRegex = /### Step:\s*(\w+)\s*\n/g
  const matches: { id: string; start: number; matchEnd: number }[] = []
  let m
  while ((m = stepRegex.exec(body)) !== null) {
    matches.push({ id: m[1], start: m.index, matchEnd: m.index + m[0].length })
  }

  if (matches.length === 0) return []

  return matches.map((match, i) => {
    const endIdx = i < matches.length - 1 ? matches[i + 1].start : body.length
    const rawBody = body.slice(match.matchEnd, endIdx).trim()

    const depends_on: string[] = []
    let stepBody = rawBody
    const depMatch = rawBody.match(/^depends_on:\s*\[([^\]]*)\]\s*\n?/)
    if (depMatch) {
      const deps = depMatch[1].split(',').map(s => s.trim()).filter(Boolean)
      depends_on.push(...deps)
      stepBody = rawBody.slice(depMatch[0].length).trim()
    }

    return { id: match.id, depends_on, body: stepBody }
  })
}

// ─── OpenClaw detection (on instruction body paste) ──────────────────────────

function detectAndConvertOpenClaw(text: string): string | null {
  const hasFrontmatter = text.trimStart().startsWith('---')
  if (!hasFrontmatter) return null

  const parts = text.split('---')
  if (parts.length < 3) return null

  const yaml = parts[1]

  const isOpenClaw = yaml.includes('version:') ||
    yaml.includes('metadata:') ||
    yaml.includes('bins:') ||
    yaml.includes('disable-model-invocation:') ||
    yaml.includes('emoji:') ||
    yaml.includes('primaryEnv:')

  const isCesClaw = yaml.includes('command_dispatch:') ||
    yaml.includes('fetch_allowlist:') ||
    yaml.includes('required_tokens:') ||
    yaml.includes('skill_class:')

  if (!isOpenClaw || isCesClaw) return null

  const lines = yaml.split('\n')
  let name = 'imported-skill'
  let description = ''
  let uInvocable = true
  let mInvocable = true
  let hasBins = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('name:')) name = trimmed.slice(5).trim()
    if (trimmed.startsWith('description:')) description = trimmed.slice(12).trim()
    if (trimmed.startsWith('user-invocable:')) uInvocable = trimmed.includes('true')
    if (trimmed.startsWith('disable-model-invocation:')) mInvocable = !trimmed.includes('true')
    if (trimmed.startsWith('bins:')) hasBins = true
  }

  const body = parts.slice(2).join('---').trim()

  const converted = `---
name: ${name}
description: ${description}
services: []
user_invocable: ${uInvocable}
model_invocable: ${mInvocable}
command_dispatch: model
env: []
fetch_allowlist: []
required_tokens: []
required_permissions: []
---

${body}
`

  if (hasBins) {
    importNotice.value = 'Imported from OpenClaw format. Warning: this skill referenced binary dependencies (bins) which are not supported \u2014 it runs in a JS sandbox.'
  } else {
    importNotice.value = 'Imported from OpenClaw format.'
  }

  return converted
}

function handleInstructionPaste(e: ClipboardEvent) {
  const pasted = e.clipboardData?.getData('text')
  if (!pasted) return

  const converted = detectAndConvertOpenClaw(pasted)
  if (converted) {
    e.preventDefault()
    loadFromMarkdown(converted)
  }
}

// ─── Service tile actions ────────────────────────────────────────────────────

function toggleService(id: string) {
  const next = new Set(enabledServices.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  enabledServices.value = next
}

function isConnected(service: (typeof SERVICE_REGISTRY)[number]): boolean {
  // Force re-evaluate when connectionRefreshKey changes
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  connectionRefreshKey.value
  if (!service.provider) return true // non-oauth services are always "connected"
  return !!getServiceToken(service.provider)
}

async function handleConnect(service: (typeof SERVICE_REGISTRY)[number]) {
  if (!service.provider) return
  await connectProvider(service.provider)
  connectionRefreshKey.value++
}

// ─── Reset / Load ────────────────────────────────────────────────────────────

function reset() {
  importNotice.value = ''
  skillName.value = 'my-skill'
  skillDescription.value = 'Describe what this skill does'
  skillType.value = 'skill'
  enabledServices.value = new Set()
  userInvocable.value = true
  modelInvocable.value = true
  commandDispatch.value = 'model'
  instructionBody.value =
    'Write your skill instructions here.\n\nDeterministic skills (API lookups, data transforms) compile to JS automatically.\nSkills needing summarization or reasoning are classified as LLM-assisted or LLM-required.'
  workflowSteps.value = [{ id: 'step1', depends_on: [], body: '' }]
  schedule.value = ''
  triggerEvents.value = []
  triggerEventInput.value = ''
  customExtras.value = {}
  compiledScript.value = null
  compileStatus.value = 'idle'
  compileError.value = ''
  skillClass.value = null
  llmTier.value = null
  llmSteps.value = null
  stepManifest.value = null
  stepCount.value = 1
  activeSkillId.value = undefined
  activeTab.value = 'edit'
}

function loadSkill(skill: CompiledSkill) {
  loadFromMarkdown(skill.source_markdown)
  compiledScript.value = skill.compiled_script
  skillClass.value = skill.skill_class
  llmTier.value = skill.llm_tier || null
  llmSteps.value = skill.llm_steps || null
  stepManifest.value = skill.step_manifest || null
  stepCount.value = skill.step_count || 1
  activeSkillId.value = skill.id
  compileStatus.value = skill.verified ? 'success' : 'idle'
  compileError.value = ''
  importNotice.value = ''
  activeTab.value = 'edit'
}

// ─── Compile ─────────────────────────────────────────────────────────────────

function startCooldown(seconds: number) {
  cooldownSeconds.value = seconds
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldownSeconds.value--
    if (cooldownSeconds.value <= 0) {
      clearInterval(cooldownTimer!)
      cooldownTimer = null
      compileStatus.value = 'idle'
      compileError.value = ''
    }
  }, 1000)
}

async function handleCompile() {
  compileStatus.value = 'compiling'
  compileError.value = ''

  try {
    const result: CompileResponse = await compileSkill(sourceMarkdown.value)

    compiledScript.value = result.compiled_script
    skillClass.value = (result.skill_class as CompiledSkill['skill_class']) || null
    llmTier.value = result.llm_tier || null
    llmSteps.value = result.llm_steps || null
    stepManifest.value = result.step_manifest || null
    stepCount.value = result.step_count || 1
    compileStatus.value = result.cached ? 'cached' : 'success'

    if (result.error === 'rate_limited') {
      compileStatus.value = 'rate_limited'
      compileError.value = 'Server busy — too many compilations'
      startCooldown(result.retry_after || 120)
    } else if (result.error) {
      compileError.value = result.error
      compileStatus.value = 'error'
    } else {
      activeTab.value = 'compiled'
      emit('compiled')
    }
  } catch (err: any) {
    compileError.value = err?.message || 'Compilation failed'
    compileStatus.value = 'error'
  }
}

defineExpose({ reset, loadSkill, activeSkillId })
</script>

<template>
  <div class="editor">
    <!-- Tab bar -->
    <div class="tab-bar">
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'edit' }"
        @click="activeTab = 'edit'"
      >
        Edit
      </button>
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'services' }"
        @click="activeTab = 'services'"
      >
        Services<span v-if="enabledCount > 0" class="tab-badge">{{ enabledCount }}</span>
      </button>
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'compiled' }"
        @click="activeTab = 'compiled'"
      >
        Compiled
      </button>
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'test' }"
        @click="activeTab = 'test'"
      >
        Test
      </button>
    </div>

    <!-- Edit tab -->
    <div v-show="activeTab === 'edit'" class="tab-panel">
      <div class="edit-fields">
        <label class="field">
          <span class="field-label">Name</span>
          <input v-model="skillName" class="field-input" type="text" />
        </label>
        <label class="field">
          <span class="field-label">Description</span>
          <input v-model="skillDescription" class="field-input" type="text" />
        </label>
      </div>

      <!-- Type toggle -->
      <div class="type-toggle">
        <label class="type-radio">
          <input v-model="skillType" type="radio" value="skill" class="type-radio-input" />
          Skill
        </label>
        <label class="type-radio">
          <input v-model="skillType" type="radio" value="workflow" class="type-radio-input" />
          Workflow
        </label>
      </div>

      <div class="edit-toggles">
        <label class="toggle-label">
          <input v-model="userInvocable" type="checkbox" class="toggle-check" />
          User invocable
        </label>
        <label class="toggle-label">
          <input v-model="modelInvocable" type="checkbox" class="toggle-check" />
          Model invocable
        </label>
        <label class="toggle-label">
          Dispatch
          <select v-model="commandDispatch" class="dispatch-select">
            <option value="model">model</option>
            <option value="direct">direct</option>
          </select>
        </label>
      </div>

      <!-- Workflow-specific fields -->
      <div v-if="skillType === 'workflow'" class="workflow-fields">
        <label class="field">
          <span class="field-label">Schedule (cron)</span>
          <input v-model="schedule" class="field-input" type="text" placeholder="0 7 * * *" />
        </label>
        <div class="field">
          <span class="field-label">Trigger Events</span>
          <div class="trigger-tags">
            <span
              v-for="(evt, i) in triggerEvents"
              :key="i"
              class="trigger-tag"
            >
              {{ evt }}
              <button class="trigger-tag-x" @click="removeTriggerEvent(i)">&times;</button>
            </span>
            <input
              v-model="triggerEventInput"
              class="trigger-input"
              type="text"
              placeholder="e.g. google.gmail.message"
              @keydown.enter.prevent="addTriggerEvent"
            />
          </div>
        </div>
      </div>

      <!-- Skill mode: single textarea -->
      <template v-if="skillType === 'skill'">
        <label class="field-label">Instructions</label>
        <textarea
          v-model="instructionBody"
          class="source-textarea"
          spellcheck="false"
          @paste="handleInstructionPaste"
        />
      </template>

      <!-- Workflow mode: step builder -->
      <template v-else>
        <label class="field-label">Steps</label>
        <div class="step-list">
          <WorkflowStepCard
            v-for="(step, i) in workflowSteps"
            :key="i"
            :step-id="step.id"
            :depends-on="step.depends_on"
            :body="step.body"
            :other-step-ids="otherStepIds(i)"
            :index="i"
            :is-last="i === workflowSteps.length - 1"
            @update:step-id="step.id = $event"
            @update:depends-on="step.depends_on = $event"
            @update:body="step.body = $event"
            @delete="removeWorkflowStep(i)"
          />
        </div>
        <button class="add-step-btn" @click="addWorkflowStep">+ Add Step</button>
      </template>

      <div class="edit-footer">
        <SkillClassBadge v-if="skillClass" :skill-class="skillClass" />
        <span
          v-if="llmTier && llmTier !== 'none'"
          class="tier-badge"
          :class="`tier-badge--${llmTier}`"
        >
          {{ llmTier === 'nano' ? 'Nano' : llmTier === 'local_3b' ? '3B' : 'Cloud' }}
        </span>
        <span v-if="skillType === 'workflow'" class="step-count-badge">
          {{ workflowSteps.length }} steps
        </span>
        <div class="edit-spacer" />
        <button
          class="compile-btn"
          :disabled="compileStatus === 'compiling' || compileStatus === 'rate_limited'"
          @click="handleCompile"
        >
          <span v-if="compileStatus === 'compiling'" class="compile-spinner" />
          <span
            v-else
            class="compile-dot"
            :class="{
              'compile-dot--success': compileStatus === 'success',
              'compile-dot--cached': compileStatus === 'cached',
              'compile-dot--error': compileStatus === 'error',
              'compile-dot--busy': compileStatus === 'rate_limited',
            }"
          />
          <template v-if="compileStatus === 'rate_limited'">
            Busy {{ Math.floor(cooldownSeconds / 60) }}:{{ String(cooldownSeconds % 60).padStart(2, '0') }}
          </template>
          <template v-else>
            {{ compileStatus === 'compiling' ? 'Compiling...' : 'Compile' }}
          </template>
        </button>
      </div>

      <div v-if="importNotice" class="import-notice">
        {{ importNotice }}
      </div>
      <div v-if="compileError" class="compile-error">
        <span class="compile-error-icon">&#9888;</span>
        <span class="compile-error-msg">{{ compileError }}</span>
      </div>
    </div>

    <!-- Services tab -->
    <div v-show="activeTab === 'services'" class="tab-panel">
      <div class="service-grid">
        <ServiceTile
          v-for="svc in SERVICE_REGISTRY"
          :key="svc.id"
          :service="svc"
          :enabled="enabledServices.has(svc.id)"
          :connected="isConnected(svc)"
          @toggle="toggleService(svc.id)"
          @connect="handleConnect(svc)"
        />
      </div>
    </div>

    <!-- Compiled tab -->
    <div v-show="activeTab === 'compiled'" class="tab-panel">
      <div v-if="compiledScript" class="compiled-output">
        <!-- Tier badge -->
        <div v-if="llmTier" class="tier-row">
          <span class="tier-label">On-device tier:</span>
          <span
            class="tier-badge"
            :class="`tier-badge--${llmTier}`"
          >
            {{ llmTier === 'none' ? 'No LLM' : llmTier === 'nano' ? 'Nano (1B)' : llmTier === 'local_3b' ? 'Local 3B' : 'Cloud Required' }}
          </span>
          <span v-if="stepCount > 1" class="tier-label" style="margin-left: var(--sp-2)">
            {{ stepCount }} steps
          </span>
        </div>

        <!-- Step manifest for workflows -->
        <div v-if="stepManifest && stepManifest.length > 1" class="step-manifest">
          <div class="compiled-section-label">Workflow Steps</div>
          <div class="step-manifest-list">
            <div
              v-for="entry in stepManifest"
              :key="entry.id"
              class="step-manifest-item"
            >
              <span class="step-manifest-id">{{ entry.id }}</span>
              <SkillClassBadge :skill-class="entry.skill_class" />
              <span v-if="entry.is_output_step" class="step-manifest-output">output</span>
              <span v-if="entry.depends_on.length > 0" class="step-manifest-deps">
                &larr; {{ entry.depends_on.join(', ') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Compiled JS -->
        <div class="compiled-code">
          <div class="compiled-section-label">Compiled Script</div>
          <pre><code>{{ compiledScript }}</code></pre>
        </div>

        <!-- LLM Steps -->
        <div v-if="llmSteps && llmSteps.length > 0" class="llm-steps">
          <div class="compiled-section-label">On-Device LLM Steps ({{ llmSteps.length }})</div>
          <div
            v-for="step in llmSteps"
            :key="step.index"
            class="llm-step"
          >
            <div class="llm-step-header">
              <span class="llm-step-idx">#{{ step.index }}</span>
              <code class="llm-step-original">{{ step.original_prompt }}</code>
            </div>
            <div class="llm-step-body">
              <div class="llm-step-field">
                <span class="llm-step-field-label">Distilled prompt:</span>
                <pre class="llm-step-pre">{{ step.distilled_prompt }}</pre>
              </div>
              <div v-if="step.few_shot_examples.length > 0" class="llm-step-field">
                <span class="llm-step-field-label">Few-shot examples ({{ step.few_shot_examples.length }}):</span>
                <div
                  v-for="(ex, i) in step.few_shot_examples"
                  :key="i"
                  class="llm-step-example"
                >
                  <div class="llm-step-ex-row"><span class="llm-step-ex-label">In:</span> {{ ex.input }}</div>
                  <div class="llm-step-ex-row"><span class="llm-step-ex-label">Out:</span> {{ ex.output }}</div>
                </div>
              </div>
              <div v-if="step.output_schema" class="llm-step-field">
                <span class="llm-step-field-label">Output schema:</span>
                <pre class="llm-step-pre">{{ JSON.stringify(step.output_schema, null, 2) }}</pre>
              </div>
              <div class="llm-step-meta">
                max_tokens: {{ step.max_tokens }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="skillClass === 'llm_required' && !compiledScript" class="compiled-warning">
        This skill could not be decomposed into compilable steps. It requires a full LLM at runtime.
      </div>
      <div v-else class="compiled-empty">
        No compiled output yet. Write a skill and click Compile.
      </div>
    </div>

    <!-- Test tab -->
    <div v-show="activeTab === 'test'" class="tab-panel">
      <SkillTestRunner :compiled-script="compiledScript" />
    </div>
  </div>
</template>

<style scoped>
.editor {
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--c-trench);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-1);
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-drift);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: var(--sp-3) var(--sp-4);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.tab-btn:hover {
  color: var(--c-foam);
}

.tab-btn--active {
  color: var(--c-glow);
  border-bottom-color: var(--c-glow);
}

.tab-badge {
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  color: var(--c-abyss);
  background: var(--c-glow);
  border-radius: var(--radius-full);
  padding: 0 var(--sp-1);
}

.tab-panel {
  padding: var(--sp-4);
}

/* ─── Edit tab fields ─────────────────────────────────────────────────────── */

.edit-fields {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.field-label {
  font-size: var(--fs-xs);
  font-weight: 500;
  color: var(--c-drift);
  margin-bottom: var(--sp-1);
}

.field-input {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--c-foam);
  background: var(--c-abyss);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-sm);
  padding: var(--sp-2) var(--sp-3);
  outline: none;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.field-input:focus {
  border-color: var(--c-glow-dim);
}

/* ─── Type toggle ─────────────────────────────────────────────────────────── */

.type-toggle {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin-bottom: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-abyss);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-sm);
}

.type-radio {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-drift);
  cursor: pointer;
}

.type-radio-input {
  accent-color: var(--c-glow);
}

.edit-toggles {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin-bottom: var(--sp-3);
  flex-wrap: wrap;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-xs);
  color: var(--c-drift);
  cursor: pointer;
}

.toggle-check {
  accent-color: var(--c-glow);
}

.dispatch-select {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--c-foam);
  background: var(--c-abyss);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-sm);
  padding: var(--sp-1) var(--sp-2);
  outline: none;
  cursor: pointer;
}

.dispatch-select:focus {
  border-color: var(--c-glow-dim);
}

/* ─── Workflow fields ─────────────────────────────────────────────────────── */

.workflow-fields {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
}

.trigger-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2);
  background: var(--c-abyss);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-sm);
  min-height: 36px;
}

.trigger-tag {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--c-glow);
  background: var(--c-glow-faint);
  border: 1px solid var(--c-glow-dim);
  border-radius: var(--radius-full);
  padding: 1px var(--sp-2);
}

.trigger-tag-x {
  font-size: var(--fs-sm);
  line-height: 1;
  color: var(--c-drift);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.trigger-tag-x:hover {
  color: var(--c-error);
}

.trigger-input {
  flex: 1;
  min-width: 140px;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--c-foam);
  background: transparent;
  border: none;
  outline: none;
  padding: var(--sp-1);
}

/* ─── Step builder ────────────────────────────────────────────────────────── */

.step-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
}

.add-step-btn {
  display: block;
  width: 100%;
  padding: var(--sp-2) var(--sp-4);
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-glow);
  background: var(--c-glow-faint);
  border: 1px dashed var(--c-glow-dim);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  margin-bottom: var(--sp-3);
}

.add-step-btn:hover {
  background: var(--c-glow-dim);
  border-style: solid;
}

.step-count-badge {
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
  color: var(--c-drift);
}

.source-textarea {
  width: 100%;
  min-height: 240px;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--c-foam);
  background: var(--c-abyss);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-sm);
  padding: var(--sp-3);
  resize: vertical;
  outline: none;
  line-height: var(--lh-body);
  transition: border-color var(--dur-fast) var(--ease-out);
  box-sizing: border-box;
}

.source-textarea:focus {
  border-color: var(--c-glow-dim);
}

.edit-footer {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-top: var(--sp-3);
}

.edit-spacer {
  flex: 1;
}

/* ─── Service grid ────────────────────────────────────────────────────────── */

.service-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: var(--sp-3);
}

/* ─── Compile button & status ─────────────────────────────────────────────── */

.compile-btn {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-abyss);
  background: var(--c-glow);
  border: none;
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.compile-btn:hover:not(:disabled) {
  background: var(--c-glow-bright);
  box-shadow: var(--shadow-glow);
}

.compile-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.compile-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--c-abyss);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.compile-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-abyss);
}

.compile-dot--success {
  background: var(--c-abyss);
  box-shadow: 0 0 6px var(--c-abyss);
}

.compile-dot--cached {
  background: var(--c-abyss);
  opacity: 0.5;
}

.compile-dot--error {
  background: var(--c-error);
}

.compile-dot--busy {
  background: var(--c-warning, #f59e0b);
  animation: pulse-busy 1.5s ease-in-out infinite;
}

@keyframes pulse-busy {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.import-notice {
  margin-top: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  background: var(--c-glow-faint);
  border: 1px solid var(--c-glow-dim);
  border-radius: var(--radius-md);
  font-size: var(--fs-xs);
  color: var(--c-glow);
}

.compile-error {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
}

.compile-error-icon {
  color: var(--c-error);
  flex-shrink: 0;
}

.compile-error-msg {
  color: var(--c-drift);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  word-break: break-word;
}

/* ─── Compiled / Test tabs ────────────────────────────────────────────────── */

.compiled-output {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.tier-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.tier-label {
  font-size: var(--fs-xs);
  color: var(--c-drift);
}

.tier-badge {
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
  font-weight: 500;
  padding: var(--sp-1) var(--sp-2);
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.tier-badge--none {
  background: var(--c-glow-faint);
  color: var(--c-glow);
}

.tier-badge--nano {
  background: var(--c-glow-faint);
  color: var(--c-glow);
}

.tier-badge--local_3b {
  background: #f59e0b22;
  color: var(--c-warning);
}

.tier-badge--cloud_required {
  background: #ef444422;
  color: var(--c-error);
}

/* ─── Step manifest ───────────────────────────────────────────────────────── */

.step-manifest {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.step-manifest-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.step-manifest-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-1) var(--sp-2);
  background: var(--c-abyss);
  border-radius: var(--radius-sm);
}

.step-manifest-id {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-foam);
}

.step-manifest-output {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--c-abyss);
  background: var(--c-glow);
  padding: 1px var(--sp-2);
  border-radius: var(--radius-full);
}

.step-manifest-deps {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--c-shelf);
}

.compiled-section-label {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-drift);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--sp-1);
}

.compiled-code pre {
  background: var(--c-abyss);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-sm);
  padding: var(--sp-3);
  overflow-x: auto;
}

.compiled-code code {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--c-foam);
  line-height: var(--lh-body);
}

.compiled-empty {
  font-size: var(--fs-sm);
  color: var(--c-drift);
  padding: var(--sp-4) 0;
}

.compiled-warning {
  font-size: var(--fs-sm);
  color: var(--c-warning);
  padding: var(--sp-4);
  background: #f59e0b11;
  border: 1px solid #f59e0b33;
  border-radius: var(--radius-md);
}

/* ─── LLM Steps ───────────────────────────────────────────────────────────── */

.llm-steps {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.llm-step {
  background: var(--c-abyss);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.llm-step-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-deep);
  border-bottom: 1px solid var(--c-trench);
}

.llm-step-idx {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-glow);
  flex-shrink: 0;
}

.llm-step-original {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--c-drift);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.llm-step-body {
  padding: var(--sp-3);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.llm-step-field {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.llm-step-field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--c-drift);
}

.llm-step-pre {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--c-foam);
  white-space: pre-wrap;
  line-height: var(--lh-body);
  margin: 0;
}

.llm-step-example {
  padding: var(--sp-1) var(--sp-2);
  background: var(--c-deep);
  border-radius: var(--radius-sm);
  font-size: var(--fs-xs);
  color: var(--c-foam);
}

.llm-step-ex-row {
  line-height: var(--lh-body);
}

.llm-step-ex-label {
  font-weight: 600;
  color: var(--c-drift);
  margin-right: var(--sp-1);
}

.llm-step-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--c-shelf);
}

/* ─── Responsive ──────────────────────────────────────────────────────────── */

@media (max-width: 640px) {
  .source-textarea {
    min-height: 180px;
  }

  .compile-btn {
    width: 100%;
    justify-content: center;
  }

  .edit-footer {
    flex-wrap: wrap;
  }

  .service-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}
</style>
