import { Hono } from 'hono'
import si from 'systeminformation'

const app = new Hono()

// Get real-time system metrics snapshot
app.get('/snapshot', async (c) => {
  try {
    const [cpuLoad, mem, netStats, cpuTemp, fsSize, currentLoad] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats(),
      si.cpuTemperature().catch(() => ({ main: null, cores: [] })),
      si.fsSize(),
      si.currentLoad(),
    ])

    // Per-core utilization
    const cores = currentLoad.cpus.map((core, i) => ({
      core: i,
      load: Math.round(core.load * 10) / 10,
    }))

    // Network I/O (sum all interfaces)
    let netRx = 0
    let netTx = 0
    let netRxSec = 0
    let netTxSec = 0
    for (const iface of netStats) {
      netRx += iface.rx_bytes
      netTx += iface.tx_bytes
      netRxSec += iface.rx_sec
      netTxSec += iface.tx_sec
    }

    return c.json({
      success: true,
      timestamp: Date.now(),
      cpu: {
        overall: Math.round(cpuLoad.currentLoad * 10) / 10,
        cores,
        temperature: cpuTemp.main,
        coreTemps: cpuTemp.cores || [],
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        swapTotal: mem.swaptotal,
        swapUsed: mem.swapused,
        percent: Math.round((mem.used / mem.total) * 1000) / 10,
      },
      network: {
        totalRx: netRx,
        totalTx: netTx,
        rxPerSec: Math.round(netRxSec),
        txPerSec: Math.round(netTxSec),
      },
      disk: fsSize.map((d) => ({
        mount: d.mount,
        size: d.size,
        used: d.used,
        percent: d.use,
      })),
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get top processes by resource usage
app.get('/top', async (c) => {
  try {
    const data = await si.processes()
    const sortBy = c.req.query('sort') || 'cpu'

    const topProcesses = data.list
      .sort((a, b) => (sortBy === 'mem' ? b.mem - a.mem : b.cpu - a.cpu))
      .slice(0, 10)
      .map((p) => ({
        pid: p.pid,
        name: p.name,
        cpu: Math.round(p.cpu * 10) / 10,
        mem: Math.round(p.mem * 10) / 10,
      }))

    return c.json({ success: true, processes: topProcesses })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { app as monitorRoutes }
