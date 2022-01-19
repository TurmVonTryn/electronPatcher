// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  let version = window.location.hash.substring(1);
  document.getElementById('version').innerText = version;
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

contextBridge.exposeInMainWorld('client', {
  start: () => ipcRenderer.invoke('client:start')
});


ipcRenderer.on('message', function(event, text) {
  let container = document.getElementById('messages');
  let message = document.createElement('div');
  message.innerHTML = text;
  container.appendChild(message);
})
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