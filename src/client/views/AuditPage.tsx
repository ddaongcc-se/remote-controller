import { html } from 'hono/html'

export function AuditPage() {
  return (
    <div>
      {/* Stats Cards */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div class="text-xs text-gray-500 uppercase mb-1">Total Actions</div>
          <div class="text-2xl font-bold" id="stat-total">0</div>
        </div>
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div class="text-xs text-gray-500 uppercase mb-1">Last Hour</div>
          <div class="text-2xl font-bold text-blue-400" id="stat-hour">0</div>
        </div>
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div class="text-xs text-gray-500 uppercase mb-1">Last 24h</div>
          <div class="text-2xl font-bold text-green-400" id="stat-day">0</div>
        </div>
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div class="text-xs text-gray-500 uppercase mb-1">Errors</div>
          <div class="text-2xl font-bold text-red-400" id="stat-errors">0</div>
        </div>
      </div>

      {/* Category Breakdown Chart */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 class="text-sm font-semibold text-gray-400 uppercase mb-4">Actions by Category</h3>
          <canvas id="category-chart" height="200"></canvas>
        </div>
        <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 class="text-sm font-semibold text-gray-400 uppercase mb-4">Timeline (last 50 actions)</h3>
          <canvas id="timeline-chart" height="200"></canvas>
        </div>
      </div>

      {/* Filters */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="flex-1 min-w-[200px]">
            <label class="block text-xs text-gray-400 mb-1">Search</label>
            <input
              id="audit-search"
              type="text"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Search actions, details..."
              oninput="debounceLoad()"
            />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Category</label>
            <select
              id="audit-category"
              class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              onchange="loadAuditLog()"
            >
              <option value="">All</option>
              <option value="apps">Apps</option>
              <option value="processes">Processes</option>
              <option value="screenshot">Screenshot</option>
              <option value="keylogger">Keylogger</option>
              <option value="files">Files</option>
              <option value="system">System</option>
              <option value="webcam">Webcam</option>
              <option value="terminal">Terminal</option>
              <option value="clipboard">Clipboard</option>
              <option value="network">Network</option>
            </select>
          </div>
          <button onclick="loadAuditLog()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">Refresh</button>
          <button onclick="clearAuditLog()" class="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">Clear Log</button>
          <label class="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" id="audit-auto" checked onchange="toggleAuditAuto()" />
            Auto-refresh
          </label>
        </div>
      </div>

      {/* Log Entries */}
      <div class="bg-gray-900 rounded-xl border border-gray-800">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-gray-500 uppercase border-b border-gray-800">
                <th class="px-5 py-3">Time</th>
                <th class="px-5 py-3">Category</th>
                <th class="px-5 py-3">Action</th>
                <th class="px-5 py-3">Details</th>
                <th class="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody id="audit-log">
              <tr>
                <td colspan="5" class="px-5 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="px-5 py-3 border-t border-gray-800 text-xs text-gray-500">
          Showing <span id="audit-count">0</span> of <span id="audit-total">0</span> entries
        </div>
      </div>

      {html`<script>
        var auditAutoInterval = null;
        var debounceTimer = null;
        var categoryChart, timelineChart;

        var CATEGORY_COLORS = {
          apps: '#3b82f6',
          processes: '#22c55e',
          screenshot: '#8b5cf6',
          keylogger: '#ef4444',
          files: '#f59e0b',
          system: '#ec4899',
          webcam: '#06b6d4',
          terminal: '#14b8a6',
          clipboard: '#a855f7',
          network: '#6366f1',
        };

        function initAuditCharts() {
          var ctx1 = document.getElementById('category-chart').getContext('2d');
          categoryChart = new Chart(ctx1, {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
            options: {
              responsive: true,
              plugins: {
                legend: { position: 'right', labels: { color: '#9ca3af', font: { size: 11 } } },
              },
            },
          });

          var ctx2 = document.getElementById('timeline-chart').getContext('2d');
          timelineChart = new Chart(ctx2, {
            type: 'bar',
            data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
            options: {
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                x: { display: false },
                y: { display: false },
              },
            },
          });
        }

        async function loadStats() {
          try {
            var data = await apiCall('/api/audit/stats');
            if (data.success) {
              var s = data.stats;
              document.getElementById('stat-total').textContent = s.total;
              document.getElementById('stat-hour').textContent = s.lastHour;
              document.getElementById('stat-day').textContent = s.lastDay;
              document.getElementById('stat-errors').textContent = s.errors;

              // Update category chart
              var cats = Object.keys(s.byCategory);
              categoryChart.data.labels = cats.map(function (c) { return c.charAt(0).toUpperCase() + c.slice(1); });
              categoryChart.data.datasets[0].data = cats.map(function (c) { return s.byCategory[c]; });
              categoryChart.data.datasets[0].backgroundColor = cats.map(function (c) { return CATEGORY_COLORS[c] || '#6b7280'; });
              categoryChart.update();
            }
          } catch (e) {}
        }

        async function loadAuditLog() {
          var search = document.getElementById('audit-search').value.trim();
          var category = document.getElementById('audit-category').value;
          var params = '?limit=100';
          if (search) params += '&search=' + encodeURIComponent(search);
          if (category) params += '&category=' + encodeURIComponent(category);

          try {
            var data = await apiCall('/api/audit/log' + params);
            var tbody = document.getElementById('audit-log');

            if (data.success) {
              document.getElementById('audit-count').textContent = data.filtered;
              document.getElementById('audit-total').textContent = data.total;

              if (data.entries.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-8 text-center text-gray-500">No log entries</td></tr>';
              } else {
                tbody.innerHTML = data.entries.map(function (e) {
                  var catColor = CATEGORY_COLORS[e.category] || '#6b7280';
                  var time = new Date(e.timestamp).toLocaleTimeString();
                  return '<tr class="border-b border-gray-800/50 hover:bg-gray-800/30">' +
                    '<td class="px-5 py-2.5 text-gray-400 text-xs whitespace-nowrap">' + time + '</td>' +
                    '<td class="px-5 py-2.5"><span class="px-2 py-0.5 rounded text-xs font-medium" style="background:' + catColor + '20;color:' + catColor + '">' + escapeHtml(e.category) + '</span></td>' +
                    '<td class="px-5 py-2.5 text-gray-200 font-mono text-xs">' + escapeHtml(e.action) + '</td>' +
                    '<td class="px-5 py-2.5 text-gray-400 text-xs">' + escapeHtml(e.details) + '</td>' +
                    '<td class="px-5 py-2.5">' +
                    (e.success
                      ? '<span class="w-2 h-2 rounded-full bg-green-500 inline-block"></span>'
                      : '<span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span>') +
                    '</td></tr>';
                }).join('');
              }

              // Update timeline chart
              var recent = data.entries.slice(0, 50).reverse();
              timelineChart.data.labels = recent.map(function (e) { return ''; });
              timelineChart.data.datasets[0].data = recent.map(function () { return 1; });
              timelineChart.data.datasets[0].backgroundColor = recent.map(function (e) {
                return e.success ? (CATEGORY_COLORS[e.category] || '#6b7280') : '#ef4444';
              });
              timelineChart.update();
            }
          } catch (e) {
            document.getElementById('audit-log').innerHTML =
              '<tr><td colspan="5" class="px-5 py-8 text-center text-red-400">Failed to load</td></tr>';
          }
        }

        async function clearAuditLog() {
          if (!confirm('Clear all audit log entries?')) return;
          try {
            await apiCall('/api/audit/clear', { method: 'POST' });
            showNotification('Audit log cleared', 'success');
            loadAuditLog();
            loadStats();
          } catch (e) {}
        }

        function debounceLoad() {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(loadAuditLog, 300);
        }

        function toggleAuditAuto() {
          if (auditAutoInterval) {
            clearInterval(auditAutoInterval);
            auditAutoInterval = null;
          }
          if (document.getElementById('audit-auto').checked) {
            auditAutoInterval = setInterval(function () {
              loadAuditLog();
              loadStats();
            }, 5000);
          }
        }

        initAuditCharts();
        loadStats();
        loadAuditLog();
        toggleAuditAuto();
      </script>`}
    </div>
  )
}
