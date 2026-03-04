const BLOCKED_TERMS: string[] = [
  'testosterone cypionate',
  'testosterone enanthate',
  'testosterone propionate',
  'prescription testosterone',
  'prescribe testosterone',
  'testosterone injection',
  'testosterone pellets',
  'testosterone gel prescription',
  'hgh prescription',
  'human growth hormone prescription',
  'prescribe hgh',
  'semaglutide prescription',
  'prescribe semaglutide',
  'tirzepatide prescription',
  'prescribe tirzepatide',
]

const RX_DRUGS = [
  'cypionate', 'enanthate', 'propionate', 'semaglutide',
  'tirzepatide', 'ozempic', 'wegovy', 'mounjaro',
]

export const SAFE_KEYWORDS: string[] = [
  "men's health clinic",
  "low testosterone doctor",
  "hormone optimization",
  "TRT clinic",
  "men's primary care",
  "low energy treatment",
  "men's wellness center",
  "men's health near me",
  "low T doctor",
  "hormone therapy clinic",
  "men's health specialist",
  "testosterone therapy",
  "men's vitality clinic",
  "hormone balance treatment",
  "men's wellness doctor",
]

export interface ComplianceResult {
  passed: boolean
  violations: string[]
}

export function checkCompliance(text: string): ComplianceResult {
  const lower = text.toLowerCase()
  const violations: string[] = []

  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term.toLowerCase())) {
      violations.push(`Blocked term: "${term}"`)
    }
  }

  for (const drug of RX_DRUGS) {
    const prescribePlusDrug = new RegExp(`prescri(be|ption)\\s+\\w*\\s*${drug}`, 'i')
    const drugPlusPrescribe = new RegExp(`${drug}\\s+prescri(be|ption)`, 'i')
    if (prescribePlusDrug.test(lower) || drugPlusPrescribe.test(lower)) {
      violations.push(`Rx drug with prescription language: "${drug}"`)
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  }
}

export function sanitizeCopy(text: string): string {
  let sanitized = text
  const replacements: Record<string, string> = {
    'testosterone cypionate': 'testosterone therapy',
    'testosterone enanthate': 'testosterone therapy',
    'testosterone propionate': 'testosterone therapy',
    'prescription testosterone': 'testosterone therapy',
    'prescribe testosterone': 'testosterone support',
  }
  for (const [blocked, replacement] of Object.entries(replacements)) {
    sanitized = sanitized.replace(new RegExp(blocked, 'gi'), replacement)
  }
  return sanitized
}
