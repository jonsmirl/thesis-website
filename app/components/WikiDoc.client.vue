<template>
  <div class="wiki-doc" v-html="rendered"></div>
</template>

<script setup lang="ts">
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = defineProps<{ text: string }>()

const rendered = computed(() => {
  if (!props.text) return ''
  return renderMarkdown(props.text)
})

function renderMarkdown(text: string) {
  let html = escapeHtml(text)

  // Display math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })
    } catch { return tex }
  })

  // Inline math: $...$
  html = html.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })
    } catch { return tex }
  })

  // Wiki links: [[slug]] and [[slug|display text]]
  html = html.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_match, slug, display) => {
    const linkText = display || slug.replace(/-/g, ' ')
    return `<a href="/wiki/${slug}" class="wiki-link">${linkText}</a>`
  })

  // Headers: ## ... and ### ...
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')

  // Bold **...**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Italic *...*
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')

  // Backtick `...`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Bullet lists: lines starting with -
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

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;')
}
</script>

<style>
.wiki-doc {
  line-height: 1.8;
  font-size: 0.95rem;
  color: #222;
}
.wiki-doc p { margin: 0.6rem 0; }
.wiki-doc h2 {
  font-size: 1.15rem;
  margin: 1.5rem 0 0.5rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid #eee;
}
.wiki-doc h3 {
  font-size: 1rem;
  margin: 1.25rem 0 0.4rem;
}
.wiki-doc code {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.85em;
  background: #f6f8fa;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}
.wiki-doc ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}
.wiki-doc li { margin-bottom: 0.25rem; }
.wiki-doc .katex-display { margin: 0.75rem 0; }
.wiki-doc .wiki-link {
  color: #0066cc;
  text-decoration: none;
  border-bottom: 1px dashed #0066cc;
}
.wiki-doc .wiki-link:hover {
  border-bottom-style: solid;
}
.wiki-doc .wiki-table {
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.9rem;
  width: 100%;
}
.wiki-doc .wiki-table th,
.wiki-doc .wiki-table td {
  border: 1px solid #e1e4e8;
  padding: 0.35rem 0.6rem;
  text-align: left;
}
.wiki-doc .wiki-table th {
  background: #f6f8fa;
  font-weight: 600;
}
</style>
