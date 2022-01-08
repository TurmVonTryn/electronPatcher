const {ipcMain} = require('electron');
const fs = require('fs');
const download = require('./download');
const checksum = require('./checksum');
const exec = require('child_process').execFile;

const url = 'https://schlenger.me/clientfiles/';

module.exports = (win) => {
  let filesToGo = 0;
  ipcMain.handle('files:get', () => {
    console.log('files:get');
    if (!fs.existsSync('schnecke/')) {
      fs.mkdirSync('schnecke/');
    }
    download(url + 'lastUpdate.txt', 'schnecke/tmp/lastUpdate.txt', lastUpdateDownloadCallback)
    return true;
  });

  let lastUpdateDownloadCallback = (err) => {
    let lastServerUpdateTimestamp = parseInt(fs.readFileSync('schnecke/tmp/lastUpdate.txt').toString());
    let lastLocalUpdateTimestamp = parseInt(fs.readFileSync('schnecke/lastUpdate.txt').toString());
    if (lastLocalUpdateTimestamp < lastServerUpdateTimestamp) {
      console.log('Update queued');
      download(url + 'files.list', 'schnecke/tmp/files.list', fileListDownloadCallback);
    } else {
      console.log('Last Update already installed');
      fs.rmSync('schnecke/tmp/', {recursive: true});
      //TODO: Checken ob Prozess gestartet wurde und dann electron schließen
      // exec('tasklist', (err, stdout, stderr) => {
      //   console.log(stdout.toString());
      // });
      exec('start.bat', [], null, () => {
        win.close();
      });
    }
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
      checkForUpdates(_getFilePathFromLine(line), _getChecksumFromLine(line));
    });
    fs.rmSync('schnecke/tmp/', {recursive: true});
    exec('start.bat');
    win.close();
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
    download(url + file, 'schnecke/' + file, (e) => {
      win.webContents.send('updateFilesToGo', --filesToGo);
      if (e) {
        console.log(e);
        return;
      }
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
