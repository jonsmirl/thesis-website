<template>
  <div class="paper-doc" v-html="rendered"></div>
</template>

<script setup lang="ts">
import { escapeHtml, renderKatex } from '~/utils/math-render'

const props = defineProps<{
  text: string
  bibliography?: Array<{ key: string; text: string }>
}>()

const rendered = computed(() => {
  if (!props.text) return ''
  return renderPaperMarkdown(props.text, props.bibliography || [])
})

function renderPaperMarkdown(text: string, bib: Array<{ key: string; text: string }>) {
  // --- Pass 0: Extract fenced div environments before escaping ---
  const envPlaceholders: string[] = []
  // Match ::: type [Title]\ncontent\n:::
  text = text.replace(/^:::\s*(\w+)\s*(?:\[([^\]]*)\])?\s*\n([\s\S]*?)^:::\s*$/gm,
    (_match, type, title, content) => {
      const idx = envPlaceholders.length
      const envClass = `env-${type}`
      const label = type.charAt(0).toUpperCase() + type.slice(1)
      const titleHtml = title ? `<strong>${label}</strong> (${title})` : `<strong>${label}</strong>`
      // Process the inner content as markdown (recursive, but without env processing)
      const innerHtml = renderInnerMarkdown(content.trim(), bib)
      envPlaceholders.push(
        `<div class="${envClass}">` +
        `<div class="env-header">${titleHtml}</div>` +
        `<div class="env-body">${innerHtml}</div>` +
        `</div>`
      )
      return `%%ENV_${idx}%%`
    }
  )

  // --- Pass 1: Extract images before escapeHtml ---
  const imagePlaceholders: string[] = []
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const idx = imagePlaceholders.length
    const caption = alt || ''
    imagePlaceholders.push(
      `<figure class="paper-figure">` +
      `<img src="${url}" alt="${caption}" loading="lazy">` +
      (caption ? `<figcaption>${caption}</figcaption>` : '') +
      `</figure>`
    )
    return `%%IMG_${idx}%%`
  })

  let html = escapeHtml(text)

  // Restore placeholders
  html = html.replace(/%%IMG_(\d+)%%/g, (_match, idx) => imagePlaceholders[parseInt(idx)])
  html = html.replace(/%%ENV_(\d+)%%/g, (_match, idx) => envPlaceholders[parseInt(idx)])

  // --- Pass 2: Math ---
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex) => renderKatex(tex, true))
  html = html.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match, tex) => renderKatex(tex))

  // --- Pass 3: Cross-references ---
  // Wiki links: [[slug]] and [[slug|display text]]
  html = html.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_match, slug, display) => {
    // Check for prefixed refs: test:slug, figure:slug
    if (slug.startsWith('test:')) {
      const testSlug = slug.slice(5)
      const linkText = display || testSlug.replace(/-/g, ' ')
      return `<a href="/tests/${testSlug}" class="ref-link ref-test">${linkText}</a>`
    }
    if (slug.startsWith('figure:')) {
      const figSlug = slug.slice(7)
      const linkText = display || figSlug.replace(/-/g, ' ')
      return `<a href="/figures/${figSlug}" class="ref-link ref-figure">${linkText}</a>`
    }
    const linkText = display || slug.replace(/-/g, ' ')
    return `<a href="/wiki/${slug}" class="wiki-link">${linkText}</a>`
  })

  // Theorem refs: {{name}} or {{name|display}}
  html = html.replace(/\{\{([^}|]+?)(?:\|([^}]+?))?\}\}/g, (_match, name, display) => {
    const linkText = display || name.replace(/_/g, ' ')
    return `<a href="/theorems/${name}" class="ref-link ref-theorem">${linkText}</a>`
  })

  // Citation refs: [@Key] → numbered superscript
  const citationMap = new Map<string, number>()
  let citNum = 0
  html = html.replace(/\[@(\w+)\]/g, (_match, key) => {
    if (!citationMap.has(key)) {
      citNum++
      citationMap.set(key, citNum)
    }
    const n = citationMap.get(key)!
    return `<sup class="citation"><a href="#cite-${key}" id="citeref-${key}">[${n}]</a></sup>`
  })

  // --- Pass 4: Section numbering ---
  let sectionCounter = [0, 0, 0] // h2, h3, h4
  html = html.replace(/^(#{2,4}) (.+)$/gm, (_match, hashes, title) => {
    const level = hashes.length // 2, 3, or 4
    if (level === 2) {
      sectionCounter[0]++
      sectionCounter[1] = 0
      sectionCounter[2] = 0
    } else if (level === 3) {
      sectionCounter[1]++
      sectionCounter[2] = 0
    } else {
      sectionCounter[2]++
    }
    const num = level === 2 ? `${sectionCounter[0]}`
      : level === 3 ? `${sectionCounter[0]}.${sectionCounter[1]}`
      : `${sectionCounter[0]}.${sectionCounter[1]}.${sectionCounter[2]}`
    const id = `sec-${num.replace(/\./g, '-')}`
    return `<h${level} id="${id}"><span class="sec-num">${num}.</span> ${title}</h${level}>`
  })

  // --- Pass 5: Standard markdown ---
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Bullet lists
  html = html.replace(/((?:^|\n)- .+(?:\n- .+)*)/g, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`)
    return `<ul>${items.join('')}</ul>`
  })

  // Numbered lists
  html = html.replace(/((?:^|\n)\d+\. .+(?:\n\d+\. .+)*)/g, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\.\s/, '')}</li>`)
    return `<ol>${items.join('')}</ol>`
  })

  // Tables
  html = html.replace(/((?:^|\n)\|[^\n]+(?:\n\|[^\n]+)+)/g, (tableBlock) => {
    const lines = tableBlock.trim().split('\n').filter(l => l.trim().startsWith('|'))
    if (lines.length < 2) return tableBlock
    const parseRow = (line: string) =>
      line.split('|').slice(1, -1).map(cell => cell.trim())
    const headers = parseRow(lines[0])
    const startIdx = lines[1].match(/^\|\s*[-:]/) ? 2 : 1
    const bodyRows = lines.slice(startIdx).map(parseRow)
    let t = '<table class="paper-table"><thead><tr>'
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

  // --- Pass 6: Bibliography ---
  if (bib.length > 0 && citationMap.size > 0) {
    let bibHtml = '<div class="bibliography"><h2>References</h2><ol class="bib-list">'
    for (const [key, num] of citationMap) {
      const entry = bib.find(b => b.key === key)
      const text = entry ? entry.text : key
      bibHtml += `<li id="cite-${key}" value="${num}"><a href="#citeref-${key}" class="bib-backref">&uarr;</a> ${text}</li>`
    }
    bibHtml += '</ol></div>'
    html = '<p>' + html + '</p>' + bibHtml
  } else {
    html = '<p>' + html + '</p>'
  }

  return html
}

/** Render inner markdown (for environment bodies) — no env processing, no section numbering */
function renderInnerMarkdown(text: string, bib: Array<{ key: string; text: string }>) {
  const imagePlaceholders: string[] = []
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const idx = imagePlaceholders.length
    imagePlaceholders.push(`<img src="${url}" alt="${alt || ''}" loading="lazy">`)
    return `%%IMG_${idx}%%`
  })

  let html = escapeHtml(text)
  html = html.replace(/%%IMG_(\d+)%%/g, (_match, idx) => imagePlaceholders[parseInt(idx)])

  // Math
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex) => renderKatex(tex, true))
  html = html.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match, tex) => renderKatex(tex))

  // Wiki links
  html = html.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_match, slug, display) => {
    if (slug.startsWith('test:')) {
      const testSlug = slug.slice(5)
      return `<a href="/tests/${testSlug}" class="ref-link ref-test">${display || testSlug.replace(/-/g, ' ')}</a>`
    }
    if (slug.startsWith('figure:')) {
      const figSlug = slug.slice(7)
      return `<a href="/figures/${figSlug}" class="ref-link ref-figure">${display || figSlug.replace(/-/g, ' ')}</a>`
    }
    return `<a href="/wiki/${slug}" class="wiki-link">${display || slug.replace(/-/g, ' ')}</a>`
  })

  // Theorem refs
  html = html.replace(/\{\{([^}|]+?)(?:\|([^}]+?))?\}\}/g, (_match, name, display) => {
    return `<a href="/theorems/${name}" class="ref-link ref-theorem">${display || name.replace(/_/g, ' ')}</a>`
  })

  // Citations
  html = html.replace(/\[@(\w+)\]/g, (_match, key) => {
    return `<sup class="citation"><a href="#cite-${key}">[${key}]</a></sup>`
  })

  // Inline formatting
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Lists
  html = html.replace(/((?:^|\n)- .+(?:\n- .+)*)/g, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`)
    return `<ul>${items.join('')}</ul>`
  })

  // Paragraphs
  html = html.replace(/\n\n+/g, '</p><p>')
  html = html.replace(/\n/g, '<br>')

  return html
}
</script>

<style>
.paper-doc {
  line-height: 1.9;
  font-size: 1rem;
  color: var(--color-text-primary);
  font-family: var(--font-serif);
  max-width: 48rem;
}

.paper-doc p { margin: 0.75rem 0; }

.paper-doc h2 {
  font-size: 1.25rem;
  font-family: var(--font-sans);
  margin: 2rem 0 0.75rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--color-border-light);
}

.paper-doc h3 {
  font-size: 1.1rem;
  font-family: var(--font-sans);
  margin: 1.5rem 0 0.5rem;
}

.paper-doc h4 {
  font-size: 1rem;
  font-family: var(--font-sans);
  margin: 1.25rem 0 0.4rem;
}

.paper-doc .sec-num {
  color: var(--color-text-muted);
  margin-right: 0.3rem;
}

/* Academic environments */
.paper-doc .env-definition,
.paper-doc .env-theorem,
.paper-doc .env-lemma,
.paper-doc .env-proposition,
.paper-doc .env-corollary,
.paper-doc .env-proof,
.paper-doc .env-remark,
.paper-doc .env-example {
  margin: 1.25rem 0;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border-left: 3px solid;
}

.paper-doc .env-definition {
  background: rgba(59, 130, 246, 0.06);
  border-left-color: #3b82f6;
}
.paper-doc .env-theorem,
.paper-doc .env-lemma,
.paper-doc .env-proposition,
.paper-doc .env-corollary {
  background: rgba(139, 92, 246, 0.06);
  border-left-color: #8b5cf6;
}
.paper-doc .env-proof {
  background: rgba(107, 114, 128, 0.06);
  border-left-color: #6b7280;
}
.paper-doc .env-remark {
  background: rgba(16, 185, 129, 0.06);
  border-left-color: #10b981;
}
.paper-doc .env-example {
  background: rgba(245, 158, 11, 0.06);
  border-left-color: #f59e0b;
}

.paper-doc .env-header {
  font-family: var(--font-sans);
  font-size: 0.9rem;
  margin-bottom: 0.4rem;
}

.paper-doc .env-body {
  font-size: 0.95rem;
}
.paper-doc .env-body p { margin: 0.4rem 0; }

.paper-doc .env-proof .env-header::after {
  content: '';
}
.paper-doc .env-proof .env-body::after {
  content: ' \25A1'; /* QED square */
  float: right;
  color: var(--color-text-muted);
}

/* Cross-reference links */
.paper-doc .wiki-link {
  color: var(--color-link);
  text-decoration: none;
  border-bottom: 1px dashed var(--color-link);
}
.paper-doc .wiki-link:hover { border-bottom-style: solid; }

.paper-doc .ref-link {
  text-decoration: none;
  border-bottom: 1px dashed;
}
.paper-doc .ref-link:hover { border-bottom-style: solid; }
.paper-doc .ref-theorem { color: var(--color-axiom-accent); }
.paper-doc .ref-test { color: var(--color-success); }
.paper-doc .ref-figure { color: var(--color-warning); }

/* Citations */
.paper-doc .citation a {
  color: var(--color-link);
  text-decoration: none;
  font-size: 0.8em;
}
.paper-doc .citation a:hover { text-decoration: underline; }

/* Bibliography */
.paper-doc .bibliography {
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border-light);
}
.paper-doc .bibliography h2 {
  font-size: 1.1rem;
  border-bottom: none;
  margin-bottom: 0.5rem;
}
.paper-doc .bib-list {
  font-size: 0.88rem;
  padding-left: 2rem;
  line-height: 1.6;
}
.paper-doc .bib-list li {
  margin-bottom: 0.5rem;
}
.paper-doc .bib-backref {
  text-decoration: none;
  color: var(--color-text-muted);
  margin-right: 0.3rem;
}

/* Tables */
.paper-doc .paper-table {
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.9rem;
  width: 100%;
  font-family: var(--font-sans);
}
.paper-doc .paper-table th,
.paper-doc .paper-table td {
  border: 1px solid var(--color-border-medium);
  padding: 0.35rem 0.6rem;
  text-align: left;
}
.paper-doc .paper-table th {
  background: var(--color-bg-code);
  font-weight: 600;
}

/* Figures */
.paper-doc .paper-figure {
  margin: 1.25rem 0;
  text-align: center;
}
.paper-doc .paper-figure img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
}
.paper-doc .paper-figure figcaption {
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
}

/* Code */
.paper-doc code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: var(--color-bg-code);
  padding: 0.1rem 0.3rem;
  border-radius: var(--radius-sm);
}

/* Lists */
.paper-doc ul, .paper-doc ol {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}
.paper-doc li { margin-bottom: 0.25rem; }

/* KaTeX */
.paper-doc .katex-display { margin: 0.75rem 0; }
</style>
