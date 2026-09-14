// Bridges the app to the local data file on disk.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('momentumDesk', {
  load:   ()     => ipcRenderer.invoke('momentum-load'),
  save:   (data) => ipcRenderer.invoke('momentum-save', data),
  reveal: ()     => ipcRenderer.invoke('momentum-reveal')
});
