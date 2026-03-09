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

function renderInline(text: string): string {
  let s = escapeHtml(text)

  // Inline math: $...$
  s = s.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match: string, tex: string) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })
    } catch { return tex }
  })

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
