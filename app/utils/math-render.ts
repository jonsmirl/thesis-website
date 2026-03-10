import katex from 'katex'

// Greek letter mapping: ASCII names → LaTeX commands
export const GREEK: Record<string, string> = {
  alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma', delta: '\\delta',
  epsilon: '\\epsilon', zeta: '\\zeta', eta: '\\eta', theta: '\\theta',
  kappa: '\\kappa', lambda: '\\lambda', mu: '\\mu', nu: '\\nu',
  xi: '\\xi', pi: '\\pi', rho: '\\rho', sigma: '\\sigma',
  tau: '\\tau', phi: '\\phi', chi: '\\chi', psi: '\\psi', omega: '\\omega',
  Phi: '\\Phi', Sigma: '\\Sigma', Delta: '\\Delta', Gamma: '\\Gamma',
  Omega: '\\Omega', Pi: '\\Pi', Lambda: '\\Lambda',
}

export const GREEK_PAT = Object.keys(GREEK).sort((a, b) => b.length - a.length).join('|')

// Sentinel markers to protect already-rendered KaTeX spans from re-processing
export const K_OPEN = '\x00K<'
export const K_CLOSE = '>\x00'

/** Convert ASCII math notation to LaTeX: Greek names, sub/superscripts, arrows */
export function texify(expr: string): string {
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

/** Escape only ampersands (trusted content like Lean docstrings) */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;')
}

/** Escape all HTML entities (untrusted content) */
export function escapeHtmlFull(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Render LaTeX to HTML via KaTeX */
export function renderKatex(tex: string, displayMode = false): string {
  try {
    return katex.renderToString(tex.trim(), {
      displayMode,
      throwOnError: false,
      output: 'html',
    })
  } catch {
    return tex
  }
}

/** Render KaTeX wrapped in sentinel markers to prevent double-processing */
export function safeKatex(tex: string): string {
  return K_OPEN + renderKatex(tex) + K_CLOSE
}

/** Apply 4-step auto-detection of math patterns in plain text, return HTML with KaTeX */
export function autoDetectMath(html: string): string {
  // 1. Formulas: "VAR = EXPR" containing Greek or ^ or _
  html = html.replace(/\b([A-Za-z_]\w*(?:[_^]\w+)?)\s*=\s*([^,.\n]{3,60}?)(?=[,.\s]|$)/g, (match) => {
    if (match.includes(K_OPEN)) return match
    if (new RegExp(`\\b(${GREEK_PAT})\\b`).test(match) || /[\^_]/.test(match)) {
      return safeKatex(texify(match))
    }
    return match
  })

  // 2. Expressions with ^ or _ : "K^2", "sigma^2", "N_eff"
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

  return html
}
