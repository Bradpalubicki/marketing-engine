import crypto from 'crypto'

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
