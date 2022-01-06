const {ipcMain} = require('electron');
const fs = require('fs');
const download = require('./download');
const md5 = require('md5');

const url = 'https://schlenger.me/patcher/';
let filesToGo = 0;

module.exports = (win, filesToGo) => {
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
}

let downloadClientFile = (file) => {
  download(url + file, 'schnecke/' + file, (e, r) => {
    win.webContents.send('updateFilesToGo', --filesToGo);
    if (e) {
      console.log(e);
    }
  });
};