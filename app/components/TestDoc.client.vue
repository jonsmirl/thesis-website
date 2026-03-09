<template>
  <div class="test-doc" v-html="rendered"></div>
</template>

<script setup lang="ts">
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = defineProps<{ text: string }>()

const rendered = computed(() => {
  if (!props.text) return ''

  let text = props.text

  // Remove ==== separator lines
  text = text.replace(/^=+\s*$/gm, '')

  // Remove leading/trailing blank lines left by separator removal
  text = text.replace(/\n{3,}/g, '\n\n')

  // Split into lines for structured processing
  const lines = text.split('\n')
  const blocks: string[] = []
  let currentBlock: string[] = []
  let inList = false

  function flushBlock() {
    if (currentBlock.length > 0) {
      blocks.push(currentBlock.join('\n'))
      currentBlock = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Empty line → paragraph break
    if (trimmed === '') {
      flushBlock()
      inList = false
      continue
    }

    // Detect list items: "  - item" or "- item"
    const bulletMatch = trimmed.match(/^[-•]\s+(.*)/)
    if (bulletMatch) {
      if (!inList) {
        flushBlock()
        inList = true
      }
      currentBlock.push(`<li>${renderInline(bulletMatch[1])}</li>`)
      continue
    }

    // Continuation of a list item (indented text after a bullet)
    if (inList && line.match(/^\s{4,}/) && currentBlock.length > 0) {
      // Append to last <li>
      const last = currentBlock[currentBlock.length - 1]
      currentBlock[currentBlock.length - 1] = last.replace('</li>', '<br>' + renderInline(trimmed) + '</li>')
      continue
    }

    // Detect test/section headers: "Test N:", "Prediction:", "P1:", "P2 (desc):"
    const headerMatch = trimmed.match(/^(Test\s+\d+|P\d+|Prediction\s*\d*|Theory|Secondary|Inputs|Output|Requires|Data sources)(\s*[:(])/i)
    if (headerMatch) {
      if (inList) {
        // Close list
        blocks.push('<ul>' + currentBlock.join('') + '</ul>')
        currentBlock = []
        inList = false
      } else {
        flushBlock()
      }
      currentBlock.push(renderInline(trimmed))
      continue
    }

    if (inList) {
      // Non-list line after list → close list
      blocks.push('<ul>' + currentBlock.join('') + '</ul>')
      currentBlock = []
      inList = false
    }

    currentBlock.push(renderInline(trimmed))
  }

  // Flush remaining
  if (inList && currentBlock.length > 0) {
    blocks.push('<ul>' + currentBlock.join('') + '</ul>')
  } else {
    flushBlock()
  }

  // Render blocks into HTML
  let html = ''
  for (const block of blocks) {
    if (block.startsWith('<ul>') || block.startsWith('<table')) {
      html += block
    } else {
      // Check if first line is a header-like pattern
      const firstLine = block.split('\n')[0]
      const isTitle = blocks.indexOf(block) === 0 && !firstLine.includes('\n')
      const isSection = firstLine.match(/^(Test\s+\d+|P\d+|Prediction\s*\d*|Theory|Secondary|Inputs|Output|Requires|Data sources)\s*[:(]/i)

      if (isTitle && blocks.length > 1) {
        html += `<h4 class="test-title">${block}</h4>`
      } else if (isSection) {
        const lines = block.split('\n')
        const header = lines[0]
        const rest = lines.slice(1).join('<br>')
        // Bold the label part before the colon
        const colonIdx = header.indexOf(':')
        if (colonIdx >= 0) {
          const label = header.slice(0, colonIdx + 1)
          const desc = header.slice(colonIdx + 1)
          html += `<div class="test-section"><strong>${label}</strong>${desc}`
        } else {
          html += `<div class="test-section"><strong>${header}</strong>`
        }
        if (rest) html += '<br>' + rest
        html += '</div>'
      } else {
        html += `<p>${block.replace(/\n/g, '<br>')}</p>`
      }
    }
  }

  return html
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

function texify(expr: string): string {
  // Convert ASCII math to LaTeX: Greek names, subscripts, superscripts
  let s = expr
  // Greek letters
  s = s.replace(new RegExp(`\\b(${GREEK_PAT})\\b`, 'g'), m => GREEK[m] || m)
  // Subscripts: word_word or word_{...}
  s = s.replace(/(\w)_\{([^}]+)\}/g, '$1_{$2}')
  s = s.replace(/(\w)_([A-Za-z0-9]+)/g, '$1_{$2}')
  // Superscripts: word^word or word^{...}
  s = s.replace(/(\w)\^\{([^}]+)\}/g, '$1^{$2}')
  s = s.replace(/(\w)\^(\w+)/g, '$1^{$2}')
  // Arrows
  s = s.replace(/->/g, '\\to ')
  // Tilde as approx
  s = s.replace(/\s~\s/g, ' \\approx ')
  return s
}

function renderKatex(tex: string): string {
  try {
    return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })
  } catch { return tex }
}

// Sentinel to mark already-rendered KaTeX spans so we don't double-process
const K_OPEN = '\x00K<'
const K_CLOSE = '>\x00'

function safeKatex(tex: string): string {
  const html = renderKatex(tex)
  // Wrap with sentinels so subsequent regexes skip rendered spans
  return K_OPEN + html + K_CLOSE
}

function renderInline(text: string): string {
  let s = escapeHtml(text)

  // Inline math: $...$  (explicit delimiters — highest priority)
  s = s.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match: string, tex: string) => safeKatex(tex))

  // Auto-detect math patterns and render with KaTeX
  // Each replacement uses safeKatex so later patterns skip rendered spans

  // 1. Formulas: "VAR = EXPR" where EXPR contains Greek or ^ or _
  s = s.replace(/\b([A-Za-z_]\w*(?:[_^]\w+)?)\s*=\s*([^,\n]{3,60}?)(?=[,.\s]|$)/g, (match) => {
    // Only if it contains math-like content
    if (match.includes(K_OPEN)) return match  // already rendered
    if (new RegExp(`\\b(${GREEK_PAT})\\b`).test(match) || /[\^_]/.test(match)) {
      return safeKatex(texify(match))
    }
    return match
  })

  // 2. Expressions with ^ or _ : "K^2", "sigma^2", "N_eff", "K_eff", "tau_{n+1}"
  s = s.replace(/\b([A-Za-z]\w*(?:[_^]\{?[\w+]+\}?)+)/g, (match) => {
    if (match.includes(K_OPEN)) return match
    return safeKatex(texify(match))
  })

  // 3. Greek + comparison: "rho < 1", "sigma &lt; 2" (note: < is escaped to &lt; by escapeHtml... actually we only escape &)
  s = s.replace(new RegExp(`\\b(${GREEK_PAT})\\s*([<>]=?\\s*-?\\d+\\.?\\d*)`, 'g'),
    (match) => {
      if (match.includes(K_OPEN)) return match
      return safeKatex(texify(match))
    })

  // 4. Standalone Greek letters not already rendered
  s = s.replace(new RegExp(`(?<![\\w])\\b(${GREEK_PAT})\\b(?![\\w])`, 'g'),
    (match, _g, offset) => {
      // Check if inside a sentinel-wrapped block
      const before = s.slice(Math.max(0, offset - 100), offset)
      if (before.includes(K_OPEN) && !before.includes(K_CLOSE)) return match
      return safeKatex(texify(match))
    })

  // Remove sentinels
  s = s.replace(/\x00K</g, '').replace(/>\x00/g, '')

  // Markdown bold **...**
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Markdown italic *...*
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // Markdown backtick `...`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')

  return s
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;')
}
</script>

<style>
.test-doc {
  line-height: 1.7;
  font-size: 0.95rem;
  color: #1a1a1a;
}
.test-doc p {
  margin: 0.6rem 0;
}
.test-doc p:first-child {
  margin-top: 0;
}
.test-doc h4.test-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  color: #111;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.4rem;
}
.test-doc .test-section {
  margin: 0.75rem 0;
  padding: 0.5rem 0.75rem;
  background: #f8f9fb;
  border-left: 3px solid #94a3b8;
  border-radius: 0 4px 4px 0;
  font-size: 0.92rem;
}
.test-doc .test-section strong {
  color: #334155;
}
.test-doc ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}
.test-doc li {
  margin: 0.25rem 0;
  font-size: 0.92rem;
}
.test-doc code {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.85em;
  background: #f0f2f5;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}
.test-doc .katex {
  font-size: 1em;
}
</style>
