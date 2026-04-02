import { Hono } from 'hono'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const app = new Hono()

// Read from clipboard
app.get('/read', async (c) => {
  try {
    let text = ''

    if (process.platform === 'win32') {
      const { stdout } = await execAsync(
        'powershell -Command "Get-Clipboard"',
        { timeout: 5000 }
      )
      text = stdout
    } else if (process.platform === 'darwin') {
      const { stdout } = await execAsync('pbpaste', { timeout: 5000 })
      text = stdout
    } else {
      // Linux — try xclip, xsel, wl-paste
      const tools = [
        'xclip -selection clipboard -o',
        'xsel --clipboard --output',
        'wl-paste',
      ]
      let read = false
      for (const cmd of tools) {
        try {
          const { stdout } = await execAsync(cmd, { timeout: 5000 })
          text = stdout
          read = true
          break
        } catch {
          continue
        }
      }
      if (!read) {
        return c.json({
          success: false,
          error: 'No clipboard tool found. Install xclip, xsel, or wl-paste.',
        }, 500)
      }
    }

    return c.json({ success: true, text })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Write to clipboard
app.post('/write', async (c) => {
  try {
    const { text } = await c.req.json()
    if (typeof text !== 'string') {
      return c.json({ success: false, error: 'text is required' }, 400)
    }

    // Limit clipboard content size
    if (text.length > 1024 * 1024) {
      return c.json({ success: false, error: 'Text too large (max 1MB)' }, 400)
    }

    if (process.platform === 'win32') {
      await execAsync(
        `powershell -Command "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"`
      , { timeout: 5000 })
    } else if (process.platform === 'darwin') {
      const child = (await import('node:child_process')).spawn('pbcopy')
      child.stdin.write(text)
      child.stdin.end()
      await new Promise<void>((resolve, reject) => {
        child.on('close', resolve)
        child.on('error', reject)
      })
    } else {
      // Linux
      const tools = [
        'xclip -selection clipboard',
        'xsel --clipboard --input',
        'wl-copy',
      ]
      let wrote = false
      for (const cmd of tools) {
        try {
          const child = (await import('node:child_process')).spawn(
            cmd.split(' ')[0],
            cmd.split(' ').slice(1)
          )
          child.stdin.write(text)
          child.stdin.end()
          await new Promise<void>((resolve, reject) => {
            child.on('close', resolve)
            child.on('error', reject)
          })
          wrote = true
          break
        } catch {
          continue
        }
      }
      if (!wrote) {
        return c.json({
          success: false,
          error: 'No clipboard tool found. Install xclip, xsel, or wl-copy.',
        }, 500)
      }
    }

    return c.json({ success: true, message: 'Clipboard updated' })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get clipboard history (last few entries) — stores in-memory
const clipHistory: { text: string; timestamp: string }[] = []

app.get('/history', (c) => {
  return c.json({ success: true, history: clipHistory })
})

app.post('/snapshot', async (c) => {
  try {
    let text = ''
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('powershell -Command "Get-Clipboard"', { timeout: 5000 })
      text = stdout
    } else if (process.platform === 'darwin') {
      const { stdout } = await execAsync('pbpaste', { timeout: 5000 })
      text = stdout
    } else {
      try {
        const { stdout } = await execAsync('xclip -selection clipboard -o', { timeout: 5000 })
        text = stdout
      } catch {
        try {
          const { stdout } = await execAsync('xsel --clipboard --output', { timeout: 5000 })
          text = stdout
        } catch {
          const { stdout } = await execAsync('wl-paste', { timeout: 5000 })
          text = stdout
        }
      }
    }

    const last = clipHistory[clipHistory.length - 1]
    if (!last || last.text !== text) {
      clipHistory.push({ text, timestamp: new Date().toISOString() })
      if (clipHistory.length > 50) clipHistory.shift()
    }

    return c.json({ success: true, text })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { app as clipboardRoutes }
