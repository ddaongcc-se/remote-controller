import { html } from 'hono/html'

export function ClipboardPage() {
  return (
    <div>
      {/* Current Clipboard */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-sm font-semibold text-gray-400 uppercase">Current Clipboard Content</h3>
          <div class="flex gap-2">
            <button onclick="readClipboard()" class="text-sm text-blue-400 hover:text-blue-300 transition-colors">Read</button>
            <button onclick="snapshotClipboard()" class="text-sm text-green-400 hover:text-green-300 transition-colors">Track Change</button>
          </div>
        </div>
        <div
          id="clipboard-content"
          class="bg-gray-950 rounded-lg p-4 min-h-[100px] max-h-[300px] overflow-auto text-sm text-gray-300 whitespace-pre-wrap font-mono border border-gray-800"
        >
          Click "Read" to fetch the clipboard content from the remote machine.
        </div>
        <div class="flex items-center gap-2 mt-3">
          <span class="text-xs text-gray-500" id="clip-chars">0 characters</span>
          <button
            onclick="copyToLocal()"
            class="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-gray-300 transition-colors"
          >
            Copy to Local Clipboard
          </button>
        </div>
      </div>

      {/* Write to Clipboard */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <h3 class="text-sm font-semibold text-gray-400 uppercase mb-4">Write to Remote Clipboard</h3>
        <textarea
          id="clip-write"
          class="w-full bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-300 font-mono focus:outline-none focus:border-blue-500 min-h-[100px] resize-y"
          placeholder="Type text here to send to the remote clipboard..."
        ></textarea>
        <div class="flex gap-3 mt-3">
          <button
            onclick="writeClipboard()"
            class="bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Send to Remote Clipboard
          </button>
          <button
            onclick="clearWrite()"
            class="bg-gray-700 hover:bg-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Auto-monitor */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <div class="flex items-center gap-4 mb-4">
          <h3 class="text-sm font-semibold text-gray-400 uppercase">Clipboard Monitor</h3>
          <label class="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" id="clip-auto" onchange="toggleClipMonitor()" />
            Auto-track every 3s
          </label>
          <span id="clip-monitor-status" class="text-xs text-gray-500"></span>
        </div>
        <p class="text-xs text-gray-600 mb-4">
          Automatically detects clipboard changes and records them below.
        </p>
      </div>

      {/* Clipboard History */}
      <div class="bg-gray-900 rounded-xl border border-gray-800">
        <div class="flex justify-between items-center p-6 pb-3">
          <h3 class="text-sm font-semibold text-gray-400 uppercase">Clipboard History</h3>
          <button onclick="loadHistory()" class="text-sm text-blue-400 hover:text-blue-300 transition-colors">Refresh</button>
        </div>
        <div id="clip-history" class="p-6 pt-2 space-y-3">
          <div class="text-sm text-gray-500">No history yet. Read or track clipboard changes.</div>
        </div>
      </div>

      {html`<script>
        var currentClipText = '';
        var clipMonitorInterval = null;

        async function readClipboard() {
          try {
            var data = await apiCall('/api/clipboard/read');
            if (data.success) {
              currentClipText = data.text;
              document.getElementById('clipboard-content').textContent = data.text || '(empty)';
              document.getElementById('clip-chars').textContent = (data.text || '').length + ' characters';
              showNotification('Clipboard read!', 'success');
            }
          } catch (e) {}
        }

        async function snapshotClipboard() {
          try {
            var data = await apiCall('/api/clipboard/snapshot', { method: 'POST' });
            if (data.success) {
              currentClipText = data.text;
              document.getElementById('clipboard-content').textContent = data.text || '(empty)';
              document.getElementById('clip-chars').textContent = (data.text || '').length + ' characters';
              loadHistory();
            }
          } catch (e) {}
        }

        async function writeClipboard() {
          var text = document.getElementById('clip-write').value;
          if (!text) return showNotification('Enter text to write', 'error');
          try {
            var data = await apiCall('/api/clipboard/write', {
              method: 'POST',
              body: JSON.stringify({ text: text }),
            });
            if (data.success) {
              showNotification('Clipboard updated on remote machine!', 'success');
              document.getElementById('clip-write').value = '';
            }
          } catch (e) {}
        }

        function copyToLocal() {
          if (!currentClipText) return showNotification('Nothing to copy', 'error');
          navigator.clipboard.writeText(currentClipText).then(function () {
            showNotification('Copied to your local clipboard!', 'success');
          }).catch(function () {
            showNotification('Failed to copy (browser permission required)', 'error');
          });
        }

        function clearWrite() {
          document.getElementById('clip-write').value = '';
        }

        async function loadHistory() {
          try {
            var data = await apiCall('/api/clipboard/history');
            var container = document.getElementById('clip-history');
            if (data.success && data.history.length > 0) {
              container.innerHTML = data.history.slice().reverse().map(function (entry, i) {
                var preview = entry.text.length > 200 ? entry.text.substring(0, 200) + '...' : entry.text;
                return '<div class="bg-gray-950 rounded-lg p-4 border border-gray-800">' +
                  '<div class="flex justify-between items-center mb-2">' +
                  '<span class="text-xs text-blue-400">#' + (data.history.length - i) + '</span>' +
                  '<span class="text-xs text-gray-600">' + new Date(entry.timestamp).toLocaleString() + '</span>' +
                  '</div>' +
                  '<pre class="text-sm text-gray-300 whitespace-pre-wrap break-all">' + escapeHtml(preview) + '</pre>' +
                  '<div class="mt-2 text-xs text-gray-600">' + entry.text.length + ' characters</div>' +
                  '</div>';
              }).join('');
            } else {
              container.innerHTML = '<div class="text-sm text-gray-500">No history yet.</div>';
            }
          } catch (e) {}
        }

        function toggleClipMonitor() {
          if (clipMonitorInterval) {
            clearInterval(clipMonitorInterval);
            clipMonitorInterval = null;
          }
          var status = document.getElementById('clip-monitor-status');
          if (document.getElementById('clip-auto').checked) {
            clipMonitorInterval = setInterval(function () {
              snapshotClipboard();
            }, 3000);
            status.textContent = 'Monitoring...';
            status.className = 'text-xs text-green-400';
          } else {
            status.textContent = 'Stopped';
            status.className = 'text-xs text-gray-500';
          }
        }

        readClipboard();
        loadHistory();
      </script>`}
    </div>
  )
}
