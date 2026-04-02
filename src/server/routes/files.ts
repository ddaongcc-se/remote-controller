import { Hono } from 'hono'
import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { resolve, basename, dirname } from 'node:path'

const app = new Hono()

function validatePath(p: string): boolean {
  return typeof p === 'string' && p.length > 0 && !p.includes('\0')
}

// Browse directory contents
app.get('/browse', async (c) => {
  const dirPath = c.req.query('path') || '/'

  if (!validatePath(dirPath)) {
    return c.json({ success: false, error: 'Invalid path' }, 400)
  }

  try {
    const resolved = resolve(dirPath)
    const entries = await readdir(resolved, { withFileTypes: true })
    const items = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = resolve(resolved, entry.name)
        try {
          const stats = await stat(fullPath)
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            modified: stats.mtime.toISOString(),
          }
        } catch {
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: 0,
            modified: '',
          }
        }
      })
    )

    // Sort: directories first, then by name
    items.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return c.json({ success: true, path: resolved, items })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Download a file
app.get('/download', async (c) => {
  const filePath = c.req.query('path')

  if (!filePath || !validatePath(filePath)) {
    return c.json({ success: false, error: 'Invalid path' }, 400)
  }

  try {
    const resolved = resolve(filePath)
    const stats = await stat(resolved)

    if (stats.isDirectory()) {
      return c.json({ success: false, error: 'Cannot download a directory' }, 400)
    }

    const stream = createReadStream(resolved)
    const fileName = basename(resolved)

    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': stats.size.toString(),
      },
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Upload a file
app.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file'] as File
    const destination = body['destination'] as string

    if (!file || !destination) {
      return c.json({ success: false, error: 'file and destination are required' }, 400)
    }

    if (!validatePath(destination)) {
      return c.json({ success: false, error: 'Invalid destination path' }, 400)
    }

    const resolved = resolve(destination)

    // Ensure directory exists
    await mkdir(dirname(resolved), { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(resolved, buffer)

    return c.json({ success: true, message: 'File uploaded to ' + resolved })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Copy a file within the server
app.post('/copy', async (c) => {
  try {
    const { source, destination } = await c.req.json()

    if (!source || !destination || !validatePath(source) || !validatePath(destination)) {
      return c.json({ success: false, error: 'Valid source and destination are required' }, 400)
    }

    const srcResolved = resolve(source)
    const destResolved = resolve(destination)

    await mkdir(dirname(destResolved), { recursive: true })
    const content = await readFile(srcResolved)
    await writeFile(destResolved, content)

    return c.json({ success: true, message: 'Copied to ' + destResolved })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { app as filesRoutes }
