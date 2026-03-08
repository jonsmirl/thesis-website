<template>
  <div class="math-doc" v-html="rendered"></div>
</template>

<script setup lang="ts">
import katex from 'katex'
import 'katex/dist/katex.min.css'

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

function renderBlock(text: string) {
  let html = escapeHtml(text)

  // Display math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })
    } catch { return tex }
  })

  // Inline math: $...$  (not preceded/followed by $)
  html = html.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })
    } catch { return tex }
  })

  // Markdown bold **...**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Markdown backtick `...`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Paragraphs: double newline
  html = html.replace(/\n\n+/g, '</p><p>')

  // Single newlines within a paragraph
  html = html.replace(/\n/g, ' ')

  return '<p>' + html + '</p>'
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
</style>
