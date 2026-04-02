import { Hono } from 'hono'
import { spawn } from 'node:child_process'

const app = new Hono()

// Execute a command and return output
app.post('/exec', async (c) => {
  try {
    const { command, timeout } = await c.req.json()
    if (!command || typeof command !== 'string') {
      return c.json({ success: false, error: 'command is required' }, 400)
    }

    const maxTimeout = Math.min(Math.max(parseInt(timeout) || 15000, 1000), 60000)

    return new Promise((resolve) => {
      const shell = process.platform === 'win32' ? 'cmd' : 'bash'
      const shellArg = process.platform === 'win32' ? '/c' : '-c'

      const child = spawn(shell, [shellArg, command], {
        timeout: maxTimeout,
        env: { ...process.env, TERM: 'dumb', COLUMNS: '120' },
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
        // Cap output at 512KB
        if (stdout.length > 512 * 1024) {
          child.kill()
        }
      })

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
        if (stderr.length > 512 * 1024) {
          child.kill()
        }
      })

      child.on('close', (code) => {
        resolve(
          c.json({
            success: true,
            exitCode: code,
            stdout: stdout.slice(0, 512 * 1024),
            stderr: stderr.slice(0, 512 * 1024),
          })
        )
      })

      child.on('error', (err: Error) => {
        resolve(c.json({ success: false, error: err.message }, 500))
      })

      // Safety timeout
      setTimeout(() => {
        try { child.kill() } catch {}
      }, maxTimeout)
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get shell info
app.get('/info', (c) => {
  return c.json({
    success: true,
    shell: process.platform === 'win32' ? 'cmd' : 'bash',
    platform: process.platform,
    user: process.env.USER || process.env.USERNAME || 'unknown',
    home: process.env.HOME || process.env.USERPROFILE || '/',
    cwd: process.cwd(),
  })
})

export { app as terminalRoutes }
