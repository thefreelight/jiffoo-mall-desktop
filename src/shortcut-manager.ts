/**
 * Shortcut Manager Module
 * Handles global and application keyboard shortcuts
 */

import { app, globalShortcut, Menu, MenuItem, BrowserWindow } from 'electron';
import { getWindow, getAllWindows, focusWindow, AppType } from './window-manager';
import ElectronStore from 'electron-store';

// Shortcut store
const store = new ElectronStore<{
    shortcuts: Record<string, string>;
    globalShortcutsEnabled: boolean;
}>({
    name: 'shortcuts',
    defaults: {
        shortcuts: {},
        globalShortcutsEnabled: true,
    },
});

// Default shortcuts
const DEFAULT_SHORTCUTS: Record<string, { accelerator: string; description: string }> = {
    // Global shortcuts
    'global:toggle-window': { accelerator: 'CommandOrControl+Shift+J', description: 'Toggle main window' },
    'global:quick-search': { accelerator: 'CommandOrControl+Shift+S', description: 'Quick search' },

    // Application shortcuts
    'app:new-window': { accelerator: 'CommandOrControl+N', description: 'New window' },
    'app:close-window': { accelerator: 'CommandOrControl+W', description: 'Close window' },
    'app:refresh': { accelerator: 'CommandOrControl+R', description: 'Refresh' },
    'app:force-refresh': { accelerator: 'CommandOrControl+Shift+R', description: 'Force refresh' },
    'app:dev-tools': { accelerator: 'F12', description: 'Toggle DevTools' },
    'app:zoom-in': { accelerator: 'CommandOrControl+Plus', description: 'Zoom in' },
    'app:zoom-out': { accelerator: 'CommandOrControl+-', description: 'Zoom out' },
    'app:zoom-reset': { accelerator: 'CommandOrControl+0', description: 'Reset zoom' },
    'app:fullscreen': { accelerator: 'F11', description: 'Toggle fullscreen' },
    'app:minimize': { accelerator: 'CommandOrControl+M', description: 'Minimize' },
    'app:quit': { accelerator: 'CommandOrControl+Q', description: 'Quit' },

    // Shop shortcuts
    'shop:cart': { accelerator: 'CommandOrControl+Shift+C', description: 'Go to cart' },
    'shop:search': { accelerator: 'CommandOrControl+K', description: 'Focus search' },
    'shop:orders': { accelerator: 'CommandOrControl+O', description: 'View orders' },
    'shop:profile': { accelerator: 'CommandOrControl+P', description: 'View profile' },

    // Admin shortcuts
    'admin:orders': { accelerator: 'CommandOrControl+O', description: 'View orders' },
    'admin:products': { accelerator: 'CommandOrControl+P', description: 'View products' },
    'admin:customers': { accelerator: 'CommandOrControl+U', description: 'View customers' },
    'admin:analytics': { accelerator: 'CommandOrControl+A', description: 'View analytics' },
};

// Shortcut handlers
const shortcutHandlers: Record<string, () => void> = {};

/**
 * Initialize shortcuts
 */
export function initShortcuts(): void {
    // Register global shortcuts
    registerGlobalShortcuts();

    // Setup application menu with shortcuts
    setupApplicationMenu();
}

/**
 * Register global shortcuts
 */
export function registerGlobalShortcuts(): void {
    if (!store.get('globalShortcutsEnabled')) return;

    // Toggle window
    const toggleAccelerator = getShortcut('global:toggle-window');
    if (toggleAccelerator) {
        globalShortcut.register(toggleAccelerator, () => {
            const windows = getAllWindows();
            const focusedWindow = BrowserWindow.getFocusedWindow();

            if (focusedWindow && windows.some(w => w.id === focusedWindow.id)) {
                // Hide all windows
                windows.forEach(w => w.hide());
            } else {
                // Show and focus first window
                if (windows.length > 0) {
                    windows[0].show();
                    windows[0].focus();
                }
            }
        });
    }

    // Quick search
    const searchAccelerator = getShortcut('global:quick-search');
    if (searchAccelerator) {
        globalShortcut.register(searchAccelerator, () => {
            const shopWindow = getWindow('shop');
            if (shopWindow) {
                shopWindow.show();
                shopWindow.focus();
                shopWindow.webContents.send('shortcut:search');
            }
        });
    }
}

/**
 * Unregister all global shortcuts
 */
export function unregisterGlobalShortcuts(): void {
    globalShortcut.unregisterAll();
}

/**
 * Get shortcut accelerator
 */
export function getShortcut(id: string): string {
    const customShortcuts = store.get('shortcuts');
    return customShortcuts[id] || DEFAULT_SHORTCUTS[id]?.accelerator || '';
}

