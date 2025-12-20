/**
 * Window Manager Module
 * Manages Electron windows for different app types (Shop, Admin, Super Admin)
 */

import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import Store from 'electron-store';

// Types
export type AppType = 'shop' | 'admin' | 'super-admin';

interface WindowState {
    width: number;
    height: number;
    x?: number;
    y?: number;
    isMaximized?: boolean;
}

interface WindowConfig {
    appType: AppType;
    url: string;
    title: string;
    icon?: string;
}

// Window state store
const store = new Store<Record<string, WindowState>>({
    name: 'window-state',
});

// App configurations
const APP_CONFIGS: Record<AppType, Omit<WindowConfig, 'appType'>> = {
    shop: {
        url: process.env.SHOP_URL || 'http://localhost:3004',
        title: 'Jiffoo Mall Shop',
    },
    admin: {
        url: process.env.ADMIN_URL || 'http://localhost:3005',
        title: 'Jiffoo Mall Admin',
    },
    'super-admin': {
        url: process.env.SUPER_ADMIN_URL || 'http://localhost:3006',
        title: 'Jiffoo Mall Super Admin',
    },
};

// Active windows map
const windows = new Map<AppType, BrowserWindow>();

/**
 * Get default window state
 */
function getDefaultWindowState(): WindowState {
    return {
        width: 1280,
        height: 800,
    };
}

/**
 * Load window state from store
 */
function loadWindowState(appType: AppType): WindowState {
    const key = `window-state-${appType}`;
    return store.get(key, getDefaultWindowState());
}

/**
 * Save window state to store
 */
function saveWindowState(appType: AppType, window: BrowserWindow): void {
    const key = `window-state-${appType}`;
    const bounds = window.getBounds();

    store.set(key, {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: window.isMaximized(),
    });
}

/**
 * Create a new window for the specified app type
 */
export function createWindow(appType: AppType): BrowserWindow {
    // Check if window already exists
    if (windows.has(appType)) {
        const existingWindow = windows.get(appType)!;
        existingWindow.focus();
        return existingWindow;
    }

    const config = APP_CONFIGS[appType];
    const state = loadWindowState(appType);

    const window = new BrowserWindow({
        width: state.width,
        height: state.height,
        x: state.x,
        y: state.y,
        title: config.title,
        icon: config.icon,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });

    // Restore maximized state
    if (state.isMaximized) {
        window.maximize();
    }

    // Load the app URL
    window.loadURL(config.url);

    // Save window state on close
    window.on('close', () => {
        saveWindowState(appType, window);
    });

    // Cleanup on closed
    window.on('closed', () => {
        windows.delete(appType);
    });

    // Open external links in browser
    window.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    windows.set(appType, window);
    return window;
}

/**
 * Get window by app type
 */
export function getWindow(appType: AppType): BrowserWindow | undefined {
    return windows.get(appType);
}

/**
 * Get all windows
 */
export function getAllWindows(): BrowserWindow[] {
    return Array.from(windows.values());
}

/**
 * Close window by app type
 */
export function closeWindow(appType: AppType): void {
    const window = windows.get(appType);
    if (window) {
        window.close();
    }
}

/**
 * Close all windows
 */
export function closeAllWindows(): void {
    for (const window of windows.values()) {
        window.close();
    }
}

/**
 * Focus window by app type
 */
export function focusWindow(appType: AppType): void {
    const window = windows.get(appType);
    if (window) {
        if (window.isMinimized()) {
            window.restore();
        }
        window.focus();
    }
}

/**
 * Show/hide window by app type
 */
export function toggleWindow(appType: AppType): void {
    const window = windows.get(appType);
    if (window) {
        if (window.isVisible()) {
            window.hide();
        } else {
            window.show();
            window.focus();
        }
    }
}

/**
 * Get current app type from environment
 */
export function getCurrentAppType(): AppType {
    const appType = process.env.APP_TYPE as AppType;
    if (appType && ['shop', 'admin', 'super-admin'].includes(appType)) {
        return appType;
    }
    return 'shop'; // Default to shop
}
