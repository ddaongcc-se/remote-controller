import { Hono } from 'hono'
import { exec, spawn, type ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, readdir, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const execAsync = promisify(exec)
const app = new Hono()

let recordProcess: ChildProcess | null = null
let currentRecordingPath: string | null = null

// List available webcam devices
app.get('/devices', async (c) => {
  try {
    const devices: { id: string; name: string }[] = []

    if (process.platform === 'linux') {
      const videoDevices = await readdir('/dev/').catch(() => [])
      const vDevices = videoDevices.filter((d) => d.startsWith('video'))

      for (const dev of vDevices) {
        try {
          const { stdout } = await execAsync(
            `cat /sys/class/video4linux/${dev}/name 2>/dev/null || echo "${dev}"`
          )
          devices.push({ id: '/dev/' + dev, name: stdout.trim() })
        } catch {
          devices.push({ id: '/dev/' + dev, name: dev })
        }
      }
    } else if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync(
          'powershell -Command "Get-PnpDevice -Class Camera | Select-Object FriendlyName, InstanceId | ConvertTo-Json"'
        )
        const parsed = JSON.parse(stdout || '[]')
        const list = Array.isArray(parsed) ? parsed : [parsed]
        list.forEach((d: any) => {
          if (d) devices.push({ id: d.FriendlyName, name: d.FriendlyName })
        })
      } catch {
        devices.push({ id: 'default', name: 'Default Camera' })
      }
    }

    return c.json({ success: true, devices })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Take a photo from webcam
app.get('/photo', async (c) => {
  const device = c.req.query('device') || '/dev/video0'
  const tmpFile = join(tmpdir(), `webcam-${Date.now()}.jpg`)

  try {
    if (process.platform === 'win32') {
      // Record ~2s then keep only the last frame so the camera has time to adjust exposure
      await execAsync(
        `ffmpeg -y -f dshow -i video="${device}" -t 2 -frames:v 1 -update 1 -q:v 2 "${tmpFile}"`,
        { timeout: 15000 }
      )
    } else {
      // Validate device path
      if (!device.startsWith('/dev/')) {
        return c.json({ success: false, error: 'Invalid device path' }, 400)
      }
      // Let the webcam warm up for ~2 seconds, then grab a single well-exposed frame
      await execAsync(
        `ffmpeg -y -f v4l2 -video_size 640x480 -i "${device}" -ss 00:00:02 -frames:v 1 -q:v 2 "${tmpFile}"`,
        { timeout: 15000 }
      )
    }

    const imageBuffer = await readFile(tmpFile)
    await unlink(tmpFile).catch(() => {})

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    await unlink(tmpFile).catch(() => {})
    return c.json(
      {
        success: false,
        error: error.message + '. Make sure ffmpeg is installed.',
      },
      500
    )
  }
})

// Start recording from webcam
app.post('/record/start', async (c) => {
  if (recordProcess) {
    return c.json({ success: false, error: 'Recording is already in progress' })
  }

  try {
    const { device, duration } = await c.req.json().catch(() => ({ device: '', duration: 30 }))
    const dev = device || '/dev/video0'
    const dur = Math.min(Math.max(parseInt(duration) || 30, 1), 300) // 1-300 seconds

    currentRecordingPath = join(tmpdir(), `webcam-record-${Date.now()}.mp4`)

    if (process.platform === 'win32') {
      recordProcess = spawn('ffmpeg', [
        '-y', '-f', 'dshow', '-i', `video=${dev}`,
        '-t', dur.toString(), '-c:v', 'libx264', '-preset', 'ultrafast',
        currentRecordingPath,
      ])
    } else {
      if (!dev.startsWith('/dev/')) {
        return c.json({ success: false, error: 'Invalid device path' }, 400)
      }
      recordProcess = spawn('ffmpeg', [
        '-y', '-f', 'v4l2', '-video_size', '640x480', '-i', dev,
        '-t', dur.toString(), '-c:v', 'libx264', '-preset', 'ultrafast',
        currentRecordingPath,
      ])
    }

    recordProcess.on('exit', () => {
      recordProcess = null
    })

    return c.json({ success: true, message: 'Recording started', duration: dur })
  } catch (error: any) {
    recordProcess = null
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Stop recording
app.post('/record/stop', async (c) => {
  if (!recordProcess) {
    return c.json({ success: false, error: 'No recording in progress' })
  }

  try {
    recordProcess.kill('SIGINT') // Graceful stop for ffmpeg
    recordProcess = null

    // Wait a moment for ffmpeg to finalize the file
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return c.json({
      success: true,
      message: 'Recording stopped',
      path: currentRecordingPath,
    })
  } catch (error: any) {
    recordProcess = null
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get recording status
app.get('/record/status', (c) => {
  return c.json({
    success: true,
    recording: recordProcess !== null,
    path: currentRecordingPath,
  })
})

// Download the last recording
app.get('/record/download', async (c) => {
  if (!currentRecordingPath || !existsSync(currentRecordingPath)) {
    return c.json({ success: false, error: 'No recording available' }, 404)
  }

  try {
    const buffer = await readFile(currentRecordingPath)
    return new Response(buffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="recording.mp4"',
      },
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { app as webcamRoutes }
