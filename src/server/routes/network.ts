import { Hono } from 'hono'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'

const execAsync = promisify(exec)
const app = new Hono()

// Get local network interfaces
app.get('/interfaces', (c) => {
  const ifaces = networkInterfaces()
  const result: {
    name: string
    addresses: { address: string; family: string; internal: boolean; mac: string }[]
  }[] = []

  for (const [name, addresses] of Object.entries(ifaces)) {
    if (addresses) {
      result.push({
        name,
        addresses: addresses.map((a) => ({
          address: a.address,
          family: a.family,
          internal: a.internal,
          mac: a.mac,
        })),
      })
    }
  }

  return c.json({ success: true, interfaces: result })
})

// Get the local subnet info for scanning
function getLocalSubnet(): string | null {
  const ifaces = networkInterfaces()
  for (const addresses of Object.values(ifaces)) {
    if (!addresses) continue
    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal) {
        // e.g. 192.168.1.5 → 192.168.1
        const parts = addr.address.split('.')
        return parts.slice(0, 3).join('.')
      }
    }
  }
  return null
}

// Scan local network using ARP table (fast, no nmap needed)
app.get('/scan', async (c) => {
  try {
    const devices: {
      ip: string
      mac: string
      hostname?: string
      vendor?: string
    }[] = []

    if (process.platform === 'win32') {
      const { stdout } = await execAsync('arp -a', { timeout: 10000 })
      const lines = stdout.split('\n')
      for (const line of lines) {
        const match = line.match(
          /\s+([\d.]+)\s+([0-9a-f-]{17})\s+/i
        )
        if (match) {
          devices.push({ ip: match[1], mac: match[2].replace(/-/g, ':') })
        }
      }
    } else {
      // First ping the broadcast to populate the ARP cache
      const subnet = getLocalSubnet()
      if (subnet) {
        // Quick parallel ping sweep of the subnet
        const pingPromises = []
        for (let i = 1; i <= 254; i++) {
          pingPromises.push(
            execAsync(`ping -c 1 -W 1 ${subnet}.${i}`, { timeout: 3000 }).catch(() => {})
          )
        }
        // Wait for pings with a max timeout of 5 seconds
        await Promise.race([
          Promise.allSettled(pingPromises),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ])
      }

      // Read ARP table
      try {
        const arpContent = await readFile('/proc/net/arp', 'utf-8')
        const lines = arpContent.split('\n').slice(1) // Skip header
        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          if (parts.length >= 4 && parts[3] !== '00:00:00:00:00:00') {
            devices.push({ ip: parts[0], mac: parts[3] })
          }
        }
      } catch {
        // Fallback: arp command
        const { stdout } = await execAsync('arp -n', { timeout: 5000 })
        const lines = stdout.split('\n').slice(1)
        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          if (parts.length >= 3 && parts[2] !== '<incomplete>') {
            devices.push({ ip: parts[0], mac: parts[2] })
          }
        }
      }
    }

    // Try to resolve hostnames
    for (const dev of devices) {
      try {
        const { stdout } = await execAsync(
          process.platform === 'win32'
            ? `nslookup ${dev.ip} 2>nul`
            : `getent hosts ${dev.ip} 2>/dev/null || host ${dev.ip} 2>/dev/null`,
          { timeout: 2000 }
        )
        const nameMatch = stdout.match(
          /name\s*=\s*(.+?)\.?\s*$/im
        ) || stdout.match(/\s+(.+?)\.?\s*$/)
        if (nameMatch) dev.hostname = nameMatch[1].trim()
      } catch {}
    }

    // Sort by IP
    devices.sort((a, b) => {
      const aParts = a.ip.split('.').map(Number)
      const bParts = b.ip.split('.').map(Number)
      for (let i = 0; i < 4; i++) {
        if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i]
      }
      return 0
    })

    return c.json({
      success: true,
      subnet: getLocalSubnet(),
      count: devices.length,
      devices,
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Quick port scan on a specific host
app.post('/portscan', async (c) => {
  try {
    const { host, ports } = await c.req.json()
    if (!host || typeof host !== 'string') {
      return c.json({ success: false, error: 'host is required' }, 400)
    }

    // Validate host - only allow IP addresses
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      return c.json({ success: false, error: 'Only IP addresses are allowed' }, 400)
    }

    const commonPorts = Array.isArray(ports)
      ? ports.filter((p: any) => typeof p === 'number' && p > 0 && p < 65536).slice(0, 100)
      : [22, 80, 443, 445, 3389, 8080, 3000, 3001, 5000, 8000, 21, 25, 53, 110, 993, 995, 1433, 3306, 5432, 6379, 27017]

    const { createConnection } = await import('node:net')

    const results: { port: number; open: boolean; service?: string }[] = []
    const SERVICE_MAP: Record<number, string> = {
      21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS', 80: 'HTTP',
      110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 445: 'SMB', 993: 'IMAPS',
      995: 'POP3S', 1433: 'MSSQL', 3000: 'Dev', 3001: 'Dev', 3306: 'MySQL',
      3389: 'RDP', 5000: 'Dev', 5432: 'PostgreSQL', 6379: 'Redis',
      8000: 'HTTP-Alt', 8080: 'HTTP-Proxy', 27017: 'MongoDB',
    }

    const scanPort = (port: number): Promise<boolean> =>
      new Promise((resolve) => {
        const socket = createConnection({ host, port, timeout: 1500 })
        socket.on('connect', () => {
          socket.destroy()
          resolve(true)
        })
        socket.on('error', () => resolve(false))
        socket.on('timeout', () => {
          socket.destroy()
          resolve(false)
        })
      })

    // Scan 10 ports at a time to avoid flooding
    for (let i = 0; i < commonPorts.length; i += 10) {
      const batch = commonPorts.slice(i, i + 10)
      const batchResults = await Promise.all(
        batch.map(async (port) => ({
          port,
          open: await scanPort(port),
          service: SERVICE_MAP[port],
        }))
      )
      results.push(...batchResults)
    }

    return c.json({
      success: true,
      host,
      openPorts: results.filter((r) => r.open),
      allResults: results,
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { app as networkRoutes }
