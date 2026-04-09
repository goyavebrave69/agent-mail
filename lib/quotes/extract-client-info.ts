export interface ClientInfo {
  name: string
  address: string | null
}

/**
 * Extract client name from the email From header.
 * Handles formats: "Display Name <email@example.com>" or plain "email@example.com"
 */
function extractNameFromFrom(from: string): string {
  const match = from.match(/^(.*?)\s*<[^>]+>$/)
  if (match) {
    const name = match[1].trim()
    if (name) return name
  }
  // Fall back to the part before @ in the email address
  const emailMatch = from.match(/([^<\s@]+)@/)
  if (emailMatch) return emailMatch[1]
  return from.trim()
}

/**
 * Attempt to detect a French/European postal address in the email body.
 * Looks for patterns like "12 Rue de la Paix, 75001 Paris" or similar.
 * Best-effort heuristic — returns null if nothing is found.
 */
function extractAddressFromBody(body: string): string | null {
  // Match lines that look like a street address (number + street name)
  const streetPattern = /\b\d{1,4}[,\s]+(?:rue|avenue|boulevard|impasse|allée|route|chemin|place|passage|voie|villa|résidence)\b.{5,80}/i
  const streetMatch = body.match(streetPattern)
  if (!streetMatch) return null

  // Try to grab the next line too (postal code + city)
  const idx = body.indexOf(streetMatch[0])
  const after = body.slice(idx + streetMatch[0].length, idx + streetMatch[0].length + 60)
  const postalMatch = after.match(/\s*[\r\n]+\s*(\d{5}\s+\S.{2,30})/)
  if (postalMatch) {
    return `${streetMatch[0].trim()}\n${postalMatch[1].trim()}`
  }

  return streetMatch[0].trim()
}

export function extractClientInfo(email: { from: string; body: string }): ClientInfo {
  return {
    name: extractNameFromFrom(email.from),
    address: extractAddressFromBody(email.body),
  }
}
