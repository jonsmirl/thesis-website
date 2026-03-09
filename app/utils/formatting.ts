/** Format a snake_case test/theorem name to Title Case with acronym handling */
export function formatName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bV(\d)/g, 'v$1')
    .replace(/\bOecd\b/g, 'OECD')
    .replace(/\bBea\b/g, 'BEA')
    .replace(/\bCes\b/g, 'CES')
    .replace(/\bCpi\b/g, 'CPI')
    .replace(/\bDid\b/g, 'DID')
    .replace(/\bImf\b/g, 'IMF')
    .replace(/\bIo\b/g, 'I/O')
    .replace(/\bIes\b/g, 'IES')
    .replace(/\bAic\b/g, 'AIC')
    .replace(/\bOos\b/g, 'OOS')
    .replace(/\bMle\b/g, 'MLE')
    .replace(/\bVri\b/g, 'VRI')
    .replace(/\bMp\b/g, 'MP')
    .replace(/\bR0\b/g, 'R0')
    .replace(/\bDtc\b/g, 'DTC')
    .replace(/\bHo\b/g, 'HO')
}

/** Build a GitHub URL for a file path with optional line number */
export function githubUrl(filePath?: string, line?: number): string {
  const base = 'https://github.com/jonsmirl/thesis/blob/main'
  const url = `${base}/${filePath || ''}`
  return line ? `${url}#L${line}` : url
}
