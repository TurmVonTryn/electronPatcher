const md5 = require('md5');

function getFrontBackHash(fileStream) {
  if (fileStream.length > 8000) {
    const first4k = fileStream.slice(0, 500);
    const last4k = fileStream.slice(fileStream.length - 500, fileStream.length);
    return md5(md5(first4k) + md5(last4k));
  }
}

function partialHash(fileStream, isMulFile) {
  let buffer = '';
  if (fileStream.length > 1024 * 1024 * 5 && isMulFile) {
    for (let i = 0; i < fileStream.length; i += (fileStream.length / 20000)) {
      buffer += fileStream[i];
    }
  } else {
    buffer = fileStream;
  }
  return md5(buffer + fileStream.length.toString());
}

function isBinaryFileExtension(extension) {
  let nonBinaryExtensions = ['cfg', 'def', 'enu', 'txt'];
  return !nonBinaryExtensions.includes(extension);
}

module.exports = {
  calc: partialHash,
  isBinaryFileExtension: isBinaryFileExtension
};
