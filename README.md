## Remote PC Control — Quick start

This repository contains a TypeScript client/server application for remote PC control. This README explains how to install required system tools (Node.js, ffmpeg, screenshot utilities), install the project packages, and run the app (development and production). It includes OS-specific install tips for macOS, Windows, and Linux.

### What you'll need
- Node.js (recommended: LTS — Node 18 or later)
- npm (bundled with Node) or yarn
- ffmpeg (required for some media operations)
- A screenshot utility (see OS-specific notes below)
- On macOS: you may need to grant Camera / Microphone / Screen Recording permissions

### Check the repository scripts

This project defines npm scripts in `package.json`:

- `dev:server` — run the server in watch mode
- `dev:client` — run the client in watch mode
- `start:server` — run the server once
- `start:client` — run the client once

Use the dev scripts during development (run both in separate terminals). Use the start scripts for a single-run start.

## 1) Install Node.js

Recommendation: use the LTS release (Node 18+ or Node 20 LTS).

macOS
- Using Homebrew (recommended):

```bash
brew update
brew install node
```

- Or install nvm (recommended when switching versions):

```bash
brew install nvm
# follow nvm post-install instructions, then
nvm install --lts
```

Windows
- Download the installer from https://nodejs.org and run the .msi
- Or use nvm-windows: https://github.com/coreybutler/nvm-windows

Linux (Debian/Ubuntu)
- Using NodeSource (example for Node 20):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

- Or use nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
# restart shell, then
nvm install --lts
```

Verify:

```bash
node -v
npm -v
```

## 2) Install project dependencies

From the project root (where `package.json` is located):

```bash
npm install
# or, if you use yarn:
yarn install
```

This will install `tsx` and other dependencies used to run TypeScript directly.

## 3) System utilities and native requirements

ffmpeg
- macOS (Homebrew):

```bash
brew install ffmpeg
```

- Ubuntu / Debian:

```bash
sudo apt update
sudo apt install -y ffmpeg
```

- Windows:
  - If you use Chocolatey: `choco install ffmpeg`
  - Or download a static build from https://ffmpeg.org/download.html and add the `bin` folder to your PATH.

Screenshot tools / utilities
- macOS: the system has built-in screenshot utilities (Command-Shift-5, or CLI `screencapture`). If the app uses screen capture APIs, grant Screen Recording permission in System Settings → Privacy & Security → Screen Recording.

- Linux: common CLI tools include `scrot` or ImageMagick's `import` (for X11) — install with:

```bash
sudo apt install -y scrot    # basic screenshot tool
sudo apt install -y imagemagick    # provides `import`
```

- Windows: Windows has built-in Snipping Tool and PrintScreen. For CLI-based captures you can install ImageMagick or use 3rd-party utilities (e.g. nircmd). If the app uses the webcam or system APIs, ensure appropriate permissions are granted.

macOS permissions
- If you run server or client functionality that accesses the camera, microphone, or screen, macOS will require you to grant permissions in System Settings → Privacy & Security. If running from Terminal, grant Terminal (or the Terminal app you're using) the necessary permissions.

## 4) Running the app

Development (recommended)
- Open two terminals and run:

```bash
# Terminal 1 — server in watch mode
npm run dev:server

# Terminal 2 — client in watch mode
npm run dev:client
```

Production / single run

```bash
npm run start:server
npm run start:client
```

The server entrypoint is `src/server/index.ts` and the client entrypoint is `src/client/index.tsx` (these are run via `tsx` so TypeScript is executed directly).

## 5) Verify tools are available

```bash
node -v
npm -v
ffmpeg -version
# macOS example for screencapture
screencapture -x test-shot.png && ls -l test-shot.png
```

## Troubleshooting
- If a script like `npm run dev:server` fails with a module error, run `npm install` again and check the installed `node_modules`.
- On macOS, if you see permission errors for camera/screen, open System Settings → Privacy & Security and allow Terminal (or your node runtime) to access Camera / Microphone / Screen Recording.
- If ffmpeg is not found on Windows, ensure its `bin` directory is added to your PATH and restart your terminal.

## Notes & next steps
- This README covers basic environment setup. If you want, I can add a tiny `Makefile` or `scripts/dev.sh` to launch both dev scripts in parallel, or add a `docker-compose` for an isolated setup.

---

If you'd like, I can also add automated checks to the repo (a small script to verify ffmpeg, Node version, and run the dev scripts) — tell me which OS you primarily use and I can add it.
