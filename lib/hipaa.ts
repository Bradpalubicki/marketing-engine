import crypto from 'crypto'

// ── Existing functions (preserved) ───────────────────────────────────────────

export function hashPHI(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

export function stripPHI(data: Record<string, unknown>): Record<string, unknown> {
  const phiFields = ['first_name', 'last_name', 'email', 'phone', 'dob', 'ssn', 'address', 'date_of_birth']
  const stripped = { ...data }
  phiFields.forEach(field => delete stripped[field])
  return stripped
}

export function hashLeadForPlatform(lead: {
  email?: string | null
  phone?: string | null
  first_name?: string | null
  last_name?: string | null
}): Record<string, string> {
  const hashed: Record<string, string> = {}
  if (lead.email) hashed.em = hashPHI(lead.email)
  if (lead.phone) hashed.ph = hashPHI(lead.phone.replace(/\D/g, ''))
  if (lead.first_name) hashed.fn = hashPHI(lead.first_name)
  if (lead.last_name) hashed.ln = hashPHI(lead.last_name)
  return hashed
}

export function safeConversionPayload(params: {
  gclid?: string | null
  conversion_name: string
  conversion_time: string
  conversion_value?: number | null
}): Record<string, unknown> {
  return {
    gclid: params.gclid,
    conversion_name: params.conversion_name,
    conversion_time: params.conversion_time,
    conversion_value: params.conversion_value,
  }
}

// ── New functions (Phase 3 spec) ──────────────────────────────────────────────

export function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}

export function hashPhone(phone: string): string {
  return crypto.createHash('sha256').update(phone.replace(/\D/g, '')).digest('hex')
}

export function filterPHI<T extends Record<string, unknown>>(data: T): Partial<T> {
  const PHI_FIELDS = [
    'health_condition', 'diagnosis', 'treatment', 'medication',
    'insurance_id', 'patient_id', 'medical_record', 'ssn', 'dob',
    'date_of_birth'
  ]
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !PHI_FIELDS.includes(key))
  ) as Partial<T>
}

export function assertNoPHI(payload: Record<string, unknown>): void {
  const PHI_PATTERNS = [/ssn/i, /diagnosis/i, /patient_id/i, /health_condition/i, /insurance_id/i]
  for (const [key, value] of Object.entries(payload)) {
    if (PHI_PATTERNS.some(p => p.test(key)))
      throw new Error(`PHI field in outbound payload: ${key}`)
    if (typeof value === 'string' && /\d{3}-\d{2}-\d{4}/.test(value))
      throw new Error(`Possible SSN in field: ${key}`)
  }
}

export const MetaEventName = {
  Lead: 'Lead',
  Contact: 'Contact',
  Schedule: 'Schedule',
  ViewContent: 'ViewContent',
} as const

export type MetaEventNameType = typeof MetaEventName[keyof typeof MetaEventName]
