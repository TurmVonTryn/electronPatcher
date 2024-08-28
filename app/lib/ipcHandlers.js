const {ipcMain} = require('electron');
const fs = require('fs');
const download = require('./download');
const checksum = require('./checksum');
const { spawn } = require('child_process');
const path = require('path');

let url = 'http://localhost:3000/clientfiles/';

if (process.env.URL) {
  url = process.env.URL; // 'http://localhost:3000/clientfiles/'
}

let win;
let filesToGo = 0;

let _lastUpdateDownloadCallback = () => {
  let lastServerUpdateTimestamp = parseInt(fs.readFileSync('tvt/tmp/lastUpdate.txt').toString());
  let lastLocalUpdateTimestamp = parseInt(fs.readFileSync('tvt/lastUpdate.txt').toString());
  if (lastLocalUpdateTimestamp < lastServerUpdateTimestamp) {
    _startUpdate();
  } else {
    win.webContents.send('updateState', 'Client ist auf dem aktuellsten Stand');
    console.log('Last Update already installed');
    fs.rmSync('tvt/tmp/', {recursive: true});
  }
}

let _startUpdate = () => {
  console.log('Update queued');
  win.webContents.send('updateState', 'Dateitabelle wird heruntergeladen');

  if (process.env.DEBUG) {
    if (!fs.existsSync('./tvt/tmp/')) {
      fs.mkdirSync('./tvt/tmp/');
    }
    fs.copyFileSync('./tvt/files.list', './tvt/tmp/files.list');
    _fileListDownloadCallback(false);
  } else {
    download(url + 'files.list', 'tvt/tmp/files.list', _fileListDownloadCallback);
  }
}

let _fileListDownloadCallback = err => {
  if (err) {
    console.log(err);
    return;
  }
  let serverFileList = fs.readFileSync('tvt/tmp/files.list').toString().split('\r\n');
  win.webContents.send('updateNumberFiles', serverFileList.length.toString());
  filesToGo = serverFileList.length.toString();
  win.webContents.send('updateFilesToGo', filesToGo);
  if (fs.existsSync('./tvt/files.list')) {
    let localFileListLines = fs.readFileSync('tvt/files.list').toString().split('\r\n');
    serverFileList.forEach(line => {
      let filePath = _getFilePathFromLine(line);
      win.webContents.send('updateState', `Prüfe ${filePath}`);
      if (!localFileListLines.includes(line)) {
        _downloadClientFile(filePath);
      } else {
        win.webContents.send('updateFilesToGo', --filesToGo);
        win.webContents.send('updateState', `Identisch: ${filePath}`);
        _startClientIfUpdateIsDone(filesToGo === 0);
      }
    });
  } else {
    serverFileList.forEach(line => {
      let filePath = _getFilePathFromLine(line);
      win.webContents.send('updateState', `Prüfe ${filePath}`);
      _checkForUpdates(filePath, _getChecksumFromLine(line));
    });
  }
  fs.copyFileSync('tvt/tmp/files.list', 'tvt/files.list');
  fs.rmSync('tvt/tmp/', {recursive: true});
}

function _startClientIfUpdateIsDone(isUpdateDone) {
  if (!isUpdateDone) {
    return;
  }
  win.webContents.send('updateState', 'Starte Client');
  spawn(path.join(__dirname, '..', '..', '..', 'tvt', 'OrionUO.exe'), { cwd: path.join(__dirname, '..', '..', '..', 'tvt'), detached: true, stdio: 'ignore' }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${error}`);
      return;
    }
    console.log(`Stdout: ${stdout}`);
    console.error(`Stderr: ${stderr}`);
  }).unref();
}

let _checkForUpdates = (filePath, serverChecksum) => {
  if (!fs.existsSync(`tvt/${filePath}`)) {
    _downloadClientFile(filePath);
    return;
  }
  fs.readFile(`tvt/${filePath}`, (fileStream) => {
    let fileName = filePath.substring(filePath.lastIndexOf('\\') + 1, filePath.length);
    const extension = fileName.substring(fileName.lastIndexOf('.') + 1, fileName.length);
    const isBinaryFile = checksum.isBinaryFileExtension(extension);
    let localChecksum = checksum.calc(fileStream, isBinaryFile);
    if (localChecksum === serverChecksum) {
      console.log('Identical. Skipping', filePath, localChecksum);
      win.webContents.send('updateFilesToGo', --filesToGo);
      _startClientIfUpdateIsDone(filesToGo === 0);
    } else {
      console.log('Different', filePath, serverChecksum, localChecksum);
      _downloadClientFile(filePath);
    }
  });
}

let _downloadClientFile = filePath => {
  win.webContents.send('updateState', `Lade ${filePath} herunter`);
  download(url + filePath, 'tvt/' + filePath, e => {
    win.webContents.send('updateFilesToGo', --filesToGo);
    if (e) {
      console.log(e);
      return;
    }
    win.webContents.send('updateState', `${filePath} heruntergeladen`);
    console.log('Downloaded file', filePath);
    _startClientIfUpdateIsDone(filesToGo === 0);
  });
};

let _getFilePathFromLine = line => line.split(';')[0].replace(/\\/g, '/');

let _getChecksumFromLine = line => line.split(';')[1].trim();

let update = () => {
  console.log('files:get');
  win.webContents.send('updateState', 'Prüfe Clientverzeichnis');
  if (!fs.existsSync('tvt/')) {
    fs.mkdirSync('tvt/');
  }
  win.webContents.send('updateState', 'Prüfe auf Updates');
  fs.access('tvt/lastUpdate.txt', error => {
    if (error) {
      _startUpdate();
    } else {
      download(url + 'lastUpdate.txt', 'tvt/tmp/lastUpdate.txt', _lastUpdateDownloadCallback);
    }
  });
  return true;
};

let init = (window, autoUpdater) => {
  win = window;
  win.webContents.send('debuggerConsole', process.cwd());

  ipcMain.handle('launcher:update', () => autoUpdater.checkForUpdates());

  ipcMain.handle('client:start', () => { _startClientIfUpdateIsDone(true) });

  ipcMain.handle('client:get', update);

  ipcMain.handle('client:reinstall', reinstall);
};

let reinstall = () => {
  win.webContents.send('clearState');
  fs.unlink('./tvt/files.list', () => {
    update();
  });
}

module.exports = {
  init,
  reinstall,
  update,
};
