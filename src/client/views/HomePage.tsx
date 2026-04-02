import { html } from 'hono/html'

export function HomePage() {
  return (
    <div>
      {/* Connection Settings */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <h3 class="text-lg font-semibold mb-4">Connection Settings</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Server Agent URL</label>
            <input
              id="server-url"
              type="text"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              placeholder="http://localhost:3001"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Auth Token</label>
            <input
              id="auth-token"
              type="password"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              placeholder="changeme-secret-token"
            />
          </div>
        </div>
        <button
          onclick="saveSettings()"
          class="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Save & Connect
        </button>
      </div>

      {/* System Overview */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">System Overview</h3>
          <button
            onclick="loadSystemInfo()"
            class="text-sm text-blue-400 hover:text-blue-300"
          >
            Refresh
          </button>
        </div>
        <div id="system-info" class="text-gray-400 text-sm">
          Click "Save & Connect" or "Refresh" to load system info.
        </div>
      </div>

      {/* Quick Actions */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 class="text-lg font-semibold mb-4">Quick Actions</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a href="/apps" class="bg-gray-800 hover:bg-gray-750 rounded-lg p-4 text-center transition-colors border border-gray-700 hover:border-gray-600">
            <div class="text-sm">Applications</div>
          </a>
          <a href="/processes" class="bg-gray-800 hover:bg-gray-750 rounded-lg p-4 text-center transition-colors border border-gray-700 hover:border-gray-600">
            <div class="text-sm">Processes</div>
          </a>
          <a href="/screenshot" class="bg-gray-800 hover:bg-gray-750 rounded-lg p-4 text-center transition-colors border border-gray-700 hover:border-gray-600">
            <div class="text-sm">Screenshot</div>
          </a>
          <a href="/files" class="bg-gray-800 hover:bg-gray-750 rounded-lg p-4 text-center transition-colors border border-gray-700 hover:border-gray-600">
            <div class="text-sm">Files</div>
          </a>
          <a href="/keylogger" class="bg-gray-800 hover:bg-gray-750 rounded-lg p-4 text-center transition-colors border border-gray-700 hover:border-gray-600">
            <div class="text-sm">Keylogger</div>
          </a>
          <a href="/webcam" class="bg-gray-800 hover:bg-gray-750 rounded-lg p-4 text-center transition-colors border border-gray-700 hover:border-gray-600">
            <div class="text-sm">Webcam</div>
          </a>
          <a href="/system" class="bg-gray-800 hover:bg-gray-750 rounded-lg p-4 text-center transition-colors border border-gray-700 hover:border-gray-600">
            <div class="text-sm">System</div>
          </a>
        </div>
      </div>

      {html`<script>
        (function () {
          document.getElementById('server-url').value = API_URL;
          document.getElementById('auth-token').value = AUTH_TOKEN;
        })();

        function saveSettings() {
          var url = document.getElementById('server-url').value.replace(/\\/+$/, '');
          var token = document.getElementById('auth-token').value;
          localStorage.setItem('serverUrl', url);
          localStorage.setItem('authToken', token);
          API_URL = url;
          AUTH_TOKEN = token;
          showNotification('Settings saved! Testing connection...', 'info');
          loadSystemInfo();
        }

        async function loadSystemInfo() {
          var el = document.getElementById('system-info');
          el.innerHTML = '<div class="spinner"></div> Loading...';
          try {
            var data = await apiCall('/api/system/info');
            if (data.success) {
              var info = data.info;
              el.innerHTML =
                '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
                '<div class="bg-gray-800 rounded-lg p-4">' +
                '<div class="text-xs text-gray-500 uppercase mb-1">Operating System</div>' +
                '<div class="text-white">' + escapeHtml(info.os.distro || info.os.platform) + ' ' + escapeHtml(info.os.release) + '</div>' +
                '<div class="text-xs text-gray-500 mt-1">' + escapeHtml(info.os.hostname) + ' (' + escapeHtml(info.os.arch) + ')</div>' +
                '</div>' +
                '<div class="bg-gray-800 rounded-lg p-4">' +
                '<div class="text-xs text-gray-500 uppercase mb-1">CPU</div>' +
                '<div class="text-white">' + escapeHtml(info.cpu.brand) + '</div>' +
                '<div class="text-xs text-gray-500 mt-1">' + info.cpu.cores + ' cores @ ' + info.cpu.speed + ' GHz</div>' +
                '</div>' +
                '<div class="bg-gray-800 rounded-lg p-4">' +
                '<div class="text-xs text-gray-500 uppercase mb-1">Memory</div>' +
                '<div class="text-white">' + formatBytes(info.memory.used) + ' / ' + formatBytes(info.memory.total) + '</div>' +
                '<div class="w-full bg-gray-700 rounded h-2 mt-2"><div class="bg-blue-500 rounded h-2" style="width:' + info.memory.usedPercent + '%"></div></div>' +
                '</div>' +
                '<div class="bg-gray-800 rounded-lg p-4">' +
                '<div class="text-xs text-gray-500 uppercase mb-1">Disk</div>' +
                (info.disk.length > 0
                  ? '<div class="text-white">' + formatBytes(info.disk[0].used) + ' / ' + formatBytes(info.disk[0].size) + '</div>' +
                    '<div class="w-full bg-gray-700 rounded h-2 mt-2"><div class="bg-blue-500 rounded h-2" style="width:' + (info.disk[0].usedPercent || 0) + '%"></div></div>'
                  : '<div class="text-gray-500">N/A</div>') +
                '</div>' +
                '</div>';
              showNotification('Connected successfully!', 'success');
              document.getElementById('conn-status').innerHTML =
                '<span class="w-2 h-2 rounded-full bg-green-500"></span> Connected';
            }
          } catch (e) {
            el.innerHTML = '<div class="text-red-400">Failed to connect. Check your settings.</div>';
          }
        }
      </script>`}
    </div>
  )
}
