import { html } from 'hono/html'

export function NetworkPage() {
  return (
    <div>
      {/* Network Interfaces */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-sm font-semibold text-gray-400 uppercase">Network Interfaces</h3>
          <button onclick="loadInterfaces()" class="text-sm text-blue-400 hover:text-blue-300 transition-colors">Refresh</button>
        </div>
        <div id="net-interfaces" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div class="text-sm text-gray-500">Loading...</div>
        </div>
      </div>

      {/* Network Scanner */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <div class="flex items-center gap-4 mb-4">
          <h3 class="text-sm font-semibold text-gray-400 uppercase">LAN Device Discovery</h3>
          <button
            onclick="scanNetwork()"
            id="scan-btn"
            class="bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Scan Network
          </button>
          <span id="scan-status" class="text-sm text-gray-400"></span>
        </div>
        <p class="text-xs text-gray-600 mb-4">
          Discovers devices on the local subnet via ARP table. The scan may take a few seconds as it pings the subnet first.
        </p>

        {/* Scan Results */}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-gray-500 uppercase border-b border-gray-800">
                <th class="px-4 py-2">IP Address</th>
                <th class="px-4 py-2">MAC Address</th>
                <th class="px-4 py-2">Hostname</th>
                <th class="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="scan-results">
              <tr>
                <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                  Click "Scan Network" to discover devices.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-3 text-xs text-gray-600">
          <span id="scan-count"></span>
          <span id="scan-subnet"></span>
        </div>
      </div>

      {/* Port Scanner */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 class="text-sm font-semibold text-gray-400 uppercase mb-4">Port Scanner</h3>
        <div class="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Target IP</label>
            <input
              id="port-host"
              type="text"
              class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 w-44 font-mono"
              placeholder="192.168.1.1"
            />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Ports (comma-sep, or leave blank for common)</label>
            <input
              id="port-list"
              type="text"
              class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 w-64 font-mono"
              placeholder="22,80,443,3306..."
            />
          </div>
          <button
            onclick="scanPorts()"
            id="portscan-btn"
            class="bg-green-600 hover:bg-green-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Scan Ports
          </button>
          <span id="portscan-status" class="text-sm text-gray-400"></span>
        </div>

        <div id="port-results" class="space-y-2"></div>
      </div>

      {html`<script>
        async function loadInterfaces() {
          try {
            var data = await apiCall('/api/network/interfaces');
            var container = document.getElementById('net-interfaces');
            if (data.success && data.interfaces.length > 0) {
              container.innerHTML = data.interfaces.map(function (iface) {
                return '<div class="bg-gray-950 rounded-lg p-4 border border-gray-800">' +
                  '<div class="font-medium text-blue-400 text-sm mb-2">' + escapeHtml(iface.name) + '</div>' +
                  iface.addresses.map(function (a) {
                    var badge = a.internal
                      ? '<span class="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded">internal</span>'
                      : '<span class="bg-green-900/50 text-green-400 text-xs px-2 py-0.5 rounded">active</span>';
                    return '<div class="flex items-center justify-between text-xs mb-1">' +
                      '<span class="font-mono text-gray-300">' + escapeHtml(a.address) + '</span>' +
                      '<span class="flex items-center gap-2">' +
                      '<span class="text-gray-500">' + a.family + '</span>' + badge +
                      '</span></div>';
                  }).join('') +
                  (iface.addresses[0] && iface.addresses[0].mac !== '00:00:00:00:00:00'
                    ? '<div class="text-xs text-gray-600 mt-1 font-mono">MAC: ' + escapeHtml(iface.addresses[0].mac) + '</div>'
                    : '') +
                  '</div>';
              }).join('');
            }
          } catch (e) {
            document.getElementById('net-interfaces').innerHTML = '<div class="text-red-400 text-sm">Failed to load</div>';
          }
        }

        async function scanNetwork() {
          var btn = document.getElementById('scan-btn');
          var status = document.getElementById('scan-status');
          btn.disabled = true;
          btn.textContent = 'Scanning...';
          status.innerHTML = '<div class="spinner"></div> Pinging subnet & reading ARP table...';

          try {
            var data = await apiCall('/api/network/scan');
            var tbody = document.getElementById('scan-results');

            if (data.success && data.devices.length > 0) {
              tbody.innerHTML = data.devices.map(function (dev) {
                return '<tr class="border-b border-gray-800/50 hover:bg-gray-800/30">' +
                  '<td class="px-4 py-2.5 font-mono text-blue-400">' + escapeHtml(dev.ip) + '</td>' +
                  '<td class="px-4 py-2.5 font-mono text-gray-400">' + escapeHtml(dev.mac) + '</td>' +
                  '<td class="px-4 py-2.5 text-gray-300">' + escapeHtml(dev.hostname || '-') + '</td>' +
                  '<td class="px-4 py-2.5 text-right">' +
                  '<button onclick="portScanDevice(\\'' + escapeHtml(dev.ip) + '\\')" class="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded text-xs transition-colors">Scan Ports</button>' +
                  '</td></tr>';
              }).join('');

              document.getElementById('scan-count').textContent = data.count + ' devices found';
              document.getElementById('scan-subnet').textContent = data.subnet ? ' on ' + data.subnet + '.0/24' : '';
              status.textContent = 'Done!';
              showNotification(data.count + ' devices discovered!', 'success');
            } else {
              tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">No devices found</td></tr>';
              status.textContent = 'No devices found';
            }
          } catch (e) {
            status.textContent = 'Scan failed';
          }

          btn.disabled = false;
          btn.textContent = 'Scan Network';
        }

        function portScanDevice(ip) {
          document.getElementById('port-host').value = ip;
          scanPorts();
          document.getElementById('port-host').scrollIntoView({ behavior: 'smooth' });
        }

        async function scanPorts() {
          var host = document.getElementById('port-host').value.trim();
          if (!host) return showNotification('Enter a target IP', 'error');

          var portsInput = document.getElementById('port-list').value.trim();
          var ports = portsInput
            ? portsInput.split(',').map(function (p) { return parseInt(p.trim()); }).filter(function (p) { return p > 0 && p < 65536; })
            : undefined;

          var btn = document.getElementById('portscan-btn');
          var status = document.getElementById('portscan-status');
          btn.disabled = true;
          btn.textContent = 'Scanning...';
          status.innerHTML = '<div class="spinner"></div> Scanning ports on ' + escapeHtml(host) + '...';

          try {
            var data = await apiCall('/api/network/portscan', {
              method: 'POST',
              body: JSON.stringify({ host: host, ports: ports }),
            });

            var container = document.getElementById('port-results');
            if (data.success) {
              var openPorts = data.openPorts;
              var allResults = data.allResults;

              container.innerHTML =
                '<div class="bg-gray-950 rounded-lg p-4 border border-gray-800">' +
                '<div class="flex items-center gap-3 mb-3">' +
                '<span class="text-sm font-medium text-white">Results for ' + escapeHtml(data.host) + '</span>' +
                '<span class="bg-green-900/50 text-green-400 text-xs px-2 py-1 rounded">' + openPorts.length + ' open</span>' +
                '<span class="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded">' + (allResults.length - openPorts.length) + ' closed</span>' +
                '</div>' +
                (openPorts.length > 0
                  ? '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">' +
                    openPorts.map(function (p) {
                      return '<div class="bg-green-900/20 border border-green-800/30 rounded-lg p-3 flex items-center justify-between">' +
                        '<div>' +
                        '<span class="text-green-400 font-mono font-medium">' + p.port + '</span>' +
                        (p.service ? '<span class="text-gray-500 text-xs ml-2">' + escapeHtml(p.service) + '</span>' : '') +
                        '</div>' +
                        '<span class="w-2 h-2 rounded-full bg-green-500"></span>' +
                        '</div>';
                    }).join('') +
                    '</div>'
                  : '<div class="text-gray-500 text-sm">No open ports found</div>') +
                '</div>';

              status.textContent = 'Done! ' + openPorts.length + ' open ports found.';
              showNotification('Port scan complete: ' + openPorts.length + ' open', 'success');
            }
          } catch (e) {
            status.textContent = 'Scan failed';
          }

          btn.disabled = false;
          btn.textContent = 'Scan Ports';
        }

        loadInterfaces();
      </script>`}
    </div>
  )
}
