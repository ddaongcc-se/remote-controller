import { html } from "hono/html";

export function ProcessesPage() {
  return (
    <div>
      {/* Controls */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <div class="flex flex-wrap gap-3 items-center">
          <input
            id="proc-search"
            type="text"
            class="flex-1 min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Search processes..."
            oninput="filterProcesses()"
          />
          <div class="flex gap-2">
            <input
              id="proc-cmd"
              type="text"
              class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 w-48"
              placeholder="Command to start"
            />
            <button
              onclick="startProcess()"
              class="bg-green-600 hover:bg-green-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Start
            </button>
          </div>
          <button
            onclick="loadProcesses()"
            class="bg-gray-700 hover:bg-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Process List */}
      <div class="bg-gray-900 rounded-xl border border-gray-800">
        <div
          class="overflow-x-auto"
          style="max-height: 70vh; overflow-y: auto;"
        >
          <table class="w-full">
            <thead class="sticky top-0 bg-gray-900">
              <tr class="text-left text-xs text-gray-500 uppercase border-b border-gray-800">
                <th
                  class="px-6 py-3 cursor-pointer hover:text-gray-300"
                  onclick="sortBy('pid')"
                >
                  PID
                </th>
                <th
                  class="px-6 py-3 cursor-pointer hover:text-gray-300"
                  onclick="sortBy('name')"
                >
                  Name
                </th>
                <th
                  class="px-6 py-3 cursor-pointer hover:text-gray-300"
                  onclick="sortBy('cpu')"
                >
                  CPU %
                </th>
                <th
                  class="px-6 py-3 cursor-pointer hover:text-gray-300"
                  onclick="sortBy('mem')"
                >
                  Memory %
                </th>
                <th class="px-6 py-3">State</th>
                <th class="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="proc-list" class="text-sm">
              <tr>
                <td colspan={6} class="px-6 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="px-6 py-3 border-t border-gray-800 text-xs text-gray-500">
          <span id="proc-count">0</span> processes
        </div>
      </div>

      {html`<script>
        var allProcesses = [];
        var currentSort = { key: "cpu", desc: true };

        async function loadProcesses() {
          var tbody = document.getElementById("proc-list");
          tbody.innerHTML =
            '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500"><div class="spinner"></div></td></tr>';
          try {
            var data = await apiCall("/api/processes/list");
            if (data.success) {
              allProcesses = data.processes;
              renderProcesses();
            }
          } catch (e) {
            tbody.innerHTML =
              '<tr><td colspan="6" class="px-6 py-8 text-center text-red-400">Failed to load</td></tr>';
          }
        }

        function renderProcesses() {
          var search = document
            .getElementById("proc-search")
            .value.toLowerCase();
          var filtered = allProcesses.filter(function (p) {
            return (
              !search ||
              p.name.toLowerCase().indexOf(search) !== -1 ||
              String(p.pid).indexOf(search) !== -1
            );
          });

          filtered.sort(function (a, b) {
            var aVal = a[currentSort.key];
            var bVal = b[currentSort.key];
            if (typeof aVal === "string") {
              return currentSort.desc
                ? bVal.localeCompare(aVal)
                : aVal.localeCompare(bVal);
            }
            return currentSort.desc ? bVal - aVal : aVal - bVal;
          });

          document.getElementById("proc-count").textContent = filtered.length;

          var tbody = document.getElementById("proc-list");
          if (filtered.length === 0) {
            tbody.innerHTML =
              '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No processes match</td></tr>';
            return;
          }

          tbody.innerHTML = filtered
            .map(function (p) {
              var cpuColor =
                p.cpu > 50
                  ? "text-red-400"
                  : p.cpu > 10
                    ? "text-yellow-400"
                    : "text-gray-300";
              var memColor =
                p.mem > 50
                  ? "text-red-400"
                  : p.mem > 10
                    ? "text-yellow-400"
                    : "text-gray-300";
              return (
                '<tr class="border-b border-gray-800/50 hover:bg-gray-800/50">' +
                '<td class="px-6 py-2.5 font-mono text-gray-400">' +
                p.pid +
                "</td>" +
                '<td class="px-6 py-2.5 text-white">' +
                escapeHtml(p.name) +
                "</td>" +
                '<td class="px-6 py-2.5 ' +
                cpuColor +
                '">' +
                p.cpu +
                "%</td>" +
                '<td class="px-6 py-2.5 ' +
                memColor +
                '">' +
                p.mem +
                "%</td>" +
                '<td class="px-6 py-2.5"><span class="px-2 py-0.5 rounded text-xs ' +
                (p.state === "running"
                  ? "bg-green-900/50 text-green-400"
                  : "bg-gray-800 text-gray-400") +
                '">' +
                escapeHtml(p.state) +
                "</span></td>" +
                '<td class="px-6 py-2.5 text-right space-x-2">' +
                '<button onclick="killProcess(' +
                p.pid +
                ', false)" class="bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600 hover:text-white px-2.5 py-1 rounded text-xs transition-colors">Stop</button>' +
                '<button onclick="killProcess(' +
                p.pid +
                ', true)" class="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-2.5 py-1 rounded text-xs transition-colors">Kill</button>' +
                "</td></tr>"
              );
            })
            .join("");
        }

        function filterProcesses() {
          renderProcesses();
        }

        function sortBy(key) {
          if (currentSort.key === key) {
            currentSort.desc = !currentSort.desc;
          } else {
            currentSort = { key: key, desc: true };
          }
          renderProcesses();
        }

        async function startProcess() {
          var cmd = document.getElementById("proc-cmd").value.trim();
          if (!cmd) return showNotification("Enter a command", "error");
          try {
            var data = await apiCall("/api/processes/start", {
              method: "POST",
              body: JSON.stringify({ command: cmd }),
            });
            if (data.success) {
              showNotification(
                "Process started (PID: " + data.pid + ")",
                "success",
              );
              document.getElementById("proc-cmd").value = "";
              setTimeout(loadProcesses, 1000);
            }
          } catch (e) {}
        }

        async function killProcess(pid, force) {
          var msg = force
            ? "Force kill process " + pid + "?"
            : "Stop process " + pid + "?";
          if (!confirm(msg)) return;
          try {
            var data = await apiCall("/api/processes/kill", {
              method: "POST",
              body: JSON.stringify({ pid: pid, force: force }),
            });
            if (data.success) {
              showNotification(data.message, "success");
              setTimeout(loadProcesses, 500);
            }
          } catch (e) {}
        }

        loadProcesses();
      </script>`}
    </div>
  );
}
