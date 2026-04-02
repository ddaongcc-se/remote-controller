import { html } from 'hono/html'

export function MonitorPage() {
  return (
    <div>
      {/* Controls */}
      <div class="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-6">
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" id="mon-auto" checked class="rounded" onchange="toggleAutoRefresh()" />
            Auto-refresh
          </label>
          <select id="mon-interval" class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300" onchange="toggleAutoRefresh()">
            <option value="1000">1s</option>
            <option value="2000" selected>2s</option>
            <option value="5000">5s</option>
          </select>
          <button onclick="fetchSnapshot()" class="text-sm text-blue-400 hover:text-blue-300 transition-colors">Manual Refresh</button>
          <div class="flex-1"></div>
          <span id="mon-timestamp" class="text-xs text-gray-600"></span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div class="text-xs text-gray-500 uppercase mb-1">CPU Usage</div>
          <div class="text-3xl font-bold" id="cpu-overall">--%</div>
          <div class="text-xs text-gray-500 mt-1" id="cpu-temp"></div>
          <div class="w-full bg-gray-800 rounded-full h-2 mt-3">
            <div id="cpu-bar" class="bg-blue-500 h-2 rounded-full transition-all duration-500" style="width: 0%"></div>
          </div>
        </div>
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div class="text-xs text-gray-500 uppercase mb-1">Memory</div>
          <div class="text-3xl font-bold" id="mem-percent">--%</div>
          <div class="text-xs text-gray-500 mt-1" id="mem-detail"></div>
          <div class="w-full bg-gray-800 rounded-full h-2 mt-3">
            <div id="mem-bar" class="bg-green-500 h-2 rounded-full transition-all duration-500" style="width: 0%"></div>
          </div>
        </div>
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div class="text-xs text-gray-500 uppercase mb-1">Network &#8595;</div>
          <div class="text-3xl font-bold" id="net-rx">-- /s</div>
          <div class="text-xs text-gray-500 uppercase mt-3 mb-1">Network &#8593;</div>
          <div class="text-xl font-semibold text-gray-300" id="net-tx">-- /s</div>
        </div>
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div class="text-xs text-gray-500 uppercase mb-1">Disk</div>
          <div id="disk-info" class="text-sm text-gray-400">Loading...</div>
        </div>
      </div>

      {/* Charts */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 class="text-sm font-semibold text-gray-400 uppercase mb-4">CPU History (60s)</h3>
          <canvas id="cpu-chart" height="200"></canvas>
        </div>
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 class="text-sm font-semibold text-gray-400 uppercase mb-4">Memory History (60s)</h3>
          <canvas id="mem-chart" height="200"></canvas>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 class="text-sm font-semibold text-gray-400 uppercase mb-4">Network I/O (60s)</h3>
          <canvas id="net-chart" height="200"></canvas>
        </div>
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 class="text-sm font-semibold text-gray-400 uppercase mb-4">Per-Core CPU Load</h3>
          <canvas id="core-chart" height="200"></canvas>
        </div>
      </div>

      {/* Top Processes */}
      <div class="bg-gray-900 rounded-xl border border-gray-800">
        <div class="flex justify-between items-center p-5 pb-3">
          <h3 class="text-sm font-semibold text-gray-400 uppercase">Top Processes</h3>
          <div class="flex gap-2">
            <button onclick="loadTop('cpu')" id="top-cpu-btn" class="text-xs bg-blue-600/20 text-blue-400 px-3 py-1 rounded transition-colors">By CPU</button>
            <button onclick="loadTop('mem')" id="top-mem-btn" class="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded transition-colors">By Memory</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-gray-500 uppercase border-b border-gray-800">
                <th class="px-5 py-2">PID</th>
                <th class="px-5 py-2">Process</th>
                <th class="px-5 py-2">CPU %</th>
                <th class="px-5 py-2">Memory %</th>
              </tr>
            </thead>
            <tbody id="top-list"></tbody>
          </table>
        </div>
      </div>

      {html`<script>
        var MAX_POINTS = 30;
        var cpuHistory = [];
        var memHistory = [];
        var netRxHistory = [];
        var netTxHistory = [];
        var labels = [];
        var cpuChart, memChart, netChart, coreChart;
        var monitorInterval = null;

        var chartDefaults = {
          responsive: true,
          animation: { duration: 300 },
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: {
              beginAtZero: true,
              max: 100,
              ticks: { color: '#6b7280', font: { size: 10 } },
              grid: { color: 'rgba(107,114,128,0.1)' },
            },
          },
        };

        function initCharts() {
          var ctx1 = document.getElementById('cpu-chart').getContext('2d');
          cpuChart = new Chart(ctx1, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                data: cpuHistory,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                borderWidth: 2,
              }],
            },
            options: structuredClone(chartDefaults),
          });

          var ctx2 = document.getElementById('mem-chart').getContext('2d');
          memChart = new Chart(ctx2, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                data: memHistory,
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34,197,94,0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                borderWidth: 2,
              }],
            },
            options: structuredClone(chartDefaults),
          });

          var netOpts = structuredClone(chartDefaults);
          netOpts.scales.y.max = undefined;
          netOpts.plugins.legend = { display: true, labels: { color: '#9ca3af', font: { size: 10 } } };

          var ctx3 = document.getElementById('net-chart').getContext('2d');
          netChart = new Chart(ctx3, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [
                {
                  label: 'Download',
                  data: netRxHistory,
                  borderColor: '#8b5cf6',
                  backgroundColor: 'rgba(139,92,246,0.1)',
                  fill: true,
                  tension: 0.3,
                  pointRadius: 0,
                  borderWidth: 2,
                },
                {
                  label: 'Upload',
                  data: netTxHistory,
                  borderColor: '#f59e0b',
                  backgroundColor: 'rgba(245,158,11,0.1)',
                  fill: true,
                  tension: 0.3,
                  pointRadius: 0,
                  borderWidth: 2,
                },
              ],
            },
            options: netOpts,
          });

          var ctx4 = document.getElementById('core-chart').getContext('2d');
          coreChart = new Chart(ctx4, {
            type: 'bar',
            data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
            options: {
              responsive: true,
              animation: { duration: 300 },
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { display: false } },
                y: { beginAtZero: true, max: 100, ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(107,114,128,0.1)' } },
              },
            },
          });
        }

        async function fetchSnapshot() {
          try {
            var data = await apiCall('/api/monitor/snapshot');
            if (!data.success) return;

            var ts = new Date(data.timestamp).toLocaleTimeString();
            document.getElementById('mon-timestamp').textContent = 'Last: ' + ts;

            // Update cards
            document.getElementById('cpu-overall').textContent = data.cpu.overall + '%';
            document.getElementById('cpu-bar').style.width = data.cpu.overall + '%';
            document.getElementById('cpu-bar').className = 'h-2 rounded-full transition-all duration-500 ' +
              (data.cpu.overall > 80 ? 'bg-red-500' : data.cpu.overall > 50 ? 'bg-yellow-500' : 'bg-blue-500');

            if (data.cpu.temperature !== null) {
              document.getElementById('cpu-temp').textContent = 'Temperature: ' + data.cpu.temperature + '°C';
            }

            document.getElementById('mem-percent').textContent = data.memory.percent + '%';
            document.getElementById('mem-bar').style.width = data.memory.percent + '%';
            document.getElementById('mem-bar').className = 'h-2 rounded-full transition-all duration-500 ' +
              (data.memory.percent > 80 ? 'bg-red-500' : data.memory.percent > 50 ? 'bg-yellow-500' : 'bg-green-500');
            document.getElementById('mem-detail').textContent = formatBytes(data.memory.used) + ' / ' + formatBytes(data.memory.total);

            document.getElementById('net-rx').textContent = formatBytes(data.network.rxPerSec) + '/s';
            document.getElementById('net-tx').textContent = formatBytes(data.network.txPerSec) + '/s';

            if (data.disk.length > 0) {
              document.getElementById('disk-info').innerHTML = data.disk.slice(0, 3).map(function (d) {
                return '<div class="mb-2"><div class="flex justify-between text-xs"><span>' + escapeHtml(d.mount) + '</span><span>' + Math.round(d.percent) + '%</span></div>' +
                  '<div class="w-full bg-gray-800 rounded h-1.5 mt-1"><div class="rounded h-1.5 transition-all ' +
                  (d.percent > 90 ? 'bg-red-500' : 'bg-blue-500') +
                  '" style="width:' + d.percent + '%"></div></div></div>';
              }).join('');
            }

            // Update history
            labels.push(ts);
            cpuHistory.push(data.cpu.overall);
            memHistory.push(data.memory.percent);
            netRxHistory.push(Math.round(data.network.rxPerSec / 1024));
            netTxHistory.push(Math.round(data.network.txPerSec / 1024));

            if (labels.length > MAX_POINTS) {
              labels.shift();
              cpuHistory.shift();
              memHistory.shift();
              netRxHistory.shift();
              netTxHistory.shift();
            }

            cpuChart.update();
            memChart.update();
            netChart.update();

            // Core chart
            var coreLabels = data.cpu.cores.map(function (c) { return 'Core ' + c.core; });
            var coreData = data.cpu.cores.map(function (c) { return c.load; });
            var coreColors = coreData.map(function (v) {
              return v > 80 ? '#ef4444' : v > 50 ? '#eab308' : '#3b82f6';
            });
            coreChart.data.labels = coreLabels;
            coreChart.data.datasets[0].data = coreData;
            coreChart.data.datasets[0].backgroundColor = coreColors;
            coreChart.update();

          } catch (e) {}
        }

        async function loadTop(sort) {
          document.getElementById('top-cpu-btn').className = sort === 'cpu'
            ? 'text-xs bg-blue-600/20 text-blue-400 px-3 py-1 rounded transition-colors'
            : 'text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded transition-colors';
          document.getElementById('top-mem-btn').className = sort === 'mem'
            ? 'text-xs bg-blue-600/20 text-blue-400 px-3 py-1 rounded transition-colors'
            : 'text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded transition-colors';

          try {
            var data = await apiCall('/api/monitor/top?sort=' + sort);
            if (data.success) {
              document.getElementById('top-list').innerHTML = data.processes.map(function (p) {
                return '<tr class="border-b border-gray-800/50 hover:bg-gray-800/30">' +
                  '<td class="px-5 py-2 font-mono text-gray-500">' + p.pid + '</td>' +
                  '<td class="px-5 py-2 text-gray-200">' + escapeHtml(p.name) + '</td>' +
                  '<td class="px-5 py-2 ' + (p.cpu > 50 ? 'text-red-400' : p.cpu > 10 ? 'text-yellow-400' : 'text-gray-400') + '">' + p.cpu + '%</td>' +
                  '<td class="px-5 py-2 ' + (p.mem > 50 ? 'text-red-400' : p.mem > 10 ? 'text-yellow-400' : 'text-gray-400') + '">' + p.mem + '%</td>' +
                  '</tr>';
              }).join('');
            }
          } catch (e) {}
        }

        function toggleAutoRefresh() {
          if (monitorInterval) {
            clearInterval(monitorInterval);
            monitorInterval = null;
          }
          if (document.getElementById('mon-auto').checked) {
            var ms = parseInt(document.getElementById('mon-interval').value);
            monitorInterval = setInterval(function () {
              fetchSnapshot();
              loadTop(document.getElementById('top-cpu-btn').className.includes('blue-400') ? 'cpu' : 'mem');
            }, ms);
          }
        }

        initCharts();
        fetchSnapshot();
        loadTop('cpu');
        toggleAutoRefresh();
      </script>`}
    </div>
  )
}
