import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { authMiddleware } from './auth'
import { appsRoutes } from './routes/apps'
import { processesRoutes } from './routes/processes'
import { screenshotRoutes } from './routes/screenshot'
import { keyloggerRoutes } from './routes/keylogger'
import { filesRoutes } from './routes/files'
import { systemRoutes } from './routes/system'
import { webcamRoutes } from './routes/webcam'
import { terminalRoutes } from './routes/terminal'
import { monitorRoutes } from './routes/monitor'
import { clipboardRoutes } from './routes/clipboard'
import { networkRoutes } from './routes/network'
import { auditRoutes, auditMiddleware } from './routes/audit'

const app = new Hono()

app.use('*', cors())
app.use('/api/*', authMiddleware)
app.use('/api/*', auditMiddleware)

app.route('/api/apps', appsRoutes)
app.route('/api/processes', processesRoutes)
app.route('/api/screenshot', screenshotRoutes)
app.route('/api/keylogger', keyloggerRoutes)
app.route('/api/files', filesRoutes)
app.route('/api/system', systemRoutes)
app.route('/api/webcam', webcamRoutes)
app.route('/api/terminal', terminalRoutes)
app.route('/api/monitor', monitorRoutes)
app.route('/api/clipboard', clipboardRoutes)
app.route('/api/network', networkRoutes)
app.route('/api/audit', auditRoutes)

app.get('/', (c) => c.json({ status: 'ok', message: 'Remote PC Control - Server Agent' }))

const port = parseInt(process.env.SERVER_PORT || '3001')
console.log(`Server Agent running on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
