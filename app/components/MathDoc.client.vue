<template>
  <div class="math-doc" v-html="rendered"></div>
</template>

<script setup lang="ts">
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { citationRegex, getCitationUrl } from '~/utils/citations'

const props = defineProps<{ text: string }>()

const rendered = computed(() => {
  if (!props.text) return ''

  // Split on **Proof.** to separate statement from proof sketch
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

// Map ASCII Greek names to LaTeX commands
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

function safeKatex(tex: string): string {
  try {
    const html = katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })
    return K_OPEN + html + K_CLOSE
  } catch { return tex }
}

function renderBlock(text: string) {
  let html = escapeHtml(text)

  // Display math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })
    } catch { return tex }
  })

  // Inline math: $...$  (not preceded/followed by $)
  html = html.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match, tex) => safeKatex(tex))

  // Auto-detect math patterns (same as TestDoc)

  // 1. Formulas: "VAR = EXPR" containing Greek or ^ or _
  html = html.replace(/\b([A-Za-z_]\w*(?:[_^]\w+)?)\s*=\s*([^,.\n]{3,60}?)(?=[,.\s]|$)/g, (match) => {
    if (match.includes(K_OPEN)) return match
    if (new RegExp(`\\b(${GREEK_PAT})\\b`).test(match) || /[\^_]/.test(match)) {
      return safeKatex(texify(match))
    }
    return match
  })

  // 2. Expressions with ^ or _ : "K^2", "sigma^2", "N_eff", "K_eff", "k_{n,n-1}"
  html = html.replace(/\b([A-Za-z]\w*(?:[_^]\{?[\w,+-]+\}?)+)/g, (match) => {
    if (match.includes(K_OPEN)) return match
    return safeKatex(texify(match))
  })

  // 3. Greek + comparison: "rho < 1", "sigma < 2"
  html = html.replace(new RegExp(`\\b(${GREEK_PAT})\\s*([<>≤≥≈]=?\\s*-?\\d+\\.?\\d*)`, 'g'),
    (match) => {
      if (match.includes(K_OPEN)) return match
      return safeKatex(texify(match))
    })

  // 4. Standalone Greek letters not already rendered
  html = html.replace(new RegExp(`(?<![\\w])\\b(${GREEK_PAT})\\b(?![\\w])`, 'g'),
    (match, _g, offset) => {
      const before = html.slice(Math.max(0, offset - 100), offset)
      if (before.includes(K_OPEN) && !before.includes(K_CLOSE)) return match
      return safeKatex(texify(match))
    })

  // Remove sentinels
  html = html.replace(/\x00K</g, '').replace(/>\x00/g, '')

  // Markdown bold **...**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Markdown backtick `...`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Citation hyperlinks
  // Pass 1: Parenthetical citations — link the entire (Author Year, ...) group
  html = html.replace(/\(([^)]+)\)/g, (full, inner) => {
    // Check if this paren group contains a known citation
    const citMatch = inner.match(citationRegex)
    if (citMatch) {
      const url = getCitationUrl(citMatch[0])
      if (url) return `(<a href="${url}" class="citation-link" target="_blank" rel="noopener">${inner}</a>)`
    }
    return full
  })
  // Pass 2: Narrative citations — Author (Year) not already inside a link
  html = html.replace(citationRegex, (match) => {
    // Skip if already inside an <a> tag
    const url = getCitationUrl(match)
    if (url) return `<a href="${url}" class="citation-link" target="_blank" rel="noopener">${match}</a>`
    return match
  })
  // Clean up double-wrapped links from both passes
  html = html.replace(/<a ([^>]+)><a [^>]+>/g, '<a $1>')
  html = html.replace(/<\/a><\/a>/g, '</a>')

  // Markdown tables: detect consecutive lines starting with |
  html = html.replace(/((?:^|\n)\|[^\n]+(?:\n\|[^\n]+)+)/g, (tableBlock) => {
    const lines = tableBlock.trim().split('\n').filter(l => l.trim().startsWith('|'))
    if (lines.length < 2) return tableBlock
    const parseRow = (line: string) =>
      line.split('|').slice(1, -1).map(cell => cell.trim())
    const headers = parseRow(lines[0])
    // Skip separator line (|---|---|...)
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

  // Paragraphs: double newline
  html = html.replace(/\n\n+/g, '</p><p>')

  // Single newlines → line breaks
  html = html.replace(/\n/g, '<br>')

  return '<p>' + html + '</p>'
}

function escapeHtml(s: string) {
  // Only escape &. Don't escape < and > since docstrings are trusted Lean content
  // and may contain math comparisons like ρ < 0 that should render as-is.
  return s.replace(/&/g, '&amp;')
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
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.85em;
  background: #f6f8fa;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}
.proof-sketch {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: #f8f9fb;
  border-left: 3px solid #94a3b8;
  border-radius: 0 6px 6px 0;
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
  color: #334155;
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
  border: 1px solid #e1e4e8;
  padding: 0.35rem 0.6rem;
  text-align: left;
}
.math-doc :deep(.md-table th) {
  background: #f6f8fa;
  font-weight: 600;
}
.math-doc :deep(.md-table tr:nth-child(even)) {
  background: #fafbfc;
}
.math-doc :deep(.citation-link) {
  color: #0066cc;
  text-decoration: none;
  border-bottom: 1px dotted #0066cc;
}
.math-doc :deep(.citation-link:hover) {
  border-bottom-style: solid;
}
</style>