/**
 * Set custom shortcut
 */
export function setShortcut(id: string, accelerator: string): void {
    const shortcuts = store.get('shortcuts');
    shortcuts[id] = accelerator;
    store.set('shortcuts', shortcuts);

    // Re-register if global
    if (id.startsWith('global:')) {
        unregisterGlobalShortcuts();
        registerGlobalShortcuts();
    }
}

/**
 * Reset shortcut to default
 */
export function resetShortcut(id: string): void {
    const shortcuts = store.get('shortcuts');
    delete shortcuts[id];
    store.set('shortcuts', shortcuts);

    if (id.startsWith('global:')) {
        unregisterGlobalShortcuts();
        registerGlobalShortcuts();
    }
}

/**
 * Get all shortcuts
 */
export function getAllShortcuts(): Record<string, { accelerator: string; description: string; isCustom: boolean }> {
    const customShortcuts = store.get('shortcuts');
    const result: Record<string, { accelerator: string; description: string; isCustom: boolean }> = {};

    for (const [id, config] of Object.entries(DEFAULT_SHORTCUTS)) {
        result[id] = {
            accelerator: customShortcuts[id] || config.accelerator,
            description: config.description,
            isCustom: !!customShortcuts[id],
        };
    }

    return result;
}

/**
 * Enable/disable global shortcuts
 */
export function setGlobalShortcutsEnabled(enabled: boolean): void {
    store.set('globalShortcutsEnabled', enabled);

    if (enabled) {
        registerGlobalShortcuts();
    } else {
        unregisterGlobalShortcuts();
    }
}

/**
 * Register shortcut handler
 */
export function onShortcut(id: string, handler: () => void): void {
    shortcutHandlers[id] = handler;
}

/**
 * Setup application menu with shortcuts
 */
function setupApplicationMenu(): void {
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
                    label: 'New Window',
                    accelerator: getShortcut('app:new-window'),
                    click: () => shortcutHandlers['app:new-window']?.(),
                },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' },
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
                {
                    label: 'Refresh',
                    accelerator: getShortcut('app:refresh'),
                    click: (_, window) => (window as BrowserWindow)?.webContents?.reload(),
                },
                {
                    label: 'Force Refresh',
                    accelerator: getShortcut('app:force-refresh'),
                    click: (_, window) => (window as BrowserWindow)?.webContents?.reloadIgnoringCache(),
                },
                { type: 'separator' },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: getShortcut('app:dev-tools'),
                    click: (_, window) => (window as BrowserWindow)?.webContents?.toggleDevTools(),
                },
                { type: 'separator' },
                {
                    label: 'Zoom In',
                    accelerator: getShortcut('app:zoom-in'),
                    click: (_, window) => {
                        const bw = window as BrowserWindow;
                        if (bw?.webContents) {
                            const currentZoom = bw.webContents.getZoomFactor();
                            bw.webContents.setZoomFactor(Math.min(3, currentZoom + 0.1));
                        }
                    },
                },
                {
                    label: 'Zoom Out',
                    accelerator: getShortcut('app:zoom-out'),
                    click: (_, window) => {
                        const bw = window as BrowserWindow;
                        if (bw?.webContents) {
                            const currentZoom = bw.webContents.getZoomFactor();
                            bw.webContents.setZoomFactor(Math.max(0.5, currentZoom - 0.1));
                        }
                    },
                },
                {
                    label: 'Reset Zoom',
                    accelerator: getShortcut('app:zoom-reset'),
                    click: (_, window) => (window as BrowserWindow)?.webContents?.setZoomFactor(1),
                },
                { type: 'separator' },
                {
                    label: 'Toggle Fullscreen',
                    accelerator: getShortcut('app:fullscreen'),
                    click: (_, window) => window?.setFullScreen(!window.isFullScreen()),
                },
            ],
        },

        // Window menu
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' as const },
                ...(isMac ? [
                    { type: 'separator' as const },
                    { role: 'front' as const },
                ] : [
                    { role: 'close' as const },
                ]),
            ],
        },

        // Help menu
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Jiffoo Mall Help',
                    click: async () => {
                        const { shell } = require('electron');
                        await shell.openExternal('https://jiffoo.com/help');
                    },
                },
                { type: 'separator' },
                {
                    label: 'Report Issue',
                    click: async () => {
                        const { shell } = require('electron');
                        await shell.openExternal('https://github.com/thefreelight/jiffoo-mall-core/issues');
                    },
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

/**
 * Cleanup on app quit
 */
export function cleanupShortcuts(): void {
    unregisterGlobalShortcuts();
}
