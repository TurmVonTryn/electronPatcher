const {ipcMain} = require('electron');
const fs = require('fs');
const download = require('./download');
const checksum = require('./checksum');
const exec = require('child_process').execFile;

const url = 'https://schlenger.me/clientfiles/';

module.exports = (win) => {
  let filesToGo = 0;
  ipcMain.handle('client:start', () => {
    exec('start.bat');
  });
  win.webContents.send('debuggerConsole', process.cwd());

  ipcMain.handle('files:get', () => {
    console.log('files:get');
    win.webContents.send('updateState', 'Prüfe Clientverzeichnis');
    if (!fs.existsSync('schnecke/')) {
      fs.mkdirSync('schnecke/');
    }
    win.webContents.send('updateState', 'Prüfe auf Updates');
    if (fs.existsSync('schnecke/lastUpdate.txt')) {
      download(url + 'lastUpdate.txt', 'schnecke/tmp/lastUpdate.txt', lastUpdateDownloadCallback)
    } else {
      _startUpdate();
    }
    return true;
  });

  let lastUpdateDownloadCallback = (err) => {
    let lastServerUpdateTimestamp = parseInt(fs.readFileSync('schnecke/tmp/lastUpdate.txt').toString());
    let lastLocalUpdateTimestamp = parseInt(fs.readFileSync('schnecke/lastUpdate.txt').toString());
    if (lastLocalUpdateTimestamp < lastServerUpdateTimestamp) {
      _startUpdate();
    } else {
      win.webContents.send('updateState', 'Client ist auf dem aktuellsten Stand');
      console.log('Last Update already installed');
      fs.rmSync('schnecke/tmp/', {recursive: true});
      //TODO: Checken ob Prozess gestartet wurde und dann electron schließen
      // exec('tasklist', (err, stdout, stderr) => {
      //   console.log(stdout.toString());
      // });
      // exec('start.bat', [], null, () => {
      //   win.close();
      // });
    }
  }

  let _startUpdate = () => {
    console.log('Update queued');
    win.webContents.send('updateState', 'Dateitabelle wird heruntergeladen');
    download(url + 'files.list', 'schnecke/tmp/files.list', fileListDownloadCallback);
  }

  let fileListDownloadCallback = (err) => {
    if (err) {
      console.log(err);
      return;
    }
    let fileList = fs.readFileSync('schnecke/tmp/files.list').toString().split('\r\n');
    win.webContents.send('updateNumberFiles', fileList.length.toString());
    filesToGo = fileList.length.toString();
    win.webContents.send('updateFilesToGo', filesToGo);

    fileList.forEach(line => {
      let filePath = _getFilePathFromLine(line);
      win.webContents.send('updateState', `Prüfe ${filePath}`);
      checkForUpdates(filePath, _getChecksumFromLine(line));
    });
    fs.rmSync('schnecke/tmp/', {recursive: true});

    // exec('start.bat');
    // win.close();
  }

  let checkForUpdates = (filePath, serverChecksum) => {
    if (!fs.existsSync(`schnecke/${filePath}`)) {
      _downloadClientFile(filePath);
      return;
    }
    let fileStream = fs.readFileSync(`schnecke/${filePath}`);
    let fileName = filePath.substring(filePath.lastIndexOf('\\') + 1, filePath.length);
    const extension = fileName.substring(fileName.lastIndexOf('.') + 1, fileName.length);
    const isBinaryFile = checksum.isBinaryFileExtension(extension);
    let localChecksum = checksum.calc(fileStream, isBinaryFile);
    if (localChecksum === serverChecksum) {
      console.log('Identical. Skipping', filePath, localChecksum);
      win.webContents.send('updateFilesToGo', --filesToGo);
    } else {
      console.log('Different', filePath, serverChecksum, localChecksum);
      _downloadClientFile(filePath);
    }
  }

  let _downloadClientFile = (file) => {
    win.webContents.send('updateState', `Lade ${file} herunter`);
    download(url + file, 'schnecke/' + file, (e) => {
      win.webContents.send('updateFilesToGo', --filesToGo);
      if (e) {
        console.log(e);
        return;
      }
      win.webContents.send('updateState', `${file} heruntergeladen`);
      console.log('Downloaded file', file);
    });
  };

  let _getFilePathFromLine = (line) => {
    return line.split(';')[0].replace(/\\/g, '/');
  }

  let _getChecksumFromLine = (line) => {
    return line.split(';')[1].trim();
  }
}
