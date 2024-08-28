const fs = require('fs');
let request;
if (!process.env.URL?.startsWith('https')) {
  request = require('http');
} else {
  request = require('https');
}
if (process.env.DEBUG) {
  http = require('http');
}

module.exports = (url, destination, callback) => {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination.substring(0, destination.lastIndexOf('/')), {recursive: true});
  }
  let file = fs.createWriteStream(destination);
  request.get(url, response => {
    response.pipe(file);
    file.on('finish', () => file.close(callback));
  }).on('error', err => {
    fs.unlinkSync(destination);
    if (callback) callback(err.message);
  });
};