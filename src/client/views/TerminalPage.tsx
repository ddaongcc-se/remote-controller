import { html } from 'hono/html'

export function TerminalPage() {
  return (
    <div>
      {/* Shell Info */}
      <div class="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-4">
        <div class="flex items-center gap-4">
          <span id="shell-info" class="text-sm text-gray-400">Connecting...</span>
          <div class="flex-1"></div>
          <button
            onclick="clearTerminal()"
            class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div class="bg-gray-950 rounded-xl border border-gray-800 font-mono text-sm">
        <div
          id="terminal-output"
          class="p-4 max-h-[60vh] overflow-auto whitespace-pre-wrap text-gray-300 min-h-[300px]"
        >
          <span class="text-green-400">Welcome to Remote Terminal.</span>{'\n'}
          <span class="text-gray-500">Type commands below. Output will appear here.</span>{'\n\n'}
        </div>
        <div class="border-t border-gray-800 flex items-center">
          <span id="prompt-label" class="text-green-400 pl-4 shrink-0">$ </span>
          <input
            id="cmd-input"
            type="text"
            class="flex-1 bg-transparent border-none py-3 px-2 text-gray-100 text-sm font-mono focus:outline-none"
            placeholder="Enter command..."
            autocomplete="off"
            spellcheck="false"
          />
          <button
            onclick="executeCommand()"
            class="bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-medium transition-colors"
          >
            Run
          </button>
          <select
            id="cmd-timeout"
            class="bg-gray-800 border-l border-gray-700 py-3 px-3 text-xs text-gray-400 focus:outline-none"
          >
            <option value="5000">5s</option>
            <option value="15000" selected>15s</option>
            <option value="30000">30s</option>
            <option value="60000">60s</option>
          </select>
        </div>
      </div>

      {/* Command History */}
      <div class="bg-gray-900 rounded-xl p-4 border border-gray-800 mt-4">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-xs text-gray-500 uppercase font-semibold">Saved Commands</h3>
        </div>
        <div class="flex flex-wrap gap-2" id="saved-commands">
          <button onclick="runSaved('whoami')" class="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-xs text-gray-300 transition-colors">whoami</button>
          <button onclick="runSaved('uname -a')" class="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-xs text-gray-300 transition-colors">uname -a</button>
          <button onclick="runSaved('df -h')" class="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-xs text-gray-300 transition-colors">df -h</button>
          <button onclick="runSaved('free -h')" class="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-xs text-gray-300 transition-colors">free -h</button>
          <button onclick="runSaved('ip addr')" class="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-xs text-gray-300 transition-colors">ip addr</button>
          <button onclick="runSaved('uptime')" class="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-xs text-gray-300 transition-colors">uptime</button>
          <button onclick="runSaved('ps aux --sort=-%cpu | head -20')" class="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-xs text-gray-300 transition-colors">top CPU</button>
          <button onclick="runSaved('netstat -tlnp 2>/dev/null || ss -tlnp')" class="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-xs text-gray-300 transition-colors">open ports</button>
          <button onclick="runSaved('cat /etc/os-release')" class="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-xs text-gray-300 transition-colors">OS info</button>
          <button onclick="runSaved('last -10')" class="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-xs text-gray-300 transition-colors">last logins</button>
        </div>
      </div>

      {html`<script>
        var cmdHistory = [];
        var historyIndex = -1;

        async function loadShellInfo() {
          try {
            var data = await apiCall('/api/terminal/info');
            if (data.success) {
              document.getElementById('shell-info').innerHTML =
                '<span class="text-green-400 mr-2">●</span>' +
                escapeHtml(data.user) + '@' + escapeHtml(data.platform) +
                ' <span class="text-gray-600">|</span> ' +
                escapeHtml(data.shell) + ' <span class="text-gray-600">|</span> ' +
                escapeHtml(data.cwd);
              document.getElementById('prompt-label').textContent =
                data.user + '@' + data.platform + '$ ';
            }
          } catch (e) {
            document.getElementById('shell-info').innerHTML =
              '<span class="text-red-400 mr-2">●</span> Not connected';
          }
        }

        async function executeCommand() {
          var input = document.getElementById('cmd-input');
          var cmd = input.value.trim();
          if (!cmd) return;

          var timeout = parseInt(document.getElementById('cmd-timeout').value);
          var output = document.getElementById('terminal-output');

          // Add to history
          cmdHistory.push(cmd);
          historyIndex = cmdHistory.length;
          input.value = '';

          // Show command in terminal
          var prompt = document.getElementById('prompt-label').textContent;
          output.innerHTML += '<span class="text-green-400">' + escapeHtml(prompt) + '</span>' +
            '<span class="text-white">' + escapeHtml(cmd) + '</span>\\n';
          output.innerHTML += '<span class="text-gray-600 text-xs"> Running...</span>\\n';
          output.scrollTop = output.scrollHeight;

          try {
            var data = await apiCall('/api/terminal/exec', {
              method: 'POST',
              body: JSON.stringify({ command: cmd, timeout: timeout }),
            });

            // Remove "Running..." indicator
            var html = output.innerHTML;
            html = html.replace(/<span class="text-gray-600 text-xs"> Running...<\\/span>\\n/, '');
            output.innerHTML = html;

            if (data.stdout) {
              output.innerHTML += '<span class="text-gray-300">' + escapeHtml(data.stdout) + '</span>';
              if (!data.stdout.endsWith('\\n')) output.innerHTML += '\\n';
            }
            if (data.stderr) {
              output.innerHTML += '<span class="text-red-400">' + escapeHtml(data.stderr) + '</span>';
              if (!data.stderr.endsWith('\\n')) output.innerHTML += '\\n';
            }
            if (data.exitCode !== 0) {
              output.innerHTML += '<span class="text-yellow-500 text-xs">Exit code: ' + data.exitCode + '</span>\\n';
            }
            output.innerHTML += '\\n';
          } catch (e) {
            var h = output.innerHTML;
            h = h.replace(/<span class="text-gray-600 text-xs"> Running...<\\/span>\\n/, '');
            output.innerHTML = h;
            output.innerHTML += '<span class="text-red-400">Error: ' + escapeHtml(e.message) + '</span>\\n\\n';
          }

          output.scrollTop = output.scrollHeight;
        }

        function clearTerminal() {
          document.getElementById('terminal-output').innerHTML = '';
        }

        function runSaved(cmd) {
          document.getElementById('cmd-input').value = cmd;
          executeCommand();
        }

        // Keyboard navigation
        document.getElementById('cmd-input').addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            executeCommand();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex > 0) {
              historyIndex--;
              this.value = cmdHistory[historyIndex];
            }
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex < cmdHistory.length - 1) {
              historyIndex++;
              this.value = cmdHistory[historyIndex];
            } else {
              historyIndex = cmdHistory.length;
              this.value = '';
            }
          }
        });

        loadShellInfo();
        document.getElementById('cmd-input').focus();
      </script>`}
    </div>
  )
}
