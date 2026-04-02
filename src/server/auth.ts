import type { Context, Next } from 'hono'

export async function authMiddleware(c: Context, next: Next) {
  const token =
    c.req.header('Authorization')?.replace('Bearer ', '') ||
    c.req.query('token')
  const expected = process.env.AUTH_TOKEN || 'changeme-secret-token'

  if (token !== expected) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
}
