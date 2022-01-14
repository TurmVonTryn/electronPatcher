// Modules to control application life and create native browser window
//const fs = require('fs');

const {app, BrowserWindow} = require('electron');
const path = require('path');
const exec = require('child_process').execFile;
const initHandlers = require('./lib/ipcHandlers.js');

// app.disableHardwareAcceleration();

//const {autoUpdate} = require('electron-updater');
//autoUpdate.checkForUpdatesAndNotify()();

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    resizable: false
  });
  win.removeMenu();

  // and load the index.html of the app.
  win.loadFile('index.html');

  initHandlers(win);

  // Open the DevTools.
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  exec('start.bat');
  console.log('quit');
  // let asar = fs.readFileSync('resources/test.asar');
  // fs.writeFileSync('resources/app.asar', asar)
  // if (fs.existsSync('resources\\app.asar')) {
  //   fs.writeFileSync('resources\\app.asar.bck', fs.readFileSync(process.cwd() + '\\resources\\app.asar'));
  // } else {
  //   fs.writeFileSync('debug.log', 'app.asar not found');
  // }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
