import { html } from 'hono/html'

export function WebcamPage() {
  return (
    <div>
      {/* Controls */}
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <div class="flex flex-wrap gap-3 items-end">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Camera Device</label>
            <select
              id="cam-device"
              class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Loading...</option>
            </select>
          </div>
          <button
            onclick="takePhoto()"
            class="bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Take Photo
          </button>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Duration (sec)</label>
            <input
              id="rec-duration"
              type="number"
              value="10"
              min="1"
              max="300"
              class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm w-24 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onclick="startRecording()"
            id="rec-start-btn"
            class="bg-green-600 hover:bg-green-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Start Recording
          </button>
          <button
            onclick="stopRecording()"
            id="rec-stop-btn"
            class="bg-red-600 hover:bg-red-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors hidden"
          >
            Stop Recording
          </button>
          <button
            onclick="downloadRecording()"
            id="rec-download-btn"
            class="bg-gray-700 hover:bg-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hidden"
          >
            Download Recording
          </button>
          <span id="rec-status" class="text-sm text-gray-400"></span>
        </div>
        <p class="text-xs text-gray-600 mt-3">
          Requires ffmpeg installed on the server. Webcam device paths may vary.
        </p>
      </div>

      {/* Preview Area */}
      <div class="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 class="text-sm font-semibold text-gray-400 uppercase mb-4">Preview</h3>
        <div id="cam-preview" class="flex items-center justify-center min-h-[400px] text-gray-500">
          Take a photo or start recording to see preview.
        </div>
      </div>

      {html`<script>
        var photoBlobUrl = null;

        async function loadDevices() {
          try {
            var data = await apiCall('/api/webcam/devices');
            var select = document.getElementById('cam-device');
            if (data.success && data.devices.length > 0) {
              select.innerHTML = data.devices.map(function (d) {
                return '<option value="' + escapeHtml(d.id) + '">' + escapeHtml(d.name) + ' (' + escapeHtml(d.id) + ')</option>';
              }).join('');
            } else {
              select.innerHTML = '<option value="/dev/video0">No cameras detected - /dev/video0</option>';
            }
          } catch (e) {
            document.getElementById('cam-device').innerHTML = '<option value="/dev/video0">/dev/video0</option>';
          }
        }

        async function checkRecordingStatus() {
          try {
            var data = await apiCall('/api/webcam/record/status');
            if (data.success) {
              var startBtn = document.getElementById('rec-start-btn');
              var stopBtn = document.getElementById('rec-stop-btn');
              var dlBtn = document.getElementById('rec-download-btn');
              var status = document.getElementById('rec-status');

              if (data.recording) {
                startBtn.classList.add('hidden');
                stopBtn.classList.remove('hidden');
                status.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-red-500 mr-1 animate-pulse"></span> Recording...';
              } else {
                startBtn.classList.remove('hidden');
                stopBtn.classList.add('hidden');
                if (data.path) dlBtn.classList.remove('hidden');
                status.textContent = '';
              }
            }
          } catch (e) {}
        }

        async function takePhoto() {
          var device = document.getElementById('cam-device').value;
          var preview = document.getElementById('cam-preview');
          preview.innerHTML = '<div class="spinner"></div> Capturing...';

          try {
            var resp = await apiCallRaw('/api/webcam/photo?device=' + encodeURIComponent(device));
            var blob = await resp.blob();

            if (photoBlobUrl) URL.revokeObjectURL(photoBlobUrl);
            photoBlobUrl = URL.createObjectURL(blob);

            preview.innerHTML =
              '<div class="text-center">' +
              '<img src="' + photoBlobUrl + '" class="max-w-full rounded-lg shadow-lg inline" alt="Webcam Photo" />' +
              '<div class="mt-3"><button onclick="downloadPhoto()" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors">Download Photo</button></div>' +
              '</div>';
            showNotification('Photo captured!', 'success');
          } catch (e) {
            preview.innerHTML = '<div class="text-red-400">Failed to capture photo. Make sure ffmpeg is installed and webcam is available.</div>';
          }
        }

        function downloadPhoto() {
          if (!photoBlobUrl) return;
          var a = document.createElement('a');
          a.href = photoBlobUrl;
          a.download = 'webcam-' + Date.now() + '.jpg';
          a.click();
        }

        async function startRecording() {
          var device = document.getElementById('cam-device').value;
          var duration = parseInt(document.getElementById('rec-duration').value) || 10;

          try {
            var data = await apiCall('/api/webcam/record/start', {
              method: 'POST',
              body: JSON.stringify({ device: device, duration: duration }),
            });
            if (data.success) {
              showNotification('Recording started (' + data.duration + 's)', 'success');
              checkRecordingStatus();
              // Poll for status
              var poll = setInterval(function () {
                checkRecordingStatus().then(function () {
                  var stopBtn = document.getElementById('rec-stop-btn');
                  if (stopBtn.classList.contains('hidden')) {
                    clearInterval(poll);
                    document.getElementById('rec-download-btn').classList.remove('hidden');
                    showNotification('Recording finished!', 'success');
                  }
                });
              }, 2000);
            }
          } catch (e) {}
        }

        async function stopRecording() {
          try {
            var data = await apiCall('/api/webcam/record/stop', { method: 'POST' });
            if (data.success) {
              showNotification('Recording stopped', 'success');
              document.getElementById('rec-start-btn').classList.remove('hidden');
              document.getElementById('rec-stop-btn').classList.add('hidden');
              document.getElementById('rec-download-btn').classList.remove('hidden');
              document.getElementById('rec-status').textContent = '';
            }
          } catch (e) {}
        }

        async function downloadRecording() {
          try {
            var resp = await apiCallRaw('/api/webcam/record/download');
            var blob = await resp.blob();
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'recording-' + Date.now() + '.mp4';
            a.click();
            URL.revokeObjectURL(url);
            showNotification('Download started', 'success');
          } catch (e) {
            showNotification('No recording available', 'error');
          }
        }

        loadDevices();
        checkRecordingStatus();
      </script>`}
    </div>
  )
}
