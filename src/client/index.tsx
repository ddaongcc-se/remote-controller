import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { Layout } from './views/Layout'
import { HomePage } from './views/HomePage'
import { AppsPage } from './views/AppsPage'
import { ProcessesPage } from './views/ProcessesPage'
import { ScreenshotPage } from './views/ScreenshotPage'
import { KeyloggerPage } from './views/KeyloggerPage'
import { FilesPage } from './views/FilesPage'
import { SystemPage } from './views/SystemPage'
import { WebcamPage } from './views/WebcamPage'
import { TerminalPage } from './views/TerminalPage'
import { MonitorPage } from './views/MonitorPage'
import { ClipboardPage } from './views/ClipboardPage'
import { NetworkPage } from './views/NetworkPage'
import { AuditPage } from './views/AuditPage'

const app = new Hono()

app.get('/', (c) =>
  c.html(
    <Layout title="Dashboard" active="/">
      <HomePage />
    </Layout>
  )
)

app.get('/apps', (c) =>
  c.html(
    <Layout title="Applications" active="/apps">
      <AppsPage />
    </Layout>
  )
)

app.get('/processes', (c) =>
  c.html(
    <Layout title="Processes" active="/processes">
      <ProcessesPage />
    </Layout>
  )
)

app.get('/screenshot', (c) =>
  c.html(
    <Layout title="Screenshot" active="/screenshot">
      <ScreenshotPage />
    </Layout>
  )
)

app.get('/keylogger', (c) =>
  c.html(
    <Layout title="Keylogger" active="/keylogger">
      <KeyloggerPage />
    </Layout>
  )
)

app.get('/files', (c) =>
  c.html(
    <Layout title="File Manager" active="/files">
      <FilesPage />
    </Layout>
  )
)

app.get('/system', (c) =>
  c.html(
    <Layout title="System Control" active="/system">
      <SystemPage />
    </Layout>
  )
)

app.get('/webcam', (c) =>
  c.html(
    <Layout title="Webcam" active="/webcam">
      <WebcamPage />
    </Layout>
  )
)

app.get('/terminal', (c) =>
  c.html(
    <Layout title="Remote Terminal" active="/terminal">
      <TerminalPage />
    </Layout>
  )
)

app.get('/monitor', (c) =>
  c.html(
    <Layout title="Live Monitor" active="/monitor">
      <MonitorPage />
    </Layout>
  )
)

app.get('/clipboard', (c) =>
  c.html(
    <Layout title="Clipboard" active="/clipboard">
      <ClipboardPage />
    </Layout>
  )
)

app.get('/network', (c) =>
  c.html(
    <Layout title="Network Scan" active="/network">
      <NetworkPage />
    </Layout>
  )
)

app.get('/audit', (c) =>
  c.html(
    <Layout title="Audit Log" active="/audit">
      <AuditPage />
    </Layout>
  )
)

const port = parseInt(process.env.CLIENT_PORT || '3000')
console.log(`Client Dashboard running on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
