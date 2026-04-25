const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAIAdvice: (prompt, apiKey) => ipcRenderer.invoke('get-ai-advice', { prompt, apiKey })
});
