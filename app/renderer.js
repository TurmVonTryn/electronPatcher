// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


document.addEventListener('click', async (event) => {
  switch (event.target.id) {
    case 'reinstall':
      await window.client.reinstall();
      break;
    case 'start':
      await window.client.start();
      break;
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await window.client.get();
});