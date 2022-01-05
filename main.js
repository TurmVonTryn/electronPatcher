// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const md5 = require('md5');

const url = 'https://schlenger.me/patcher/';
let filesToGo = 0;
// app.disableHardwareAcceleration();

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // and load the index.html of the app.
  win.loadFile('index.html');

  ipcMain.handle('files:get', () => {
    console.log('files:get');
    if (!fs.existsSync('schnecke/')) {
      fs.mkdirSync('schnecke/');
    }
    download(url + 'files.list', 'schnecke/tmp/files.list', (err) => {
      if (err) {
        console.log(err);
        return;
      }
      let fileList = fs.readFileSync('schnecke/tmp/files.list').toString().split('\r\n');
      win.webContents.send('updateNumberFiles', fileList.length.toString());
      filesToGo = fileList.length.toString();
      win.webContents.send('updateFilesToGo', filesToGo);

      fileList.forEach(line => {
        let file = line.split(';')[0].replace(/\\/g, '/');
        let checksum = line.split(';')[1].trim();

        if (fs.existsSync(`schnecke/${file}`)) {
          let fileStream = fs.readFileSync(`schnecke/${file}`);
          let buffer = '';
          if (fileStream.length > 1024 * 1024 * 5) {
            for (let i = 0; i < fileStream.length; i += 512) {
              buffer += fileStream[i];
            }
          } else {
            buffer = fileStream;
          }
          if (md5(buffer.toString() + fileStream.length) === checksum) {
            console.log('Identical', file, checksum);
            win.webContents.send('updateFilesToGo', --filesToGo);
          } else {
            console.log('Different', file, md5(buffer.toString() + fileStream.length), checksum);
            downloadClientFile(file);
          }
        } else {
          downloadClientFile(file);
        }
      });
      fs.rmSync('schnecke/tmp/', {recursive: true});
    });
    return true;
  });

  let downloadClientFile = (file) => {
    download(url + file, 'schnecke/' + file, (e, r) => {
      win.webContents.send('updateFilesToGo', --filesToGo);
      if (e) {
        console.log(e);
        return;
      }
      console.log(r);
    });
  };

  let download = (url, dest, cb) => {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest.substring(0, dest.lastIndexOf('/')), {recursive: true});
    }
    let file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(cb);
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      if (cb) cb(err.message);
    });
  };

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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
