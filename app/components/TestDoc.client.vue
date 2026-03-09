<template>
  <div class="test-doc" v-html="rendered"></div>
</template>

<script setup lang="ts">
import { escapeHtml, safeKatex, texify, autoDetectMath, GREEK_PAT, K_OPEN, K_CLOSE } from '~/utils/math-render'

const props = defineProps<{ text: string }>()

const rendered = computed(() => {
  if (!props.text) return ''

  let text = props.text

  // Remove ==== separator lines
  text = text.replace(/^=+\s*$/gm, '')
  text = text.replace(/\n{3,}/g, '\n\n')

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

    if (trimmed === '') {
      flushBlock()
      inList = false
      continue
    }

    const bulletMatch = trimmed.match(/^[-\u2022]\s+(.*)/)
    if (bulletMatch) {
      if (!inList) {
        flushBlock()
        inList = true
      }
      currentBlock.push(`<li>${renderInline(bulletMatch[1])}</li>`)
      continue
    }

    if (inList && line.match(/^\s{4,}/) && currentBlock.length > 0) {
      const last = currentBlock[currentBlock.length - 1]
      currentBlock[currentBlock.length - 1] = last.replace('</li>', '<br>' + renderInline(trimmed) + '</li>')
      continue
    }

    const headerMatch = trimmed.match(/^(Test\s+\d+|P\d+|Prediction\s*\d*|Theory|Secondary|Inputs|Output|Requires|Data sources)(\s*[:(])/i)
    if (headerMatch) {
      if (inList) {
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
      blocks.push('<ul>' + currentBlock.join('') + '</ul>')
      currentBlock = []
      inList = false
    }

    currentBlock.push(renderInline(trimmed))
  }

  if (inList && currentBlock.length > 0) {
    blocks.push('<ul>' + currentBlock.join('') + '</ul>')
  } else {
    flushBlock()
  }

  let html = ''
  for (const block of blocks) {
    if (block.startsWith('<ul>') || block.startsWith('<table')) {
      html += block
    } else {
      const firstLine = block.split('\n')[0]
      const isTitle = blocks.indexOf(block) === 0 && !firstLine.includes('\n')
      const isSection = firstLine.match(/^(Test\s+\d+|P\d+|Prediction\s*\d*|Theory|Secondary|Inputs|Output|Requires|Data sources)\s*[:(]/i)

      if (isTitle && blocks.length > 1) {
        html += `<h4 class="test-title">${block}</h4>`
      } else if (isSection) {
        const lines = block.split('\n')
        const header = lines[0]
        const rest = lines.slice(1).join('<br>')
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

function renderInline(text: string): string {
  let s = escapeHtml(text)

  // Inline math: $...$
  s = s.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match: string, tex: string) => safeKatex(tex))

  // Auto-detect math patterns
  s = autoDetectMath(s)

  // Markdown bold **...**
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Markdown italic *...*
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // Markdown backtick `...`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')

  return s
}
</script>

<style>
.test-doc {
  line-height: 1.7;
  font-size: 0.95rem;
  color: var(--color-text-primary);
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
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.4rem;
}
.test-doc .test-section {
  margin: 0.75rem 0;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-surface-warm);
  border-left: 3px solid #94a3b8;
  border-radius: 0 4px 4px 0;
  font-size: 0.92rem;
}
.test-doc .test-section strong {
  color: var(--color-text-secondary);
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
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: var(--color-bg-inset);
  padding: 0.1rem 0.3rem;
  border-radius: var(--radius-sm);
}
.test-doc .katex {
  font-size: 1em;
}
</style>
