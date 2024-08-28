// All of the Node.js APIs are available in the preload process.

const { contextBridge, ipcRenderer } = require('electron');
let maxFiles = 0;

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('version').innerText = window.location.hash.substring(1);
  ipcRenderer.invoke('launcher:update');
});

contextBridge.exposeInMainWorld('state', {
  update: () => ipcRenderer.invoke('state:update')
});

contextBridge.exposeInMainWorld('client', {
  get: () => ipcRenderer.invoke('client:get'),
  reinstall: () => ipcRenderer.invoke('client:reinstall'),
  start: () => ipcRenderer.invoke('client:start')
});

ipcRenderer.on('message', function(event, text) {
  let container = document.getElementById('messages');
  let message = document.createElement('div');
  message.innerHTML = text;
  container.appendChild(message);
});

ipcRenderer.on('toggleLauncherClientView', function() {
  document.getElementById('launcherUpdate').classList.toggle('hidden');
  document.getElementById('clientUpdate').classList.toggle('hidden');
});

ipcRenderer.on('updateState', function(event, message) {
  const stateContainer = document.getElementById('state');
  stateContainer.innerHTML = message.toString() + '<br>' + stateContainer.innerHTML;
});

ipcRenderer.on('clearState', function(event, message) {
  const stateContainer = document.getElementById('state');
  stateContainer.innerHTML = '';
});

ipcRenderer.on('debuggerConsole', function(event, message) {
  console.log(message);
});

ipcRenderer.on('updateNumberFiles', function(event, message) {
  maxFiles = message.toString()
  document.querySelector('#numberFiles').innerHTML = maxFiles;
});

ipcRenderer.on('updateFilesToGo', function(event, message) {
  document.querySelector('#filesToGo').innerHTML = (parseInt(maxFiles) - parseInt(message.toString())).toString();
});