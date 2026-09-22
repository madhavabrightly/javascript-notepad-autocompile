# JavaScript Notepad

A minimal Notepad-style editor for JavaScript that runs your code with the embedded Node.js runtime — no system Node install required.

## Features

- Simple dark editor with line numbers.
- **Run** (Ctrl+Enter) executes the current file and streams stdout/stderr into the output pane.
- **Custom location** — choose any folder to save and run scripts from.
- **Embedded runner** — scripts run through Electron's bundled Node (`ELECTRON_RUN_AS_NODE`), so nothing external is needed.
- **Stdin support** — type into the box under the output pane and press Enter to feed a running script.
- **IDE-style bracket pairing** — typing `(`, `[`, `{`, `"`, `'`, or `` ` `` inserts the matching closer; wrapping a selection encloses it; typing a closer skips over the existing one; Backspace deletes an empty pair; Enter between a pair opens an indented block.

## Development

```bash
npm install --include=dev
npm start
```

> Note: if npm skips the Electron binary, run `node node_modules/electron/install.js` (or `npm install-scripts approve electron`).

## Build a single exe

```bash
npm run build
```

Produces `dist/JavaScript Notepad 1.0.0.exe` — a standalone portable executable (Electron + Node bundled inside).

## Release chunks

The built exe is ~84 MB and is committed to git as 20 MB chunks (`release/*.part-*`) to stay well under GitHub's file size limit.

Reassemble the exe:

```powershell
pwsh -File tools/reassemble.ps1
```

```bash
bash tools/reassemble.sh
```

Re-create the chunks from a fresh build:

```powershell
pwsh -File tools/split-exe.ps1
```
