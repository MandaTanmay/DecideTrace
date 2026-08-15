/**
 * lib/data-masking.ts
 *
 * Data masking utilities to protect sensitive information in telemetry,
 * graph data, and API responses. Prevents exposure of sensitive data
 * while maintaining functionality for legitimate use cases.
 */

/**
 * Mask sensitive fields in telemetry data
 * Removes embeddings, raw LLM responses, and other sensitive intermediate data
 */
export function maskTelemetryData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const masked = { ...data }

  // Remove embedding arrays (large numerical vectors)
  if (masked.embeddings) {
    masked.embeddings = '[MASKED: ' + (Array.isArray(masked.embeddings) ? masked.embeddings.length : 0) + ' dimensions]'
  }

  // Mask raw LLM responses that might contain sensitive information
  if (masked.rawResponse) {
    masked.rawResponse = maskSensitiveText(masked.rawResponse, 100)
  }

  // Mask note chunks that contain user content
  if (masked.noteChunks && Array.isArray(masked.noteChunks)) {
    masked.noteChunks = masked.noteChunks.map((chunk: any) => ({
      ...chunk,
      text: maskSensitiveText(chunk.text, 50),
      embedding: '[MASKED]',
    }))
  }

  // Mask transcript snippets in telemetry
  if (masked.transcript) {
    masked.transcript = maskSensitiveText(masked.transcript, 100)
  }

  // Mask existing notes snippets
  if (masked.existingNotes) {
    masked.existingNotes = maskSensitiveText(masked.existingNotes, 100)
  }

  return masked
}

/**
 * Mask sensitive data in knowledge graph responses
 * Removes or obfuscates sensitive node/edge information
 */
export function maskGraphData(data: { nodes: any[], links: any[] }): { nodes: any[], links: any[] } {
  if (!data || !data.nodes || !data.links) {
    return data
  }

  return {
    nodes: data.nodes.map(node => maskGraphNode(node)),
    links: data.links.map(link => maskGraphLink(link)),
  }
}

/**
 * Mask individual graph node
 */
function maskGraphNode(node: any): any {
  const masked = { ...node }

  // Remove sensitive metadata if present
  if (masked.metadata) {
    delete masked.metadata
  }

  // Truncate long node names that might contain sensitive info
  if (masked.name && masked.name.length > 100) {
    masked.name = masked.name.substring(0, 100) + '...'
  }

  return masked
}

/**
 * Mask individual graph link
 */
function maskGraphLink(link: any): any {
  const masked = { ...link }

  // Remove any sensitive link metadata
  if (masked.metadata) {
    delete masked.metadata
  }

  return masked
}

/**
 * Mask sensitive text content by truncating and replacing sensitive patterns
 */
function maskSensitiveText(text: string, maxLength: number = 200): string {
  if (!text || typeof text !== 'string') {
    return text
  }

  // Truncate to max length
  let masked = text.length > maxLength ? text.substring(0, maxLength) + '...' : text

  // Mask common sensitive patterns (emails, phone numbers, etc.)
  masked = masked.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
  masked = masked.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
  masked = masked.replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[CREDIT_CARD]')
  masked = masked.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')

  return masked
}

/**
 * Sanitize user input for display (XSS prevention)
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return input
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Mask user ID in logs and analytics
 */
export function maskUserId(userId: string): string {
  if (!userId || typeof userId !== 'string') {
    return userId
  }

  if (userId.length <= 8) {
    return '****'
  }

  return userId.substring(0, 4) + '****' + userId.substring(userId.length - 4)
}

/**
 * Mask email address for display
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return email
  }

  const [local, domain] = email.split('@')
  if (!local || !domain) {
    return email
  }

  const maskedLocal = local.length > 2
    ? local.substring(0, 2) + '***'
    : '***'

  return `${maskedLocal}@${domain}`
}
