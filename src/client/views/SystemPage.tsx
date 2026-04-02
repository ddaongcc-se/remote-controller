import { html } from 'hono/html'

export function SystemPage() {
  return (
    <div>
      {/* System Info */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-sm font-semibold text-gray-400 uppercase">System Information</h3>
          <button
            onclick="loadInfo()"
            class="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div id="sys-info" class="text-sm text-gray-300">
          <div class="spinner"></div>
        </div>
      </div>

      {/* Power Controls */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <h3 class="text-sm font-semibold text-gray-400 uppercase mb-4">Power Controls</h3>
        <div class="flex flex-wrap gap-3 items-end">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Delay (seconds)</label>
            <input
              id="delay-input"
              type="number"
              value="0"
              min="0"
              class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm w-32 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onclick="shutdownSystem()"
            class="bg-red-600 hover:bg-red-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Shutdown
          </button>
          <button
            onclick="restartSystem()"
            class="bg-orange-600 hover:bg-orange-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Restart
          </button>
          <button
            onclick="cancelShutdown()"
            class="bg-gray-700 hover:bg-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel Shutdown
          </button>
        </div>
        <p class="text-xs text-yellow-500/70 mt-3">
          Warning: These actions will immediately affect the remote machine. Make sure you have saved all work.
        </p>
      </div>

      {html`<script>
        async function loadInfo() {
          var el = document.getElementById('sys-info');
          el.innerHTML = '<div class="spinner"></div>';
          try {
            var data = await apiCall('/api/system/info');
            if (data.success) {
              var info = data.info;
              el.innerHTML =
                '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
                '<div class="bg-gray-800 rounded-lg p-4">' +
                '<div class="text-xs text-gray-500 uppercase mb-2">Operating System</div>' +
                '<div class="text-white font-medium">' + escapeHtml(info.os.distro || info.os.platform) + '</div>' +
                '<div class="text-gray-400 text-xs mt-1">Release: ' + escapeHtml(info.os.release) + '</div>' +
                '<div class="text-gray-400 text-xs">Hostname: ' + escapeHtml(info.os.hostname) + '</div>' +
                '<div class="text-gray-400 text-xs">Arch: ' + escapeHtml(info.os.arch) + '</div>' +
                '</div>' +
                '<div class="bg-gray-800 rounded-lg p-4">' +
                '<div class="text-xs text-gray-500 uppercase mb-2">CPU</div>' +
                '<div class="text-white font-medium">' + escapeHtml(info.cpu.brand) + '</div>' +
                '<div class="text-gray-400 text-xs mt-1">' + info.cpu.cores + ' cores @ ' + info.cpu.speed + ' GHz</div>' +
                '</div>' +
                '<div class="bg-gray-800 rounded-lg p-4">' +
                '<div class="text-xs text-gray-500 uppercase mb-2">Memory</div>' +
                '<div class="flex items-baseline gap-2">' +
                '<span class="text-white font-medium">' + info.memory.usedPercent + '%</span>' +
                '<span class="text-gray-400 text-xs">' + formatBytes(info.memory.used) + ' / ' + formatBytes(info.memory.total) + '</span>' +
                '</div>' +
                '<div class="w-full bg-gray-700 rounded h-2 mt-2"><div class="bg-blue-500 rounded h-2 transition-all" style="width:' + info.memory.usedPercent + '%"></div></div>' +
                '</div>' +
                '<div class="bg-gray-800 rounded-lg p-4">' +
                '<div class="text-xs text-gray-500 uppercase mb-2">Disks</div>' +
                info.disk.map(function (d) {
                  return '<div class="mb-2 last:mb-0">' +
                    '<div class="flex justify-between text-xs">' +
                    '<span class="text-gray-300">' + escapeHtml(d.mount) + '</span>' +
                    '<span class="text-gray-400">' + formatBytes(d.used) + ' / ' + formatBytes(d.size) + '</span>' +
                    '</div>' +
                    '<div class="w-full bg-gray-700 rounded h-1.5 mt-1"><div class="bg-blue-500 rounded h-1.5" style="width:' + (d.usedPercent || 0) + '%"></div></div>' +
                    '</div>';
                }).join('') +
                '</div>' +
                (info.battery ? '<div class="bg-gray-800 rounded-lg p-4"><div class="text-xs text-gray-500 uppercase mb-2">Battery</div><div class="text-white font-medium">' + info.battery.percent + '%' + (info.battery.charging ? ' (Charging)' : '') + '</div></div>' : '') +
                '</div>';
            }
          } catch (e) {
            el.innerHTML = '<div class="text-red-400">Failed to load system information</div>';
          }
        }

        async function shutdownSystem() {
          if (!confirm('Are you sure you want to SHUTDOWN the remote machine?')) return;
          if (!confirm('This will shut down the remote PC. Confirm again?')) return;
          var delay = parseInt(document.getElementById('delay-input').value) || 0;
          try {
            var data = await apiCall('/api/system/shutdown', {
              method: 'POST',
              body: JSON.stringify({ delay: delay }),
            });
            if (data.success) showNotification('Shutdown command sent!', 'success');
          } catch (e) {}
        }

        async function restartSystem() {
          if (!confirm('Are you sure you want to RESTART the remote machine?')) return;
          var delay = parseInt(document.getElementById('delay-input').value) || 0;
          try {
            var data = await apiCall('/api/system/restart', {
              method: 'POST',
              body: JSON.stringify({ delay: delay }),
            });
            if (data.success) showNotification('Restart command sent!', 'success');
          } catch (e) {}
        }

        async function cancelShutdown() {
          try {
            var data = await apiCall('/api/system/cancel-shutdown', { method: 'POST' });
            if (data.success) showNotification('Shutdown cancelled', 'success');
          } catch (e) {}
        }

        loadInfo();
      </script>`}
    </div>
  )
}
