/**
 * IPC Handler Module
 * Handles all IPC communication between main and renderer processes
 */

import { app, ipcMain, BrowserWindow } from 'electron';
import {
    createWindow,
    getWindow,
    focusWindow,
    toggleWindow,
    getCurrentAppType,
    AppType
} from './window-manager';
import { setBadgeCount, getBadgeCount } from './tray-manager';
import {
    showNotification,
    getPreferences as getNotificationPreferences,
    updatePreferences as updateNotificationPreferences,
    NotificationType
} from './notification-manager';
import {
    get,
    set,
    remove,
    getSecure,
    setSecure,
    removeSecure,
    queueOfflineAction,
    getOfflineQueue,
    removeFromOfflineQueue,
} from './storage-manager';
import {
    checkForUpdates,
    downloadUpdate,
    installUpdate,
} from './update-manager';

/**
 * Initialize all IPC handlers
 */
export function initIpcHandlers(): void {
    // ============================================
    // App handlers
    // ============================================

    ipcMain.handle('app:getVersion', () => {
        return app.getVersion();
    });

    ipcMain.handle('app:getAppType', () => {
        return getCurrentAppType();
    });

    // ============================================
    // Window handlers
    // ============================================

    ipcMain.on('window:minimize', (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        window?.minimize();
    });

    ipcMain.on('window:maximize', (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (window) {
            if (window.isMaximized()) {
                window.unmaximize();
            } else {
                window.maximize();
            }
        }
    });

    ipcMain.on('window:close', (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        window?.close();
    });

    ipcMain.on('window:toggleFullscreen', (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (window) {
            window.setFullScreen(!window.isFullScreen());
        }
    });

    ipcMain.on('window:create', (_, appType: AppType) => {
        createWindow(appType);
    });

    ipcMain.on('window:focus', (_, appType: AppType) => {
        focusWindow(appType);
    });

    ipcMain.on('window:toggle', (_, appType: AppType) => {
        toggleWindow(appType);
    });

    // ============================================
    // Tray handlers
    // ============================================

    ipcMain.on('tray:setBadgeCount', (_, count: number) => {
        setBadgeCount(count);
    });

    ipcMain.handle('tray:getBadgeCount', () => {
        return getBadgeCount();
    });

    // ============================================
    // Notification handlers
    // ============================================

    ipcMain.on('notification:show', (_, options: {
        type: NotificationType;
        title: string;
        body: string;
        url?: string;
        appType?: AppType;
    }) => {
        showNotification(options);
    });

    ipcMain.handle('notification:getPreferences', () => {
        return getNotificationPreferences();
    });

    ipcMain.on('notification:updatePreferences', (_, prefs) => {
        updateNotificationPreferences(prefs);
    });

    // ============================================
    // Storage handlers
    // ============================================

    ipcMain.handle('storage:get', (_, key: string, defaultValue?: unknown) => {
        return get(key, defaultValue);
    });

    ipcMain.on('storage:set', (_, key: string, value: unknown) => {
        set(key, value);
    });

    ipcMain.on('storage:remove', (_, key: string) => {
        remove(key);
    });

    // ============================================
    // Secure storage handlers
    // ============================================

    ipcMain.handle('storage:getSecure', (_, key: string) => {
        return getSecure(key);
    });

    ipcMain.on('storage:setSecure', (_, key: string, value: string) => {
        setSecure(key, value);
    });

    ipcMain.on('storage:removeSecure', (_, key: string) => {
        removeSecure(key);
    });

    // ============================================
    // Offline handlers
    // ============================================

    ipcMain.handle('offline:isOnline', () => {
        // TODO: Implement proper online detection
        return true;
    });

    ipcMain.handle('offline:queueAction', (_, type: string, payload: unknown) => {
        return queueOfflineAction(type, payload);
    });

    ipcMain.handle('offline:getQueue', () => {
        return getOfflineQueue();
    });

    ipcMain.on('offline:removeFromQueue', (_, id: string) => {
        removeFromOfflineQueue(id);
    });

    // ============================================
    // Update handlers
    // ============================================

    ipcMain.on('updates:check', () => {
        checkForUpdates();
    });

    ipcMain.on('updates:download', () => {
        downloadUpdate();
    });

    ipcMain.on('updates:install', () => {
        installUpdate();
    });
}

/**
 * Cleanup IPC handlers
 */
export function cleanupIpcHandlers(): void {
    ipcMain.removeAllListeners();
}
