/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Electron Preload Bridge
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getVersion: () => ipcRenderer.invoke('app:version'),
  printTicket: (options) => ipcRenderer.invoke('print:ticket', options),
  printToPDF: () => ipcRenderer.invoke('print:toPDF'),
  platform: process.platform,
});
