import { Hono } from 'hono'
import type { Context, Next } from 'hono'

const app = new Hono()

export interface AuditEntry {
  id: number
  timestamp: string
  action: string
  category: string
  details: string
  ip: string
  success: boolean
}

const auditLog: AuditEntry[] = []
let nextId = 1

export function logAction(
  action: string,
  category: string,
  details: string,
  ip: string,
  success: boolean = true
) {
  const entry: AuditEntry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    action,
    category,
    details,
    ip,
    success,
  }
  auditLog.unshift(entry) // newest first
  if (auditLog.length > 500) auditLog.pop() // cap at 500 entries
  return entry
}

// Middleware to auto-log API calls
export async function auditMiddleware(c: Context, next: Next) {
  const start = Date.now()
  const method = c.req.method
  const path = c.req.path
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'

  await next()

  const duration = Date.now() - start
  const status = c.res.status
  const success = status < 400

  // Skip logging for /api/audit and /api/monitor to avoid noise
  if (path.startsWith('/api/audit') || path.startsWith('/api/monitor')) return

  const category = path.split('/')[2] || 'general'
  logAction(
    `${method} ${path}`,
    category,
    `Status: ${status}, Duration: ${duration}ms`,
    ip,
    success
  )
}

// Get audit log
app.get('/log', (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500)
  const category = c.req.query('category')
  const search = c.req.query('search')?.toLowerCase()

  let entries = auditLog

  if (category) {
    entries = entries.filter((e) => e.category === category)
  }
  if (search) {
    entries = entries.filter(
      (e) =>
        e.action.toLowerCase().includes(search) ||
        e.details.toLowerCase().includes(search) ||
        e.category.toLowerCase().includes(search)
    )
  }

  return c.json({
    success: true,
    total: auditLog.length,
    filtered: entries.length,
    entries: entries.slice(0, limit),
  })
})

// Get audit statistics
app.get('/stats', (c) => {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000
  const oneDayAgo = now - 24 * 60 * 60 * 1000

  const lastHour = auditLog.filter(
    (e) => new Date(e.timestamp).getTime() > oneHourAgo
  )
  const lastDay = auditLog.filter(
    (e) => new Date(e.timestamp).getTime() > oneDayAgo
  )

  // Count by category
  const byCategory: Record<string, number> = {}
  for (const entry of auditLog) {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1
  }

  // Count errors
  const errors = auditLog.filter((e) => !e.success).length

  return c.json({
    success: true,
    stats: {
      total: auditLog.length,
      lastHour: lastHour.length,
      lastDay: lastDay.length,
      errors,
      byCategory,
    },
  })
})

// Clear audit log
app.post('/clear', (c) => {
  auditLog.length = 0
  return c.json({ success: true, message: 'Audit log cleared' })
})

export { app as auditRoutes }
