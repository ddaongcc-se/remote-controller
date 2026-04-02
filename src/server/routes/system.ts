import { Hono } from 'hono'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import si from 'systeminformation'

const execAsync = promisify(exec)
const app = new Hono()

// Get system information
app.get('/info', async (c) => {
  try {
    const [osInfo, cpu, mem, disk, battery] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.battery(),
    ])

    return c.json({
      success: true,
      info: {
        os: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          release: osInfo.release,
          arch: osInfo.arch,
          hostname: osInfo.hostname,
        },
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          cores: cpu.cores,
          speed: cpu.speed,
        },
        memory: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          usedPercent: Math.round((mem.used / mem.total) * 100),
        },
        disk: disk.map((d) => ({
          fs: d.fs,
          size: d.size,
          used: d.used,
          available: d.available,
          usedPercent: d.use,
          mount: d.mount,
        })),
        battery: battery.hasBattery
          ? { percent: battery.percent, charging: battery.isCharging }
          : null,
      },
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Shutdown the system
app.post('/shutdown', async (c) => {
  try {
    const { delay } = await c.req.json().catch(() => ({ delay: 0 }))
    const delaySec = Math.max(0, parseInt(delay) || 0)

    if (process.platform === 'win32') {
      await execAsync(`shutdown /s /t ${delaySec}`)
    } else {
      if (delaySec > 0) {
        await execAsync(`shutdown -h +${Math.ceil(delaySec / 60)}`)
      } else {
        await execAsync('shutdown -h now')
      }
    }

    return c.json({ success: true, message: 'Shutdown command sent' })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Restart the system
app.post('/restart', async (c) => {
  try {
    const { delay } = await c.req.json().catch(() => ({ delay: 0 }))
    const delaySec = Math.max(0, parseInt(delay) || 0)

    if (process.platform === 'win32') {
      await execAsync(`shutdown /r /t ${delaySec}`)
    } else {
      if (delaySec > 0) {
        await execAsync(`shutdown -r +${Math.ceil(delaySec / 60)}`)
      } else {
        await execAsync('shutdown -r now')
      }
    }

    return c.json({ success: true, message: 'Restart command sent' })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Cancel a pending shutdown
app.post('/cancel-shutdown', async (c) => {
  try {
    if (process.platform === 'win32') {
      await execAsync('shutdown /a')
    } else {
      await execAsync('shutdown -c')
    }

    return c.json({ success: true, message: 'Shutdown cancelled' })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { app as systemRoutes }
