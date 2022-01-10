// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text;
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('files', {
  get: () => ipcRenderer.invoke('files:get'),
  read: () => ipcRenderer.invoke('files:read')
});

contextBridge.exposeInMainWorld('state', {
  update: () => ipcRenderer.invoke('state:update'),
  selfUpdate: () => ipcRenderer.invoke('state:selfUpdate')
});

ipcRenderer.on('updateState', function(event, message) {
  document.querySelector('#state').innerHTML = message.toString();
});
ipcRenderer.on('debuggerConsole', function(event, message) {
  console.log(message);
});
ipcRenderer.on('updateNumberFiles', function(event, message) {
  document.querySelector('#numberFiles').innerHTML = message.toString();
});
ipcRenderer.on('updateFilesToGo', function(event, message) {
  document.querySelector('#filesToGo').innerHTML = message.toString();
});