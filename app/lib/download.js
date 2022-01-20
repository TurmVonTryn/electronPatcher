const fs = require('fs');
let http = require('https');
if (process.env.DEBUG) {
  http = require('http');
}

module.exports = (url, dest, cb) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest.substring(0, dest.lastIndexOf('/')), {recursive: true});
  }
  let file = fs.createWriteStream(dest);
  http.get(url, response => {
    response.pipe(file);
    file.on('finish', () => file.close(cb));
  }).on('error', err => {
    fs.unlinkSync(dest);
    if (cb) cb(err.message);
  });
};