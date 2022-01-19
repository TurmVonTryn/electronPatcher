// All of the Node.js APIs are available in the preload process.

const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  let version = window.location.hash.substring(1);
  document.getElementById('version').innerText = version;
  ipcRenderer.invoke('launcher:update');
});

contextBridge.exposeInMainWorld('files', {
  get: () => ipcRenderer.invoke('files:get')
});

contextBridge.exposeInMainWorld('state', {
  update: () => ipcRenderer.invoke('state:update')
});

contextBridge.exposeInMainWorld('client', {
  start: () => ipcRenderer.invoke('client:start')
});

ipcRenderer.on('message', function(event, text) {
  let container = document.getElementById('messages');
  let message = document.createElement('div');
  message.innerHTML = text;
  container.appendChild(message);
});

ipcRenderer.on('toggleLauncherClientView', function(event, text) {
  document.getElementById('launcherUpdate').classList.toggle('hidden');
  document.getElementById('clientUpdate').classList.toggle('hidden');
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