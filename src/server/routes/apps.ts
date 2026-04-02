import { Hono } from 'hono'
import { exec, spawn } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const app = new Hono()

// List running applications (processes with visible windows)
app.get('/list', async (c) => {
  try {
    let apps: { pid: number; name: string; title?: string }[] = []

    if (process.platform === 'win32') {
      const { stdout } = await execAsync(
        'powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -ne \'\'} | Select-Object Id, ProcessName, MainWindowTitle | ConvertTo-Json"'
      )
      const parsed = JSON.parse(stdout || '[]')
      const list = Array.isArray(parsed) ? parsed : [parsed]
      apps = list
        .filter((p: any) => p)
        .map((p: any) => ({
          pid: p.Id,
          name: p.ProcessName,
          title: p.MainWindowTitle,
        }))
    } else {
      // Linux - list processes with window titles using wmctrl or fallback to ps
      try {
        const { stdout } = await execAsync('wmctrl -lp')
        apps = stdout
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const parts = line.trim().split(/\s+/)
            const pid = parseInt(parts[2]) || 0
            const title = parts.slice(4).join(' ')
            return { pid, name: parts[3] || 'unknown', title }
          })
      } catch {
        // Fallback: list top processes by memory
        const { stdout } = await execAsync('ps -eo pid,comm --sort=-%mem | head -50')
        apps = stdout
          .trim()
          .split('\n')
          .slice(1)
          .map((line) => {
            const parts = line.trim().split(/\s+/)
            return { pid: parseInt(parts[0]) || 0, name: parts.slice(1).join(' ') }
          })
          .filter((a) => a.pid > 0)
      }
    }

    return c.json({ success: true, apps })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Start an application
app.post('/start', async (c) => {
  try {
    const { appPath } = await c.req.json()
    if (!appPath || typeof appPath !== 'string') {
      return c.json({ success: false, error: 'appPath is required' }, 400)
    }

    const child = spawn(appPath, [], { detached: true, stdio: 'ignore' })
    child.unref()

    return c.json({ success: true, pid: child.pid })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Stop an application by PID
app.post('/stop', async (c) => {
  try {
    const { pid } = await c.req.json()
    if (!pid || typeof pid !== 'number') {
      return c.json({ success: false, error: 'pid (number) is required' }, 400)
    }

    process.kill(pid, 'SIGTERM')
    return c.json({ success: true, message: 'SIGTERM sent to ' + pid })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { app as appsRoutes }
