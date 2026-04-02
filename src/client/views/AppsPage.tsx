import { html } from "hono/html";

export function AppsPage() {
  return (
    <div>
      {/* Start App */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <h3 class="text-sm font-semibold text-gray-400 uppercase mb-3">
          Start Application
        </h3>
        <div class="flex gap-3">
          <input
            id="app-path"
            type="text"
            class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Application path (e.g., /usr/bin/firefox, notepad.exe)"
          />
          <button
            onclick="startApp()"
            class="bg-green-600 hover:bg-green-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            Start
          </button>
        </div>
      </div>

      {/* App List */}
      <div class="bg-gray-900 rounded-xl border border-gray-800">
        <div class="flex justify-between items-center p-6 pb-4">
          <h3 class="text-sm font-semibold text-gray-400 uppercase">
            Running Applications
          </h3>
          <button
            onclick="loadApps()"
            class="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-xs text-gray-500 uppercase border-b border-gray-800">
                <th class="px-6 py-3">PID</th>
                <th class="px-6 py-3">Name</th>
                <th class="px-6 py-3">Title</th>
                <th class="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="app-list" class="text-sm">
              <tr>
                <td colspan={4} class="px-6 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {html`<script>
        async function loadApps() {
          var tbody = document.getElementById("app-list");
          tbody.innerHTML =
            '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500"><div class="spinner"></div></td></tr>';
          try {
            var data = await apiCall("/api/apps/list");
            if (data.success && data.apps.length > 0) {
              tbody.innerHTML = data.apps
                .map(function (app) {
                  return (
                    '<tr class="border-b border-gray-800 hover:bg-gray-800/50">' +
                    '<td class="px-6 py-3 font-mono text-gray-400">' +
                    app.pid +
                    "</td>" +
                    '<td class="px-6 py-3 text-white">' +
                    escapeHtml(app.name) +
                    "</td>" +
                    '<td class="px-6 py-3 text-gray-400">' +
                    escapeHtml(app.title || "-") +
                    "</td>" +
                    '<td class="px-6 py-3 text-right">' +
                    '<button onclick="stopApp(' +
                    app.pid +
                    ')" class="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded text-xs font-medium transition-colors">Stop</button>' +
                    "</td></tr>"
                  );
                })
                .join("");
            } else {
              tbody.innerHTML =
                '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">No applications found</td></tr>';
            }
          } catch (e) {
            tbody.innerHTML =
              '<tr><td colspan="4" class="px-6 py-8 text-center text-red-400">Failed to load</td></tr>';
          }
        }

        async function startApp() {
          var appPath = document.getElementById("app-path").value.trim();
          if (!appPath)
            return showNotification("Enter an application path", "error");
          try {
            var data = await apiCall("/api/apps/start", {
              method: "POST",
              body: JSON.stringify({ appPath: appPath }),
            });
            if (data.success) {
              showNotification(
                "App started (PID: " + data.pid + ")",
                "success",
              );
              document.getElementById("app-path").value = "";
              setTimeout(loadApps, 1000);
            }
          } catch (e) {}
        }

        async function stopApp(pid) {
          if (!confirm("Stop process " + pid + "?")) return;
          try {
            var data = await apiCall("/api/apps/stop", {
              method: "POST",
              body: JSON.stringify({ pid: pid }),
            });
            if (data.success) {
              showNotification("Stop signal sent", "success");
              setTimeout(loadApps, 500);
            }
          } catch (e) {}
        }

        loadApps();
      </script>`}
    </div>
  );
}
