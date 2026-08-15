/**
 * lib/api-versioning.ts
 *
 * API versioning system for future-proof security updates.
 * Supports version negotiation, deprecation warnings, and graceful migration.
 */

export const API_VERSION = 'v1'
export const SUPPORTED_VERSIONS = ['v1']
export const DEPRECATED_VERSIONS: string[] = []

export interface ApiVersionInfo {
  version: string
  supported: boolean
  deprecated: boolean
  deprecationDate?: Date
  sunsetDate?: Date
  migrationGuide?: string
}

/**
 * Get API version from request headers
 */
export function getApiVersion(request: Request): string {
  const versionHeader = request.headers.get('api-version') || request.headers.get('x-api-version')
  return versionHeader || API_VERSION
}

/**
 * Validate API version and return version info
 */
export function validateApiVersion(version: string): ApiVersionInfo {
  const supported = SUPPORTED_VERSIONS.includes(version)
  const deprecated = DEPRECATED_VERSIONS.includes(version)

  return {
    version,
    supported,
    deprecated,
    deprecationDate: deprecated ? new Date('2024-12-31') : undefined,
    sunsetDate: deprecated ? new Date('2025-06-30') : undefined,
    migrationGuide: deprecated ? '/docs/api-migration' : undefined,
  }
}

/**
 * Add version headers to response
 */
export function addVersionHeaders(response: Response, version: string): Response {
  const headers = new Headers(response.headers)
  
  headers.set('x-api-version', version)
  headers.set('x-supported-versions', SUPPORTED_VERSIONS.join(', '))
  
  if (DEPRECATED_VERSIONS.length > 0) {
    headers.set('x-deprecated-versions', DEPRECATED_VERSIONS.join(', '))
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Check if version is deprecated and add warning headers
 */
export function checkDeprecation(version: string): Response | null {
  if (DEPRECATED_VERSIONS.includes(version)) {
    return new Response(
      JSON.stringify({
        error: 'API version deprecated',
        message: `API version ${version} is deprecated and will be sunset on 2025-06-30`,
        migrationGuide: '/docs/api-migration',
      }),
      {
        status: 400,
        headers: {
          'content-type': 'application/json',
          'x-api-deprecated': 'true',
          'x-api-sunset-date': '2025-06-30',
        },
      }
    )
  }
  
  return null
}

/**
 * Middleware to handle API versioning
 */
export function withApiVersioning(handler: (request: Request, version: string) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    const version = getApiVersion(request)
    const versionInfo = validateApiVersion(version)
    
    // Check if version is deprecated
    const deprecationResponse = checkDeprecation(version)
    if (deprecationResponse) {
      return deprecationResponse
    }
    
    // Check if version is supported
    if (!versionInfo.supported) {
      return new Response(
        JSON.stringify({
          error: 'Unsupported API version',
          message: `API version ${version} is not supported. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
        }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      )
    }
    
    // Call the original handler with version
    const response = await handler(request, version)
    
    // Add version headers to response
    return addVersionHeaders(response, version)
  }
}

/**
 * Version-specific route handler wrapper
 */
export function versionedRoute(
  versions: Record<string, (request: Request, ...args: any[]) => Promise<Response>>,
  defaultVersion: string = API_VERSION
) {
  return async (request: Request, ...args: any[]): Promise<Response> => {
    const version = getApiVersion(request)
    const handler = versions[version] || versions[defaultVersion]
    
    if (!handler) {
      return new Response(
        JSON.stringify({
          error: 'Unsupported API version',
          message: `No handler found for version ${version}`,
        }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      )
    }
    
    const response = await handler(request, ...args)
    return addVersionHeaders(response, version)
  }
}
