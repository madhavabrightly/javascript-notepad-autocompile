const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  info: () => ipcRenderer.invoke("app:info"),
  chooseLocation: () => ipcRenderer.invoke("file:location"),
  openFile: () => ipcRenderer.invoke("file:open"),
  save: data => ipcRenderer.invoke("file:save", data),
  run: data => ipcRenderer.invoke("runner:run", data),
  stop: () => ipcRenderer.invoke("runner:stop"),
  sendInput: text => ipcRenderer.invoke("runner:input", text),
  onOutput: callback => {
    ipcRenderer.on("runner:output", (_, payload) => callback(payload));
  },
  onState: callback => {
    ipcRenderer.on("runner:state", (_, state) => callback(state));
  }
});
