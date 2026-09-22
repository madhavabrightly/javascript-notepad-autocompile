const filenameEl = document.getElementById("filename");
const locationEl = document.getElementById("location");
const runtimeEl = document.getElementById("runtime");
const codeEl = document.getElementById("code");
const gutterEl = document.getElementById("gutter");
const consoleEl = document.getElementById("console");
const inputEl = document.getElementById("input");
const dirtyEl = document.getElementById("dirty");
const statusEl = document.getElementById("status");
const statusDot = document.getElementById("status-dot");

const openBtn = document.getElementById("open");
const saveBtn = document.getElementById("save");
const chooseBtn = document.getElementById("choose");
const runBtn = document.getElementById("run");
const stopBtn = document.getElementById("stop");
const clearBtn = document.getElementById("clear");

const SAMPLE = `// JavaScript Notepad — press Run (Ctrl+Enter) to execute
const name = process.argv[0] ? "friend" : "friend";

function greet(who) {
  return "Hello, " + who + "!";
}

console.log(greet(name));
console.log("Node", process.version, "on", process.platform);

// Try the input box below the output to feed stdin:
// process.stdin.once("data", d => console.log("You typed:", d.toString().trim()));
`;

let placeholderShown = true;
let dirty = false;
let running = false;

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusDot.className = "status-dot" + (kind ? " " + kind : "");
}

function showPlaceholder() {
  consoleEl.innerHTML = '<span class="placeholder">Run your script to see the result here.</span>';
  placeholderShown = true;
}

function append(text, cls) {
  if (placeholderShown) {
    consoleEl.textContent = "";
    placeholderShown = false;
  }
  const span = document.createElement("span");
  span.className = cls;
  span.textContent = text;
  consoleEl.appendChild(span);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function system(text) {
  append(text.endsWith("\n") ? text : text + "\n", "sys");
}

function updateGutter() {
  const lines = codeEl.value.split("\n").length;
  let out = "";
  for (let i = 1; i <= lines; i++) out += i + "\n";
  gutterEl.textContent = out;
  gutterEl.scrollTop = codeEl.scrollTop;
}

function setDirty(value) {
  dirty = value;
  dirtyEl.textContent = value ? "● unsaved" : "";
}

function setCode(value) {
  codeEl.value = value;
  updateGutter();
  setDirty(false);
}

function setRunning(value) {
  running = value;
  runBtn.disabled = value;
  saveBtn.disabled = value;
  openBtn.disabled = value;
  inputEl.disabled = !value;
  stopBtn.disabled = !value;
  if (!value) inputEl.placeholder = "Type input and press Enter to send to a running script";
  else inputEl.placeholder = "Script is running — type input and press Enter";
}

function payload() {
  return { name: filenameEl.value.trim(), code: codeEl.value };
}

async function run() {
  try {
    setRunning(true);
    system("▶ Running " + filenameEl.value.trim() + " …");
    const file = await api.run(payload());
    setStatus("Running", "running");
    if (file) locationEl.textContent = file;
  } catch (error) {
    setRunning(false);
    setStatus("Error", "error");
    append(error.message + "\n", "err");
  }
}

async function stop() {
  await api.stop();
}

async function save() {
  try {
    const file = await api.save(payload());
    setDirty(false);
    locationEl.textContent = file;
    system("✔ Saved to " + file);
  } catch (error) {
    append(error.message + "\n", "err");
  }
}

async function openFile() {
  const result = await api.openFile();
  if (!result) return;
  filenameEl.value = result.name;
  locationEl.textContent = result.directory;
  setCode(result.code);
  showPlaceholder();
  setStatus("Idle", "");
}

async function chooseLocation() {
  const dir = await api.chooseLocation();
  if (dir) locationEl.textContent = dir;
}

codeEl.addEventListener("input", () => {
  updateGutter();
  setDirty(true);
});

codeEl.addEventListener("scroll", () => {
  gutterEl.scrollTop = codeEl.scrollTop;
});

const PAIRS = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'", "`": "`" };
const CLOSERS = new Set([")", "]", "}", '"', "'", "`"]);
const QUOTES = new Set(['"', "'", "`"]);

function lineIndent(value, index) {
  const lineStart = value.lastIndexOf("\n", index - 1) + 1;
  const match = value.slice(lineStart, index).match(/^[ \t]*/);
  return match ? match[0] : "";
}

function edit(text, start, end, cursor) {
  codeEl.setRangeText(text, start, end, "end");
  if (cursor !== undefined) {
    codeEl.selectionStart = codeEl.selectionEnd = cursor;
  }
  updateGutter();
  setDirty(true);
}

codeEl.addEventListener("keydown", event => {
  const start = codeEl.selectionStart;
  const end = codeEl.selectionEnd;
  const value = codeEl.value;

  if (event.key === "Tab") {
    event.preventDefault();
    edit("  ", start, end, start + 2);
    return;
  }

  if (event.key === "Enter" && start === end) {
    const before = value[start - 1];
    const after = value[start];
    if (PAIRS[before] === after && PAIRS[before] !== before) {
      event.preventDefault();
      const indent = lineIndent(value, start);
      const inner = indent + "  ";
      edit("\n" + inner + "\n" + indent, start, end, start + 1 + inner.length);
    }
    return;
  }

  if (event.key === "Backspace" && start === end && start > 0) {
    if (PAIRS[value[start - 1]] === value[start]) {
      event.preventDefault();
      edit("", start - 1, start + 1, start - 1);
    }
    return;
  }

  if (CLOSERS.has(event.key) && start === end && value[start] === event.key) {
    event.preventDefault();
    codeEl.selectionStart = codeEl.selectionEnd = start + 1;
    return;
  }

  if (PAIRS[event.key]) {
    const close = PAIRS[event.key];
    const prev = value[start - 1];
    if (QUOTES.has(event.key)) {
      if (start === end && prev && /[A-Za-z0-9_$]/.test(prev)) return;
      if (value[start] && !/[\s)\]},;.]/.test(value[start])) return;
    }
    event.preventDefault();
    if (start !== end) {
      const selected = value.slice(start, end);
      edit(event.key + selected + close, start, end);
      codeEl.selectionStart = start + 1;
      codeEl.selectionEnd = end + 1;
    } else {
      edit(event.key + close, start, end, start + 1);
    }
  }
});

