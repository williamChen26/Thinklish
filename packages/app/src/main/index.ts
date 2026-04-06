import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { initDatabase, closeDatabase, createTables } from '@thinklish/core';
import { registerArticleHandlers } from './ipc/articles';
import { registerAiHandlers } from './ipc/ai';
import { registerLookupHandlers } from './ipc/lookups';
import { registerCardHandlers } from './ipc/cards';

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.on('ready-to-show', () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

app.whenReady().then(() => {
  const dbPath = join(app.getPath('userData'), 'thinklish.db');
  const db = initDatabase(dbPath);
  createTables(db);

  registerArticleHandlers();
  registerAiHandlers(() => mainWindow);
  registerLookupHandlers();
  registerCardHandlers();

  mainWindow = createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
