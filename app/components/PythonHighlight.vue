<template>
  <pre class="python-highlight"><code v-html="highlighted"></code></pre>
</template>

<script setup lang="ts">
import { escapeHtmlFull } from '~/utils/math-render'

const props = defineProps<{ code: string }>()

const highlighted = computed(() => {
  if (!props.code) return ''

  let html = escapeHtmlFull(props.code)

  // Extract strings and comments first, replace with placeholders
  const tokens: string[] = []
  const placeholder = (i: number) => `\x00TOK${i}\x00`

  // Triple-quoted strings (""" and ''')
  html = html.replace(/(&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;|&#x27;&#x27;&#x27;[\s\S]*?&#x27;&#x27;&#x27;)/g, (m) => {
    tokens.push(`<span class="ph-string">${m}</span>`)
    return placeholder(tokens.length - 1)
  })

  // Single/double quoted strings (escaped quotes handled)
  html = html.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;|&#x27;(?:[^&]|&(?!#x27;))*?&#x27;)/g, (m) => {
    tokens.push(`<span class="ph-string">${m}</span>`)
    return placeholder(tokens.length - 1)
  })

  // Comments (# to end of line)
  html = html.replace(/(#.*?)$/gm, (m) => {
    tokens.push(`<span class="ph-comment">${m}</span>`)
    return placeholder(tokens.length - 1)
  })

  // Decorators (@something)
  html = html.replace(/^(\s*@\w+.*?)$/gm, (m) => `<span class="ph-decorator">${m}</span>`)

  // Keywords
  const keywords = [
    'def', 'class', 'import', 'from', 'if', 'elif', 'else', 'for', 'while',
    'try', 'except', 'finally', 'with', 'as', 'return', 'yield', 'raise',
    'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'lambda',
    'None', 'True', 'False', 'global', 'nonlocal', 'assert', 'del', 'async', 'await',
  ]
  const kwRe = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
  html = html.replace(kwRe, (m) => `<span class="ph-keyword">${m}</span>`)

  // Built-in functions
  const builtins = [
    'print', 'len', 'range', 'enumerate', 'zip', 'map', 'filter', 'sorted',
    'list', 'dict', 'set', 'tuple', 'int', 'float', 'str', 'bool', 'type',
    'isinstance', 'hasattr', 'getattr', 'setattr', 'super', 'property',
    'staticmethod', 'classmethod', 'abs', 'min', 'max', 'sum', 'any', 'all',
    'open', 'iter', 'next', 'reversed', 'round',
  ]
  const builtinRe = new RegExp(`\\b(${builtins.join('|')})(?=\\()`, 'g')
  html = html.replace(builtinRe, (m) => `<span class="ph-builtin">${m}</span>`)

  // Numbers (integers and floats, including scientific notation)
  html = html.replace(/\b(\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, '<span class="ph-number">$1</span>')

  // Restore tokens
  for (let i = 0; i < tokens.length; i++) {
    html = html.replace(placeholder(i), tokens[i])
  }

  return html
})
</script>

<style scoped>
.python-highlight {
  background: var(--color-bg-code);
  border: 1px solid var(--color-border-medium);
  border-radius: var(--radius-md);
  padding: 1rem;
  font-size: 0.85rem;
  overflow-x: auto;
  line-height: 1.5;
  font-family: var(--font-mono);
  margin: 0;
}
:deep(.ph-keyword) { color: #7c3aed; font-weight: 500; }
:deep(.ph-builtin) { color: #0369a1; }
:deep(.ph-decorator) { color: #0369a1; font-style: italic; }
:deep(.ph-number) { color: #0369a1; }
:deep(.ph-comment) { color: #6b7280; font-style: italic; }
:deep(.ph-string) { color: #16a34a; }
</style>
