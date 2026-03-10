<template>
  <div class="math-doc" v-html="rendered"></div>
</template>

<script setup lang="ts">
import katex from 'katex'
import { citationRegex, getCitationUrl } from '~/utils/citations'

const props = defineProps<{ text: string }>()

// Local math rendering (katex must be imported directly in .client.vue)
const GREEK: Record<string, string> = {
  alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma', delta: '\\delta',
  epsilon: '\\epsilon', zeta: '\\zeta', eta: '\\eta', theta: '\\theta',
  kappa: '\\kappa', lambda: '\\lambda', mu: '\\mu', nu: '\\nu',
  xi: '\\xi', pi: '\\pi', rho: '\\rho', sigma: '\\sigma',
  tau: '\\tau', phi: '\\phi', chi: '\\chi', psi: '\\psi', omega: '\\omega',
  Phi: '\\Phi', Sigma: '\\Sigma', Delta: '\\Delta', Gamma: '\\Gamma',
  Omega: '\\Omega', Pi: '\\Pi', Lambda: '\\Lambda',
}
const GREEK_PAT = Object.keys(GREEK).sort((a, b) => b.length - a.length).join('|')
const K_OPEN = '\x00K<'
const K_CLOSE = '>\x00'

function texify(expr: string): string {
  let s = expr
  s = s.replace(new RegExp(`\\b(${GREEK_PAT})\\b`, 'g'), m => GREEK[m] || m)
  s = s.replace(/(\w)_\{([^}]+)\}/g, '$1_{$2}')
  s = s.replace(/(\w)_([A-Za-z0-9]+)/g, '$1_{$2}')
  s = s.replace(/(\w)\^\{([^}]+)\}/g, '$1^{$2}')
  s = s.replace(/(\w)\^(\w+)/g, '$1^{$2}')
  s = s.replace(/->/g, '\\to ')
  s = s.replace(/\s~\s/g, ' \\approx ')
  return s
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;')
}

function safeKatex(tex: string): string {
  try {
    const html = katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })
    return K_OPEN + html + K_CLOSE
  } catch { return tex }
}

function autoDetectMath(html: string): string {
  html = html.replace(/\b([A-Za-z_]\w*(?:[_^]\w+)?)\s*=\s*([^,.\n]{3,60}?)(?=[,.\s]|$)/g, (match) => {
    if (match.includes(K_OPEN)) return match
    if (new RegExp(`\\b(${GREEK_PAT})\\b`).test(match) || /[\^_]/.test(match)) {
      return safeKatex(texify(match))
    }
    return match
  })
  html = html.replace(/\b([A-Za-z]\w*(?:[_^]\{?[\w,+-]+\}?)+)/g, (match) => {
    if (match.includes(K_OPEN)) return match
    return safeKatex(texify(match))
  })
  html = html.replace(new RegExp(`\\b(${GREEK_PAT})\\s*([<>≤≥≈]=?\\s*-?\\d+\\.?\\d*)`, 'g'),
    (match) => {
      if (match.includes(K_OPEN)) return match
      return safeKatex(texify(match))
    })
  html = html.replace(new RegExp(`(?<![\\w])\\b(${GREEK_PAT})\\b(?![\\w])`, 'g'),
    (match, _g, offset) => {
      const before = html.slice(Math.max(0, offset - 100), offset)
      if (before.includes(K_OPEN) && !before.includes(K_CLOSE)) return match
      return safeKatex(texify(match))
    })
  html = html.replace(/\x00K</g, '').replace(/>\x00/g, '')
  return html
}

const rendered = computed(() => {
  if (!props.text) return ''

  const proofMarker = '**Proof.**'
  const markerIdx = props.text.indexOf(proofMarker)

  let statementPart = props.text
  let proofPart = ''

  if (markerIdx >= 0) {
    statementPart = props.text.slice(0, markerIdx).trimEnd()
    proofPart = props.text.slice(markerIdx + proofMarker.length).trim()
  }

  const statementHtml = renderBlock(statementPart)

  if (!proofPart) return statementHtml

  const proofHtml = renderBlock(proofPart)
  return statementHtml +
    '<div class="proof-sketch">' +
    '<div class="proof-label">Proof</div>' +
    '<div class="proof-body">' + proofHtml + '</div>' +
    '</div>'
})

