const fs = require('fs');

let exclude = {
  locales: ['de.pak', 'en-GB.pak', 'en-US.pak'],
  '.': [
    'chrome_100_percent.pak',
    'chrome_200_percent.pak',
    'ffmpeg.dll',
    'icudtl.dat',
    'libEGL.dll',
    'libGLESv2.dll',
    'resources.pak',
    'schnecklauncher.exe',
    'snapshot_blob.bin',
    'v8_context_snapshot.bin',
    'version'
  ]
};

function cleanUp(dir, exclude) {
  let files = fs.readdirSync(dir);
  files.forEach(file => {
    if (!exclude.includes(file)) {
      fs.unlink(dir + file, () => {});
    }
  });
}

cleanUp('../out/schnecklauncher-win32-ia32/', exclude['.']);
cleanUp('../out/schnecklauncher-win32-ia32/locales/', exclude['locales']);