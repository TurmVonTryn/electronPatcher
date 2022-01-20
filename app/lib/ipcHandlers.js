const {ipcMain} = require('electron');
const fs = require('fs');
const download = require('./download');
const checksum = require('./checksum');
const exec = require('child_process').execFile;

let url = 'https://schlenger.me/clientfiles/';

if (process.env.DEBUG) {
  url = 'http://localhost:3000/clientfiles/'
}

let win;
let filesToGo = 0;

let _lastUpdateDownloadCallback = () => {
  let lastServerUpdateTimestamp = parseInt(fs.readFileSync('schnecke/tmp/lastUpdate.txt').toString());
  let lastLocalUpdateTimestamp = parseInt(fs.readFileSync('schnecke/lastUpdate.txt').toString());
  if (lastLocalUpdateTimestamp < lastServerUpdateTimestamp) {
    _startUpdate();
  } else {
    win.webContents.send('updateState', 'Client ist auf dem aktuellsten Stand');
    console.log('Last Update already installed');
    fs.rmSync('schnecke/tmp/', {recursive: true});
  }
}

let _startUpdate = () => {
  console.log('Update queued');
  win.webContents.send('updateState', 'Dateitabelle wird heruntergeladen');

  if (process.env.DEBUG) {
    if (!fs.existsSync('./schnecke/tmp/')) {
      fs.mkdirSync('./schnecke/tmp/');
    }
    fs.copyFileSync('./schnecke/files.list', './schnecke/tmp/files.list');
    _fileListDownloadCallback(false);
  } else {
    download(url + 'files.list', 'schnecke/tmp/files.list', _fileListDownloadCallback);
  }
}

let _fileListDownloadCallback = err => {
  if (err) {
    console.log(err);
    return;
  }
  let serverFileList = fs.readFileSync('schnecke/tmp/files.list').toString().split('\r\n');
  win.webContents.send('updateNumberFiles', serverFileList.length.toString());
  filesToGo = serverFileList.length.toString();
  win.webContents.send('updateFilesToGo', filesToGo);
  if (fs.existsSync('./schnecke/files.list')) {
    let localFileListLines = fs.readFileSync('schnecke/files.list').toString().split('\r\n');
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
  fs.copyFileSync('schnecke/tmp/files.list', 'schnecke/files.list');
  fs.rmSync('schnecke/tmp/', {recursive: true});
}

function _startClientIfUpdateIsDone(isUpdateDone) {
  if (isUpdateDone) {
    win.webContents.send('updateState', 'Starte Client');
    exec('start.bat');
  }
}

let _checkForUpdates = (filePath, serverChecksum) => {
  if (!fs.existsSync(`schnecke/${filePath}`)) {
    _downloadClientFile(filePath);
    return;
  }
  fs.readFile(`schnecke/${filePath}`, (fileStream) => {
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
  download(url + filePath, 'schnecke/' + filePath, e => {
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
  if (!fs.existsSync('schnecke/')) {
    fs.mkdirSync('schnecke/');
  }
  win.webContents.send('updateState', 'Prüfe auf Updates');
  fs.access('schnecke/lastUpdate.txt', error => {
    if (error) {
      _startUpdate();
    } else {
      download(url + 'lastUpdate.txt', 'schnecke/tmp/lastUpdate.txt', _lastUpdateDownloadCallback);
    }
  });
  return true;
};

let init = (window, autoUpdater) => {
  win = window;
  win.webContents.send('debuggerConsole', process.cwd());

  ipcMain.handle('launcher:update', () => autoUpdater.checkForUpdates());

  ipcMain.handle('client:start', () => exec('start.bat'));

  ipcMain.handle('client:get', update);

  ipcMain.handle('client:reinstall', reinstall);
};

let reinstall = () => {
  win.webContents.send('clearState');
  fs.unlink('./schnecke/files.list', () => {
    update();
  });
}

module.exports = {
  init,
  reinstall,
  update
};
