// Electron main process — loads the built web app and saves data to a real file.
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Quiet harmless Chromium GPU/disk-cache warnings on Windows.
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-program-cache');

const dataFile = path.join(app.getPath('userData'), 'momentum-lab-data.json');
const maxDataBytes = 5 * 1024 * 1024;

function createWindow() {
  const win = new BrowserWindow({
    width: 1240,
    height: 840,
    backgroundColor: '#0e1014',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

ipcMain.handle('momentum-load', () => {
  try { return fs.readFileSync(dataFile, 'utf8'); } catch (e) { return null; }
});
ipcMain.handle('momentum-save', (_e, data) => {
  try {
    if (typeof data !== 'string' || Buffer.byteLength(data, 'utf8') > maxDataBytes) return false;
    JSON.parse(data);
    const temporaryFile = `${dataFile}.tmp`;
    fs.writeFileSync(temporaryFile, data, 'utf8');
    fs.renameSync(temporaryFile, dataFile);
    return true;
  } catch (e) { return false; }
});
ipcMain.handle('momentum-reveal', () => {
  try { shell.showItemInFolder(dataFile); return true; } catch (e) { return false; }
});

app.whenReady().then(createWindow);
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
