/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Electron Desktop Main Process
 * 
 * Rules:
 * - Electron latest stable
 * - contextIsolation: true, nodeIntegration: false, sandbox: true
 * - 100% offline standalone
 */

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 680,
    title: 'MAISON MP MOTORS - Gestion de Quincaillerie Automobile',
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Remove default menu for clean POS look
  Menu.setApplicationMenu(null);

  // In production, load the built static dist/index.html
  const distPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    // In dev mode
    mainWindow.loadURL('http://localhost:3000');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('print:ticket', async (event, options) => {
  if (!mainWindow) return { success: false };
  return new Promise((resolve) => {
    mainWindow.webContents.print(
      {
        silent: options?.silent ?? false,
        printBackground: true,
        deviceName: options?.deviceName ?? '',
        pageSize: {
          width: 80000, // 80mm in microns
          height: 297000,
        },
      },
      (success, failureReason) => {
        resolve({ success, failureReason });
      }
    );
  });
});

ipcMain.handle('print:toPDF', async () => {
  if (!mainWindow) return null;
  const pdfBuffer = await mainWindow.webContents.printToPDF({
    printBackground: true,
    landscape: false,
  });
  return pdfBuffer;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
