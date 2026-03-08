<template>
  <pre class="lean-highlight"><code v-html="highlighted"></code></pre>
</template>

<script setup lang="ts">
const props = defineProps<{ code: string }>()

const highlighted = computed(() => {
  if (!props.code) return ''

  let html = escapeHtml(props.code)

  // Extract comments first, replace with placeholders to avoid keyword matches inside them
  const comments: string[] = []
  const placeholder = (i: number) => `\x00CMT${i}\x00`

  // Multi-line comments /- ... -/
  html = html.replace(/(\/\-[\s\S]*?\-\/)/g, (m) => {
    comments.push(m)
    return placeholder(comments.length - 1)
  })

  // Single-line comments (-- to end of line)
  html = html.replace(/(--.*?)$/gm, (m) => {
    comments.push(m)
    return placeholder(comments.length - 1)
  })

  // sorry (make it stand out)
  html = html.replace(/\b(sorry)\b/g, '<span class="lh-sorry">$1</span>')

  // Keywords
  const keywords = [
    'theorem', 'def', 'lemma', 'axiom', 'noncomputable', 'private', 'protected',
    'by', 'where', 'have', 'let', 'fun', 'show', 'calc', 'match', 'with',
    'if', 'then', 'else', 'do', 'return', 'structure', 'class', 'instance',
    'inductive', 'abbrev', 'section', 'end', 'namespace', 'open', 'import',
    'variable', 'set_option', 'attribute',
  ]
  const kwRe = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
  html = html.replace(kwRe, (m) => `<span class="lh-keyword">${m}</span>`)

  // Tactic keywords
  const tactics = [
    'simp', 'ring', 'omega', 'linarith', 'nlinarith', 'norm_num', 'positivity',
    'field_simp', 'push_neg', 'contradiction', 'exact', 'apply', 'intro',
    'cases', 'induction', 'constructor', 'left', 'right', 'ext', 'congr',
    'rw', 'rewrite', 'subst', 'decide', 'tauto', 'aesop', 'gcongr', 'trivial',
  ]
  const tacRe = new RegExp(`\\b(${tactics.join('|')})\\b`, 'g')
  html = html.replace(tacRe, (m) => `<span class="lh-tactic">${m}</span>`)

  // Types
  const types = ['Prop', 'Type', 'Sort', 'True', 'False', 'Nat', 'Int', 'Real', 'Bool', 'Fin', 'Finset', 'Set']
  const typeRe = new RegExp(`\\b(${types.join('|')})\\b`, 'g')
  html = html.replace(typeRe, (m) => `<span class="lh-type">${m}</span>`)

  // Numbers
  html = html.replace(/\b(\d+)\b/g, '<span class="lh-number">$1</span>')

  // Strings
  html = html.replace(/(&quot;[^&]*?&quot;)/g, '<span class="lh-string">$1</span>')

  // Restore comments with highlighting
  for (let i = 0; i < comments.length; i++) {
    html = html.replace(placeholder(i), `<span class="lh-comment">${comments[i]}</span>`)
  }

  return html
})

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
</script>

<style scoped>
.lean-highlight {
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 1rem;
  font-size: 0.85rem;
  overflow-x: auto;
  line-height: 1.5;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  margin: 0;
}
:deep(.lh-keyword) { color: #7c3aed; font-weight: 500; }
:deep(.lh-tactic) { color: #0369a1; }
:deep(.lh-type) { color: #0369a1; font-weight: 500; }
:deep(.lh-number) { color: #0369a1; }
:deep(.lh-comment) { color: #6b7280; font-style: italic; }
:deep(.lh-string) { color: #16a34a; }
:deep(.lh-sorry) { color: #dc2626; font-weight: 700; background: #fef2f2; padding: 0 2px; border-radius: 2px; }
</style>
