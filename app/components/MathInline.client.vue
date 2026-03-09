<template>
  <span v-html="rendered"></span>
</template>

<script setup lang="ts">
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = defineProps<{ text: string }>()

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

function rk(tex: string): string {
  try { return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false }) }
  catch { return tex }
}

const rendered = computed(() => {
  if (!props.text) return ''
  let s = props.text.replace(/&/g, '&amp;')

  // Explicit $...$
  s = s.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_m, tex) => rk(tex))

  // Formulas with = containing Greek or ^ or _
  s = s.replace(/\b([A-Za-z_]\w*(?:[_^]\w+)?)\s*=\s*([^,.\n]{3,60}?)(?=[,.\s]|$)/g, (match) => {
    if (new RegExp(`\\b(${GREEK_PAT})\\b`).test(match) || /[\^_]/.test(match)) {
      return rk(texify(match))
    }
    return match
  })

  // Expressions with ^ or _
  s = s.replace(/\b([A-Za-z]\w*(?:[_^]\{?[\w,+-]+\}?)+)/g, m => rk(texify(m)))

  // Greek + comparison
  s = s.replace(new RegExp(`\\b(${GREEK_PAT})\\s*([<>≤≥≈]=?\\s*-?\\d+\\.?\\d*)`, 'g'), m => rk(texify(m)))

  // Standalone Greek
  s = s.replace(new RegExp(`(?<![\\w])\\b(${GREEK_PAT})\\b(?![\\w])`, 'g'), m => rk(texify(m)))

  return s
})
</script>
