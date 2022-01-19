module.exports = (bytesPerSecond) => {
  bytesPerSecond = parseInt(bytesPerSecond);
  if (bytesPerSecond < 1000) {
    return `${bytesPerSecond} B`;
  } else if (bytesPerSecond < 1000000) {
    return `${(bytesPerSecond / 1000).toFixed(1)} kB`;
  } else if (bytesPerSecond < 1000000000) {
    return `${(bytesPerSecond / 1000000).toFixed(1)} MB`;
  } else if (bytesPerSecond < 1000000000000) {
    return `${(bytesPerSecond / 1000000000).toFixed(1)} GB`;
  }
};