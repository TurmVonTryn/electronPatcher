// Modules to control application life and create native browser window
//const fs = require('fs');

const {app, BrowserWindow} = require('electron');
const path = require('path');
const exec = require('child_process').execFile;
const initHandlers = require('./lib/ipcHandlers.js');
const downloadSpeedDecorator = require('./lib/downloadSpeedDecorator.js');

const {autoUpdater} = require("electron-updater");
autoUpdater.autoDownload = true;
autoUpdater.setFeedURL({
  provider: "generic",
  url: "http://localhost:3000/launcherfiles/"
});

if (process.env.DEBUG) {
  autoUpdater.logger = require("electron-log");
  autoUpdater.logger.transports.file.level = "info";
}

let win;

function sendStatusToWindow(text) {
  if (process.env.DEBUG) {
    autoUpdater.logger.info(text);
  }
  win.webContents.send('message', text);
}
autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('Prüfe auf Launcher-Update');
});
autoUpdater.on('update-available', (info) => {
  sendStatusToWindow('Launcher-Update verfügbar.');
});
autoUpdater.on('update-not-available', (info) => {
  sendStatusToWindow('Launcher ist auf dem aktuellen Stand.');
});
autoUpdater.on('error', (err) => {
  sendStatusToWindow('Launcher-Update ist fehlgeschlagen. Fehlermeldung: ' + err);
});
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + downloadSpeedDecorator(progressObj.bytesPerSecond) + '/s';
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + downloadSpeedDecorator(progressObj.transferred) + " / " + downloadSpeedDecorator(progressObj.total) + ')';
  sendStatusToWindow(log_message);
});
autoUpdater.on('update-downloaded', (ev, info) => {
  sendStatusToWindow('Done');
  //autoUpdater.quitAndInstall(true, true);
});

app.on('ready', function()  {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  autoUpdater.checkForUpdates();
});

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    resizable: false
  });
  win.removeMenu();

  // and load the index.html of the app.
  //win.loadFile('index.html');
  win.loadURL(`file://${__dirname}/index.html#v${app.getVersion()}`);
  initHandlers(win);

  if (process.env.DEBUG) {
    // Open the DevTools.
    win.webContents.openDevTools();
  }
}

// app.whenReady().then(() => {
//   createWindow();
//
//   app.on('activate', () => {
//     if (BrowserWindow.getAllWindows().length === 0) {
//       createWindow();
//     }
//   });
// });

// app.on('quit', () => {
//
// });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
