const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

let window;
let directory;
let activeRun;
let busy = false;

function send(channel, data) {
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, data);
  }
}

function stopRun() {
  const run = activeRun;
  if (!run) return false;

  activeRun = null;
  run.child.kill();
  send("runner:state", "Stopped");
  return true;
}

function destination(name) {
  if (
    typeof name !== "string" ||
    name !== path.basename(name) ||
    /[<>:"/\\|?*\x00-\x1f]/.test(name) ||
    !/\.(js|mjs|cjs)$/i.test(name)
  ) {
    throw new Error("Enter a valid .js, .mjs, or .cjs filename.");
  }

  return path.join(directory, name);
}

async function saveFile(data) {
  if (typeof data?.code !== "string") {
    throw new Error("Invalid JavaScript source.");
  }

  const file = destination(data.name);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(file, data.code, "utf8");
  return file;
}

function launch(file) {
  const child = spawn(process.execPath, [file], {
    cwd: path.dirname(file),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      FORCE_COLOR: "0"
    },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true
  });

  const run = { child };
  activeRun = run;

  send("runner:state", "Running");

  child.stdout.on("data", chunk => {
    if (activeRun === run) {
      send("runner:output", { text: chunk.toString(), error: false });
    }
  });

  child.stderr.on("data", chunk => {
    if (activeRun === run) {
      send("runner:output", { text: chunk.toString(), error: true });
    }
  });

  child.stdin.on("error", () => {});

  child.on("error", error => {
    if (activeRun !== run) return;

    activeRun = null;
    send("runner:output", { text: `${error.message}\n`, error: true });
    send("runner:state", "Failed");
  });

  child.on("close", (code, signal) => {
    if (activeRun !== run) return;

    activeRun = null;
    send("runner:state", signal ? `Stopped: ${signal}` : `Exited: ${code}`);
  });
}

ipcMain.handle("app:info", () => ({
  directory,
  runtime: `Embedded Node.js ${process.versions.node}`
}));

ipcMain.handle("file:location", async () => {
  const result = await dialog.showOpenDialog(window, {
    title: "Choose script location",
    defaultPath: directory,
    properties: ["openDirectory", "createDirectory"]
  });

  if (!result.canceled) {
    directory = result.filePaths[0];
  }

  return directory;
});

ipcMain.handle("file:open", async () => {
  const result = await dialog.showOpenDialog(window, {
    defaultPath: directory,
    properties: ["openFile"],
    filters: [
      { name: "JavaScript", extensions: ["js", "mjs", "cjs"] }
    ]
  });

  if (result.canceled) return null;

  const file = result.filePaths[0];
  const code = await fs.readFile(file, "utf8");
  directory = path.dirname(file);

  return {
    name: path.basename(file),
    directory,
    code
  };
});

ipcMain.handle("file:save", async (_, data) => saveFile(data));

ipcMain.handle("runner:run", async (_, data) => {
  if (busy) throw new Error("A run is already starting.");

  busy = true;

  try {
    stopRun();
    const file = await saveFile(data);
    launch(file);
    return file;
  } finally {
    busy = false;
  }
});

ipcMain.handle("runner:stop", () => stopRun());

ipcMain.handle("runner:input", (_, text) => {
  if (
    activeRun &&
    !activeRun.child.stdin.destroyed &&
    typeof text === "string"
  ) {
    activeRun.child.stdin.write(`${text}\n`);
    return true;
  }

  return false;
});

async function createWindow() {
  window = new BrowserWindow({
    width: 1120,
    height: 800,
    minWidth: 700,
    minHeight: 520,
    backgroundColor: "#101218",
    autoHideMenuBar: true,
    title: "JavaScript Notepad",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", event => event.preventDefault());

  await window.loadFile("index.html");
}

app.whenReady().then(async () => {
  directory = path.join(app.getPath("documents"), "JavaScript Notepad");
  await fs.mkdir(directory, { recursive: true });
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopRun();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