filenameEl.addEventListener("input", () => setDirty(true));

inputEl.addEventListener("keydown", async event => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const text = inputEl.value;
  inputEl.value = "";
  append("› " + text + "\n", "sys");
  await api.sendInput(text);
});

runBtn.addEventListener("click", run);
stopBtn.addEventListener("click", stop);
saveBtn.addEventListener("click", save);
openBtn.addEventListener("click", openFile);
chooseBtn.addEventListener("click", chooseLocation);
clearBtn.addEventListener("click", () => {
  showPlaceholder();
});

document.addEventListener("keydown", event => {
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return;
  if (event.key === "Enter") {
    event.preventDefault();
    if (!running) run();
  } else if (event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (!running) save();
  } else if (event.key.toLowerCase() === "o") {
    event.preventDefault();
    if (!running) openFile();
  }
});

api.onOutput(payload => {
  append(payload.text, payload.error ? "err" : "out");
});

api.onState(state => {
  if (state === "Running") {
    setStatus("Running", "running");
    return;
  }

  setRunning(false);

  if (state === "Stopped") {
    setStatus("Stopped", "stopped");
  } else if (state === "Failed") {
    setStatus("Failed", "error");
  } else if (state.startsWith("Stopped")) {
    setStatus(state, "stopped");
  } else {
    const code = state.replace("Exited: ", "");
    setStatus(state, code === "0" ? "" : "error");
  }

  system("■ " + state);
});

async function init() {
  setCode(SAMPLE);
  const info = await api.info();
  locationEl.textContent = info.directory;
  runtimeEl.textContent = info.runtime;
  setStatus("Idle", "");
}

init();
