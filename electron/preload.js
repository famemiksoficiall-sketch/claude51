const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', { win: (a) => ipcRenderer.send('win', a) });
