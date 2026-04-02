import { html } from 'hono/html'

export function ScreenshotPage() {
  return (
    <div>
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <div class="flex gap-3 items-center">
          <button
            onclick="captureScreenshot()"
            id="capture-btn"
            class="bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Capture Screenshot
          </button>
          <button
            onclick="downloadScreenshot()"
            id="download-btn"
            class="bg-gray-700 hover:bg-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors hidden"
          >
            Download
          </button>
          <span id="capture-status" class="text-sm text-gray-400"></span>
        </div>
      </div>

      <div class="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div id="screenshot-area" class="flex items-center justify-center min-h-[400px] text-gray-500">
          Click "Capture Screenshot" to take a screenshot of the remote screen.
        </div>
      </div>

      {html`<script>
        var currentBlobUrl = null;

        async function captureScreenshot() {
          var btn = document.getElementById('capture-btn');
          var status = document.getElementById('capture-status');
          var area = document.getElementById('screenshot-area');
          var dlBtn = document.getElementById('download-btn');

          btn.disabled = true;
          btn.textContent = 'Capturing...';
          status.innerHTML = '<div class="spinner"></div>';

          try {
            var resp = await apiCallRaw('/api/screenshot/capture');
            var blob = await resp.blob();

            if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
            currentBlobUrl = URL.createObjectURL(blob);

            area.innerHTML = '<img src="' + currentBlobUrl + '" class="max-w-full rounded-lg shadow-lg" alt="Screenshot" />';
            dlBtn.classList.remove('hidden');
            status.textContent = 'Captured at ' + new Date().toLocaleTimeString();
            showNotification('Screenshot captured!', 'success');
          } catch (e) {
            area.innerHTML = '<div class="text-red-400">Failed to capture screenshot. Make sure a screenshot tool is installed (scrot, gnome-screenshot, etc.)</div>';
            status.textContent = '';
          }

          btn.disabled = false;
          btn.textContent = 'Capture Screenshot';
        }

        function downloadScreenshot() {
          if (!currentBlobUrl) return;
          var a = document.createElement('a');
          a.href = currentBlobUrl;
          a.download = 'screenshot-' + Date.now() + '.png';
          a.click();
        }
      </script>`}
    </div>
  )
}