function renderBlock(text: string) {
  let html = escapeHtml(text)

  // Display math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })
    } catch { return tex }
  })

  // Inline math: $...$
  html = html.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match, tex) => safeKatex(tex))

  // Auto-detect math patterns
  html = autoDetectMath(html)

  // Markdown bold **...**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Markdown backtick `...`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Citation hyperlinks
  html = html.replace(/\(([^)]+)\)/g, (full, inner) => {
    const citMatch = inner.match(citationRegex)
    if (citMatch) {
      const url = getCitationUrl(citMatch[0])
      if (url) return `(<a href="${url}" class="citation-link" target="_blank" rel="noopener">${inner}</a>)`
    }
    return full
  })
  html = html.replace(citationRegex, (match) => {
    const url = getCitationUrl(match)
    if (url) return `<a href="${url}" class="citation-link" target="_blank" rel="noopener">${match}</a>`
    return match
  })
  html = html.replace(/<a ([^>]+)><a [^>]+>/g, '<a $1>')
  html = html.replace(/<\/a><\/a>/g, '</a>')

  // Markdown tables
  html = html.replace(/((?:^|\n)\|[^\n]+(?:\n\|[^\n]+)+)/g, (tableBlock) => {
    const lines = tableBlock.trim().split('\n').filter(l => l.trim().startsWith('|'))
    if (lines.length < 2) return tableBlock
    const parseRow = (line: string) =>
      line.split('|').slice(1, -1).map(cell => cell.trim())
    const headers = parseRow(lines[0])
    const startIdx = lines[1].match(/^\|\s*[-:]+/) ? 2 : 1
    const bodyRows = lines.slice(startIdx).map(parseRow)
    let t = '<table class="md-table"><thead><tr>'
    t += headers.map(h => `<th>${h}</th>`).join('')
    t += '</tr></thead><tbody>'
    for (const row of bodyRows) {
      t += '<tr>' + row.map(c => `<td>${c}</td>`).join('') + '</tr>'
    }
    t += '</tbody></table>'
    return t
  })

  // Paragraphs
  html = html.replace(/\n\n+/g, '</p><p>')
  html = html.replace(/\n/g, '<br>')

  return '<p>' + html + '</p>'
}
</script>

<style>
.math-doc {
  line-height: 1.7;
  white-space: normal;
}
.math-doc p {
  margin: 0.5rem 0;
}
.math-doc p:first-child {
  margin-top: 0;
}
.math-doc .katex-display {
  margin: 0.75rem 0;
}
.math-doc code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: var(--color-bg-code);
  padding: 0.1rem 0.3rem;
  border-radius: var(--radius-sm);
}
.proof-sketch {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-bg-surface-warm);
  border-left: 3px solid #94a3b8;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}
.proof-label {
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #475569;
  margin-bottom: 0.4rem;
}
.proof-body {
  font-size: 0.93rem;
  color: var(--color-text-secondary);
}
.proof-body p {
  margin: 0.3rem 0;
}
.math-doc :deep(.md-table) {
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.9rem;
  width: 100%;
}
.math-doc :deep(.md-table th),
.math-doc :deep(.md-table td) {
  border: 1px solid var(--color-border-medium);
  padding: 0.35rem 0.6rem;
  text-align: left;
}
.math-doc :deep(.md-table th) {
  background: var(--color-bg-code);
  font-weight: 600;
}
.math-doc :deep(.md-table tr:nth-child(even)) {
  background: var(--color-bg-surface-alt);
}
.math-doc :deep(.citation-link) {
  color: var(--color-link);
  text-decoration: none;
  border-bottom: 1px dotted var(--color-link);
}
.math-doc :deep(.citation-link:hover) {
  border-bottom-style: solid;
}
</style>
