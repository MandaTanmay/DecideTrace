/**
 * lib/audit-logger.ts
 *
 * Security event tracking and audit logging system.
 * Logs important security events for monitoring and compliance.
 */

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  SIGNUP_SUCCESS = 'SIGNUP_SUCCESS',
  SIGNUP_FAILURE = 'SIGNUP_FAILURE',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  PASSWORD_RESET_FAILURE = 'PASSWORD_RESET_FAILURE',
  
  // Authorization events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  FORBIDDEN_ACCESS = 'FORBIDDEN_ACCESS',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  
  // Data access events
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  DATA_DELETION = 'DATA_DELETION',
  
  // Rate limiting events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  POTENTIAL_ATTACK = 'POTENTIAL_ATTACK',
}

export interface AuditLogEntry {
  eventType: AuditEventType
  userId?: string
  ip?: string
  userAgent?: string
  timestamp: Date
  details?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Log a security audit event
 */
export function logAuditEvent(entry: AuditLogEntry): void {
  const logEntry = {
    ...entry,
    timestamp: entry.timestamp.toISOString(),
  }

  // In production, this would send to a logging service (e.g., Datadog, Sentry, ELK)
  // For now, we'll use console.log with structured format
  const severity = entry.severity.toUpperCase()
  console.log(`[AUDIT:${severity}] ${entry.eventType}`, JSON.stringify(logEntry))

  // For critical events, also log with error level
  if (entry.severity === 'critical' || entry.severity === 'high') {
    console.error(`[AUDIT:CRITICAL] ${entry.eventType}`, JSON.stringify(logEntry))
  }
}

/**
 * Log authentication success
 */
export function logAuthSuccess(userId: string, ip: string, userAgent?: string): void {
  logAuditEvent({
    eventType: AuditEventType.LOGIN_SUCCESS,
    userId,
    ip,
    userAgent,
    timestamp: new Date(),
    severity: 'low',
  })
}

/**
 * Log authentication failure
 */
export function logAuthFailure(email: string, ip: string, reason: string, userAgent?: string): void {
  logAuditEvent({
    eventType: AuditEventType.LOGIN_FAILURE,
    ip,
    userAgent,
    timestamp: new Date(),
    details: { email, reason },
    severity: 'medium',
  })
}

/**
 * Log unauthorized access attempt
 */
export function logUnauthorizedAccess(ip: string, path: string, userAgent?: string): void {
  logAuditEvent({
    eventType: AuditEventType.UNAUTHORIZED_ACCESS,
    ip,
    userAgent,
    timestamp: new Date(),
    details: { path },
    severity: 'high',
  })
}

/**
 * Log rate limit exceeded
 */
export function logRateLimitExceeded(ip: string, endpoint: string, userAgent?: string): void {
  logAuditEvent({
    eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
    ip,
    userAgent,
    timestamp: new Date(),
    details: { endpoint },
    severity: 'medium',
  })
}

/**
 * Log data access
 */
export function logDataAccess(userId: string, resource: string, action: string, ip?: string): void {
  logAuditEvent({
    eventType: AuditEventType.DATA_ACCESS,
    userId,
    ip,
    timestamp: new Date(),
    details: { resource, action },
    severity: 'low',
  })
}

/**
 * Log suspicious activity
 */
export function logSuspiciousActivity(userId: string, activity: string, ip?: string, details?: Record<string, any>): void {
  logAuditEvent({
    eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
    userId,
    ip,
    timestamp: new Date(),
    details: { activity, ...details },
    severity: 'high',
  })
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  // Check various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  return 'unknown'
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}
