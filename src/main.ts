/**
 * Main Entry Point
 * Jiffoo Mall Desktop Application
 */

import { app, BrowserWindow, Menu, shell } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';
import { createWindow, getCurrentAppType, closeAllWindows } from './window-manager';
import { createTray, destroyTray } from './tray-manager';
import { initAutoUpdater, checkForUpdates } from './update-manager';
import { initIpcHandlers, cleanupIpcHandlers } from './ipc-handler';
import { clearExpiredCache } from './storage-manager';

// Handle Squirrel events (Windows installer)
if (squirrelStartup) {
  app.quit();
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus existing window when trying to open another instance
    const appType = getCurrentAppType();
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
}

/**
 * Create application menu
 */
function createMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Shop',
          accelerator: 'CmdOrCtrl+1',
          click: () => createWindow('shop'),
        },
        {
          label: 'Open Admin',
          accelerator: 'CmdOrCtrl+2',
          click: () => createWindow('admin'),
        },
        {
          label: 'Open Super Admin',
          accelerator: 'CmdOrCtrl+3',
          click: () => createWindow('super-admin'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' as const },
          { role: 'delete' as const },
          { role: 'selectAll' as const },
        ] : [
          { role: 'delete' as const },
          { type: 'separator' as const },
          { role: 'selectAll' as const },
        ]),
      ],
    },
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
          { type: 'separator' as const },
          { role: 'window' as const },
        ] : [
          { role: 'close' as const },
        ]),
      ],
    },
    // Help menu
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://docs.jiffoo.com');
          },
        },
        {
          label: 'Report an Issue',
          click: async () => {
            await shell.openExternal('https://github.com/jiffoo/jiffoo-mall-core/issues');
          },
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => checkForUpdates(),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * App ready handler
 */
app.whenReady().then(() => {
  // Initialize components
  initIpcHandlers();
  initAutoUpdater();
  createMenu();
  createTray();

  // Clear expired cache on startup
  clearExpiredCache();

  // Create main window based on app type
  const appType = getCurrentAppType();
  createWindow(appType);

  // Check for updates after startup
  setTimeout(() => {
    checkForUpdates();
  }, 5000);

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(getCurrentAppType());
    }
  });
});

/**
 * Quit when all windows are closed (except on macOS)
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Cleanup before quit
 */
app.on('before-quit', () => {
  destroyTray();
  cleanupIpcHandlers();
});

/**
 * Handle deep links (custom protocol)
 */
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Register custom protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('jiffoo', process.execPath, [process.argv[1]]);
  }
} else {
  app.setAsDefaultProtocolClient('jiffoo');
}

/**
 * Handle deep link
 */
function handleDeepLink(url: string): void {
  try {
    const parsed = new URL(url);

    // jiffoo://shop/product/123
    // jiffoo://admin/orders/456
    // jiffoo://super-admin/settings

    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const appType = parsed.host as 'shop' | 'admin' | 'super-admin';

    if (['shop', 'admin', 'super-admin'].includes(appType)) {
      const window = createWindow(appType);

      // Navigate to specific path
      if (pathParts.length > 0) {
        const internalPath = '/' + pathParts.join('/');
        // Send navigation event to renderer
        window.webContents.on('did-finish-load', () => {
          window.webContents.send('deep-link', internalPath);
        });
      }
    }
  } catch (error) {
    console.error('Failed to handle deep link:', error);
  }
}
