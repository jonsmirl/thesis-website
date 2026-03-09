// Citation URL map: "Author Year" -> URL
// Used by MathDoc to auto-link citations in docstrings
export const citationUrls: Record<string, string> = {
  // Accent variants (map to same URLs)
  'Aczél 1948': 'https://projecteuclid.org/euclid.bams/1183511892',
  'Shumailov et al 2023': 'https://doi.org/10.1038/s41586-024-07566-y',

  // Foundations & Mathematics
  'Kolmogorov 1930': 'https://doi.org/10.1007/BF01448380',
  'Nagumo 1930': 'https://doi.org/10.1007/BF01448380',
  'Kolmogorov-Nagumo 1930': 'https://doi.org/10.1007/BF01448380',
  'Aczel 1948': 'https://projecteuclid.org/euclid.bams/1183511892',
  'Hardy, Littlewood, and Polya 1934': 'https://doi.org/10.1017/CBO9780511816079',
  'Onsager 1931': 'https://doi.org/10.1103/PhysRev.37.405',
  'Kramers 1940': 'https://doi.org/10.1016/S0031-8914(40)90098-2',
  'Gibbs 1902': 'https://doi.org/10.1017/CBO9780511524523',
  'Kato 1966': 'https://doi.org/10.1007/978-3-642-66282-9',
  'Kubo 1966': 'https://doi.org/10.1088/0034-4885/29/1/306',
  'Golub 1973': 'https://doi.org/10.56021/9781421407944',
  'Boyd & Vandenberghe 2004': 'https://doi.org/10.1017/CBO9780511804441',
  'Vandenberghe 2004': 'https://doi.org/10.1017/CBO9780511804441',
  'Krantz & Parks 2003': 'https://doi.org/10.1007/978-1-4612-0059-8',
  'Berman-Plemmons 1994': 'https://doi.org/10.1137/1.9781611971262',
  'Cover & Thomas 2006': 'https://doi.org/10.1002/047174882X',

  // Economics - Trade & Industrial Organization
  'Melitz 2003': 'https://doi.org/10.1111/1468-0262.00467',
  'Krugman 1980': 'https://doi.org/10.1257/aer.70.5.950',
  'Dixit-Stiglitz 1977': 'https://doi.org/10.1257/aer.67.3.297',
  'Arkolakis-Costinot-Rodriguez-Clare 2012': 'https://doi.org/10.1257/aer.102.1.94',
  'Fadden 1974': 'https://doi.org/10.1016/B978-0-12-174302-7.50005-8',

  // Economics - Institutions & Growth
  'Atkinson 1970': 'https://doi.org/10.1016/0022-0531(70)90039-6',
  'Hart 1995': 'https://doi.org/10.1093/0198288816.001.0001',
  'North 1990': 'https://doi.org/10.1017/CBO9780511808678',
  'Simon 1962': 'https://www.jstor.org/stable/985254',
  'Jones 1995': 'https://doi.org/10.1086/262002',
  'Acemoglu 2002': 'https://doi.org/10.1093/restud/69.4.781',
  'Perez 2002': 'https://doi.org/10.4337/9781781005323',
  'Kyle 1985': 'https://doi.org/10.2307/1913210',

  // Economics - Decision Theory & Game Theory
  'Luce 1959': 'https://doi.org/10.1037/14396-000',
  'Tullock 1980': 'https://doi.org/10.1017/CBO9780511571893.018',
  'Kimball 1990': 'https://doi.org/10.2307/2938334',
  'Kimball 1992': 'https://doi.org/10.1016/0165-1765(92)90148-R',
  'Kelvey-Palfrey 1995': 'https://doi.org/10.1006/game.1995.1023',
  'Grossman-Stiglitz 1980': 'https://doi.org/10.1257/aer.70.3.393',

  // Information Theory & Statistical Mechanics
  'Tsallis 2009': 'https://doi.org/10.1007/978-0-387-85359-8',
  'Santos 1997': 'https://doi.org/10.1063/1.532107',
  'Abe 2000': 'https://doi.org/10.1016/S0375-9601(00)00337-6',
  'Suyari 2004': 'https://doi.org/10.1109/TIT.2004.834751',
  'Amari 1985': 'https://doi.org/10.1007/978-1-4612-5056-2',
  'Amari 1998': 'https://doi.org/10.1214/aos/1028144844',
  'Crooks 1999': 'https://doi.org/10.1103/PhysRevE.60.2721',

  // Dynamical Systems & Bifurcation Theory
  'Kuznetsov 2004': 'https://doi.org/10.1007/978-1-4757-3978-7',
  'Strogatz 2015': 'https://doi.org/10.1201/9780429492563',
  'Fenichel 1979': 'https://doi.org/10.1016/0022-0396(79)90152-9',
  'Kuehn 2011': 'https://doi.org/10.1016/j.physd.2011.02.012',
  'Luxburg 2007': 'https://doi.org/10.1007/s11222-007-9033-z',
  'Frank 2012': 'https://doi.org/10.1111/j.1420-9101.2012.02498.x',

  // Evolution
  'Price 1970': 'https://doi.org/10.1038/227520a0',

  // Epidemiology
  'Driessche 2010': 'https://doi.org/10.1007/978-3-540-78911-6_6',
  'Li, Shuai, and van den Driessche 2010': 'https://doi.org/10.1007/978-3-540-78911-6_6',

  // ML
  'Shumailov et al. 2023': 'https://doi.org/10.1038/s41586-024-07566-y',

  // Additional references
  'Jarzynski 1997': 'https://doi.org/10.1103/PhysRevLett.78.2690',
  'Hänggi et al. 1990': 'https://doi.org/10.1103/RevModPhys.62.251',

  // Self-reference
  'Smirl 2026b': '',
}

// Build regex pattern from citation keys, longest first to avoid partial matches
const sortedKeys = Object.keys(citationUrls)
  .filter(k => citationUrls[k]) // skip empty URLs
  .sort((a, b) => b.length - a.length) // longest first

// Match citations in forms: "Author (Year)", "Author Year)", "Author Year"
export const citationRegex = new RegExp(
  '(' + sortedKeys.map(k => {
    const parts = k.match(/^(.+?)(\d{4}[a-z]?)$/)
    if (!parts) return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const prefix = parts[1].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const year = parts[2]
    return `${prefix},?\\s*\\(?${year}\\)?`
  }).join('|') + ')',
  'g'
)

// Given matched text, find the URL
export function getCitationUrl(match: string): string | null {
  // Normalize: strip parens and commas before year, collapse whitespace
  const normalized = match.replace(/[()]/g, '').replace(/,\s*(\d{4})/, ' $1').replace(/\s+/g, ' ').trim()
  // Try exact match first
  if (citationUrls[normalized]) return citationUrls[normalized]
  // Try with different spacing
  for (const [key, url] of Object.entries(citationUrls)) {
    if (url && normalized.includes(key.replace(/\s+/g, ' '))) return url
  }
  return null
}
