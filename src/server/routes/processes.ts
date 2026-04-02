import { Hono } from 'hono'
import si from 'systeminformation'
import { exec, spawn } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const app = new Hono()

// List all running processes
app.get('/list', async (c) => {
  try {
    const data = await si.processes()
    const processes = data.list.map((p) => ({
      pid: p.pid,
      name: p.name,
      cpu: Math.round(p.cpu * 10) / 10,
      mem: Math.round(p.mem * 10) / 10,
      state: p.state,
      command: p.command,
    }))
    return c.json({ success: true, processes })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Start a new process
app.post('/start', async (c) => {
  try {
    const { command, args } = await c.req.json()
    if (!command || typeof command !== 'string') {
      return c.json({ success: false, error: 'command is required' }, 400)
    }

    const cmdArgs = Array.isArray(args) ? args.map(String) : []
    const child = spawn(command, cmdArgs, { detached: true, stdio: 'ignore' })
    child.unref()

    return c.json({ success: true, pid: child.pid })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Stop (kill) a process by PID
app.post('/kill', async (c) => {
  try {
    const { pid, force } = await c.req.json()
    if (!pid || typeof pid !== 'number') {
      return c.json({ success: false, error: 'pid (number) is required' }, 400)
    }

    const signal = force ? 'SIGKILL' : 'SIGTERM'
    process.kill(pid, signal)
    return c.json({ success: true, message: signal + ' sent to PID ' + pid })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { app as processesRoutes }
