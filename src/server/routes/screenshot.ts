import { Hono } from 'hono'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const execAsync = promisify(exec)
const app = new Hono()

// Capture a screenshot and return it as PNG
app.get('/capture', async (c) => {
  const tmpFile = join(tmpdir(), `screenshot-${Date.now()}.png`)

  try {
    if (process.platform === 'win32') {
      await execAsync(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $screen = [System.Windows.Forms.Screen]::PrimaryScreen; $bitmap = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size); $bitmap.Save('${tmpFile}'); $graphics.Dispose(); $bitmap.Dispose()"`
      )
    } else if (process.platform === 'darwin') {
      await execAsync(`screencapture -x "${tmpFile}"`)
    } else {
      // Linux - try multiple screenshot tools
      const tools = [
        `scrot "${tmpFile}"`,
        `gnome-screenshot -f "${tmpFile}"`,
        `import -window root "${tmpFile}"`,
        `grim "${tmpFile}"`,
      ]

      let captured = false
      for (const cmd of tools) {
        try {
          await execAsync(cmd)
          captured = true
          break
        } catch {
          continue
        }
      }

      if (!captured) {
        return c.json(
          {
            success: false,
            error:
              'No screenshot tool found. Install one of: scrot, gnome-screenshot, imagemagick, grim',
          },
          500
        )
      }
    }

    const imageBuffer = await readFile(tmpFile)
    await unlink(tmpFile).catch(() => {})

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    await unlink(tmpFile).catch(() => {})
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { app as screenshotRoutes }
