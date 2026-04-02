import { html } from "hono/html";

export function FilesPage() {
  return (
    <div>
      {/* Navigation & Upload */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <div class="flex flex-wrap gap-3 items-end mb-4">
          <div class="flex-1 min-w-[200px]">
            <label class="block text-sm text-gray-400 mb-1">Path</label>
            <div class="flex gap-2">
              <input
                id="file-path"
                type="text"
                class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 font-mono"
                value="/"
              />
              <button
                onclick="browsePath()"
                class="bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Go
              </button>
              <button
                onclick="goUp()"
                class="bg-gray-700 hover:bg-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Up
              </button>
            </div>
          </div>
        </div>

        {/* Upload & Copy */}
        <div class="flex flex-wrap gap-3 items-end">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Upload File</label>
            <div class="flex gap-2">
              <input
                id="upload-file"
                type="file"
                class="text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600"
              />
              <input
                id="upload-dest"
                type="text"
                class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm w-48 focus:outline-none focus:border-blue-500"
                placeholder="Destination path"
              />
              <button
                onclick="uploadFile()"
                class="bg-green-600 hover:bg-green-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Upload
              </button>
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">
              Copy File (on server)
            </label>
            <div class="flex gap-2">
              <input
                id="copy-src"
                type="text"
                class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm w-40 focus:outline-none focus:border-blue-500"
                placeholder="Source"
              />
              <input
                id="copy-dest"
                type="text"
                class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm w-40 focus:outline-none focus:border-blue-500"
                placeholder="Destination"
              />
              <button
                onclick="copyFile()"
                class="bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* File List */}
      <div class="bg-gray-900 rounded-xl border border-gray-800">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-xs text-gray-500 uppercase border-b border-gray-800">
                <th class="px-6 py-3">Name</th>
                <th class="px-6 py-3">Size</th>
                <th class="px-6 py-3">Modified</th>
                <th class="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="file-list" class="text-sm">
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
        var currentPath = "/";

        function browsePath(path) {
          if (path) {
            document.getElementById("file-path").value = path;
          }
          currentPath =
            document.getElementById("file-path").value.trim() || "/";
          loadFiles(currentPath);
        }

        function goUp() {
          var parts = currentPath.split("/").filter(Boolean);
          parts.pop();
          currentPath = "/" + parts.join("/");
          document.getElementById("file-path").value = currentPath;
          loadFiles(currentPath);
        }

        async function loadFiles(dirPath) {
          var tbody = document.getElementById("file-list");
          tbody.innerHTML =
            '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500"><div class="spinner"></div></td></tr>';
          try {
            var data = await apiCall(
              "/api/files/browse?path=" + encodeURIComponent(dirPath),
            );
            if (data.success) {
              currentPath = data.path;
              document.getElementById("file-path").value = currentPath;

              if (data.items.length === 0) {
                tbody.innerHTML =
                  '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">Empty directory</td></tr>';
                return;
              }

              tbody.innerHTML = data.items
                .map(function (item) {
                  var icon = item.isDirectory ? "&#128193;" : "&#128196;";
                  var nameHtml = item.isDirectory
                    ? '<a href="javascript:void(0)" onclick="browsePath(\\'' +
                      escapeHtml(item.path).replace(/'/g, "\\\\'") +
                      '\\')" class="text-blue-400 hover:text-blue-300">' +
                      icon +
                      " " +
                      escapeHtml(item.name) +
                      "</a>"
                    : "<span>" + icon + " " + escapeHtml(item.name) + "</span>";
                  var sizeStr = item.isDirectory ? "-" : formatBytes(item.size);
                  var modStr = item.modified
                    ? new Date(item.modified).toLocaleString()
                    : "-";

                  return (
                    '<tr class="border-b border-gray-800/50 hover:bg-gray-800/50">' +
                    '<td class="px-6 py-2.5">' +
                    nameHtml +
                    "</td>" +
                    '<td class="px-6 py-2.5 text-gray-400">' +
                    sizeStr +
                    "</td>" +
                    '<td class="px-6 py-2.5 text-gray-400 text-xs">' +
                    modStr +
                    "</td>" +
                    '<td class="px-6 py-2.5 text-right">' +
                    (item.isDirectory
                      ? ""
                      : "<button onclick=\\"downloadFile('" +
                        escapeHtml(item.path).replace(/'/g, "\\\\'") +
                        '\\')" class="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1 rounded text-xs transition-colors">Download</button>') +
                    "</td></tr>"
                  );
                })
                .join("");
            }
          } catch (e) {
            tbody.innerHTML =
              '<tr><td colspan="4" class="px-6 py-8 text-center text-red-400">Failed to load directory</td></tr>';
          }
        }

        async function downloadFile(filePath) {
          try {
            var resp = await apiCallRaw(
              "/api/files/download?path=" + encodeURIComponent(filePath),
            );
            var blob = await resp.blob();
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = filePath.split("/").pop() || "download";
            a.click();
            URL.revokeObjectURL(url);
            showNotification("Download started", "success");
          } catch (e) {
            showNotification("Download failed", "error");
          }
        }

        async function uploadFile() {
          var fileInput = document.getElementById("upload-file");
          var dest = document.getElementById("upload-dest").value.trim();
          if (!fileInput.files[0])
            return showNotification("Select a file", "error");
          if (!dest) return showNotification("Enter destination path", "error");

          var formData = new FormData();
          formData.append("file", fileInput.files[0]);
          formData.append("destination", dest);

          try {
            var resp = await fetch(API_URL + "/api/files/upload", {
              method: "POST",
              headers: { Authorization: "Bearer " + AUTH_TOKEN },
              body: formData,
            });
            var data = await resp.json();
            if (data.success) {
              showNotification("File uploaded!", "success");
              browsePath();
            } else {
              showNotification(data.error || "Upload failed", "error");
            }
          } catch (e) {
            showNotification("Upload failed: " + e.message, "error");
          }
        }

        async function copyFile() {
          var src = document.getElementById("copy-src").value.trim();
          var dest = document.getElementById("copy-dest").value.trim();
          if (!src || !dest)
            return showNotification("Enter source and destination", "error");

          try {
            var data = await apiCall("/api/files/copy", {
              method: "POST",
              body: JSON.stringify({ source: src, destination: dest }),
            });
            if (data.success) {
              showNotification("File copied!", "success");
              browsePath();
            }
          } catch (e) {}
        }

        // Handle Enter key in path input
        document
          .getElementById("file-path")
          .addEventListener("keydown", function (e) {
            if (e.key === "Enter") browsePath();
          });

        browsePath("/");
      </script>`}
    </div>
  );
}
