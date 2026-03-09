<template>
  <div class="wiki-doc" v-html="rendered"></div>
</template>

<script setup lang="ts">
import { escapeHtml, renderKatex } from '~/utils/math-render'

const props = defineProps<{ text: string }>()

const rendered = computed(() => {
  if (!props.text) return ''
  return renderMarkdown(props.text)
})

function renderMarkdown(text: string) {
  let html = escapeHtml(text)

  // Display math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex) => renderKatex(tex, true))

  // Inline math: $...$
  html = html.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match, tex) => renderKatex(tex))

  // Wiki links: [[slug]] and [[slug|display text]]
  html = html.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_match, slug, display) => {
    const linkText = display || slug.replace(/-/g, ' ')
    return `<a href="/wiki/${slug}" class="wiki-link">${linkText}</a>`
  })

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')

  // Bold **...**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Italic *...*
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')

  // Backtick `...`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Bullet lists
  html = html.replace(/((?:^|\n)- .+(?:\n- .+)*)/g, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`)
    return `<ul>${items.join('')}</ul>`
  })

  // Markdown tables
  html = html.replace(/((?:^|\n)\|[^\n]+(?:\n\|[^\n]+)+)/g, (tableBlock) => {
    const lines = tableBlock.trim().split('\n').filter(l => l.trim().startsWith('|'))
    if (lines.length < 2) return tableBlock
    const parseRow = (line: string) =>
      line.split('|').slice(1, -1).map(cell => cell.trim())
    const headers = parseRow(lines[0])
    const startIdx = lines[1].match(/^\|\s*[-:]+/) ? 2 : 1
    const bodyRows = lines.slice(startIdx).map(parseRow)
    let t = '<table class="wiki-table"><thead><tr>'
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
.wiki-doc {
  line-height: 1.85;
  font-size: 0.95rem;
  color: var(--color-text-primary);
  font-family: var(--font-serif);
}
.wiki-doc p { margin: 0.6rem 0; }
.wiki-doc h2 {
  font-size: 1.15rem;
  font-family: var(--font-sans);
  margin: 1.5rem 0 0.5rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--color-border-light);
}
.wiki-doc h3 {
  font-size: 1rem;
  font-family: var(--font-sans);
  margin: 1.25rem 0 0.4rem;
}
.wiki-doc code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: var(--color-bg-code);
  padding: 0.1rem 0.3rem;
  border-radius: var(--radius-sm);
}
.wiki-doc ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}
.wiki-doc li { margin-bottom: 0.25rem; }
.wiki-doc .katex-display { margin: 0.75rem 0; }
.wiki-doc .wiki-link {
  color: var(--color-link);
  text-decoration: none;
  border-bottom: 1px dashed var(--color-link);
}
.wiki-doc .wiki-link:hover {
  border-bottom-style: solid;
}
.wiki-doc .wiki-table {
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.9rem;
  width: 100%;
  font-family: var(--font-sans);
}
.wiki-doc .wiki-table th,
.wiki-doc .wiki-table td {
  border: 1px solid var(--color-border-medium);
  padding: 0.35rem 0.6rem;
  text-align: left;
}
.wiki-doc .wiki-table th {
  background: var(--color-bg-code);
  font-weight: 600;
}
</style>
