// Modules to control application life and create native browser window
//const fs = require('fs');

const {app, BrowserWindow, dialog} = require('electron');
const path = require('path');
const initHandlers = require('./lib/ipcHandlers.js');
const downloadSpeedDecorator = require('./lib/downloadSpeedDecorator.js');
let mainWindow;

const { autoUpdater} = require("electron-updater");
// autoUpdater.autoDownload = true;
// autoUpdater.setFeedURL({
//   provider: "generic",
//   url: "http://localhost:3000/launcherfiles/"
// });

if (process.env.DEBUG) {
  // autoUpdater.setFeedURL({
  //   provider: "generic",
  //   url: "http://localhost:3000/launcherfiles/"
  // });
  autoUpdater.logger = require("electron-log");
  autoUpdater.logger.transports.file.level = "info";
}

function sendStatusToWindow(text) {
  if (process.env.DEBUG) {
    autoUpdater.logger.info(text);
  }
  mainWindow.webContents.send('message', text);
}

function toggleLauncherClientView() {
  if (process.env.DEBUG) {
    autoUpdater.logger.info('toggleLauncherClientView()');
  }
  mainWindow.webContents.send('toggleLauncherClientView');
}

autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('Prüfe auf Launcher-Update');
});

autoUpdater.on('update-available', () => {
  sendStatusToWindow('Launcher-Update verfügbar.');
});

autoUpdater.on('update-not-available', () => {
  sendStatusToWindow('Launcher ist auf dem aktuellen Stand.');
  toggleLauncherClientView();
  initHandlers.update();
});

autoUpdater.on('error', err => {
  sendStatusToWindow('Launcher-Update ist fehlgeschlagen. Fehlermeldung: ' + err);
});

autoUpdater.on('download-progress', progressObj => {
  let log_message = "Download speed: " + downloadSpeedDecorator(progressObj.bytesPerSecond) + '/s';
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + downloadSpeedDecorator(progressObj.transferred) + " / " + downloadSpeedDecorator(progressObj.total) + ')';
  sendStatusToWindow(log_message);
});

autoUpdater.on('update-downloaded', () => {
  sendStatusToWindow('Done');
  autoUpdater.quitAndInstall(true, true);
});

app.on('ready', function()  {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'assets', 'app.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    resizable: false
  });
  mainWindow.removeMenu();

  const promise = mainWindow.loadURL(`file://${__dirname}/index.html#v${app.getVersion()}`)

  initHandlers.init(mainWindow, autoUpdater);

  if (process.env.DEBUG) {
    mainWindow.webContents.openDevTools();
  }

  // Check for updates after the window is created
  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
}
