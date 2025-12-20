/**
 * Preload Script
 * Exposes safe APIs to the renderer process via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for exposed APIs
export interface JiffooDesktopAPI {
    // App info
    getAppVersion: () => Promise<string>;
    getAppType: () => Promise<string>;
    getPlatform: () => string;

    // Window controls
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    toggleFullscreen: () => void;

    // Tray
    setBadgeCount: (count: number) => void;

    // Notifications
    showNotification: (options: NotificationOptions) => void;
    getNotificationPreferences: () => Promise<NotificationPreferences>;
    updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;

    // Storage
    store: {
        get: <T>(key: string, defaultValue?: T) => Promise<T | undefined>;
        set: <T>(key: string, value: T) => void;
        remove: (key: string) => void;
    };

    // Secure storage
    secureStore: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => void;
        remove: (key: string) => void;
    };

    // Offline
    offline: {
        isOnline: () => Promise<boolean>;
        queueAction: (type: string, payload: unknown) => Promise<string>;
        getQueue: () => Promise<OfflineAction[]>;
        removeFromQueue: (id: string) => void;
    };

    // Updates
    updates: {
        checkForUpdates: () => void;
        downloadUpdate: () => void;
        installUpdate: () => void;
        onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
        onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
        onUpdateDownloaded: (callback: () => void) => void;
    };

    // Events
    on: (channel: string, callback: (...args: unknown[]) => void) => void;
    off: (channel: string, callback: (...args: unknown[]) => void) => void;
}

interface NotificationOptions {
    type: 'order' | 'promotion' | 'system' | 'message';
    title: string;
    body: string;
    url?: string;
}

interface NotificationPreferences {
    enabled: boolean;
    sound: boolean;
    orderNotifications: boolean;
    promotionNotifications: boolean;
    systemNotifications: boolean;
}

interface OfflineAction {
    id: string;
    type: string;
    payload: unknown;
    timestamp: number;
    retries: number;
}

interface UpdateInfo {
    version: string;
    releaseDate: string;
    releaseNotes?: string;
}

interface DownloadProgress {
    percent: number;
    bytesPerSecond: number;
    total: number;
    transferred: number;
}

// Expose safe APIs via contextBridge
contextBridge.exposeInMainWorld('jiffooDesktop', {
    // App info
    getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
    getAppType: () => ipcRenderer.invoke('app:getAppType'),
    getPlatform: () => process.platform,

    // Window controls
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    maximizeWindow: () => ipcRenderer.send('window:maximize'),
    closeWindow: () => ipcRenderer.send('window:close'),
    toggleFullscreen: () => ipcRenderer.send('window:toggleFullscreen'),

    // Tray
    setBadgeCount: (count: number) => ipcRenderer.send('tray:setBadgeCount', count),

    // Notifications
    showNotification: (options: NotificationOptions) => ipcRenderer.send('notification:show', options),
    getNotificationPreferences: () => ipcRenderer.invoke('notification:getPreferences'),
    updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) =>
        ipcRenderer.send('notification:updatePreferences', prefs),

    // Storage
    store: {
        get: <T>(key: string, defaultValue?: T) => ipcRenderer.invoke('storage:get', key, defaultValue),
        set: <T>(key: string, value: T) => ipcRenderer.send('storage:set', key, value),
        remove: (key: string) => ipcRenderer.send('storage:remove', key),
    },

    // Secure storage
    secureStore: {
        get: (key: string) => ipcRenderer.invoke('storage:getSecure', key),
        set: (key: string, value: string) => ipcRenderer.send('storage:setSecure', key, value),
        remove: (key: string) => ipcRenderer.send('storage:removeSecure', key),
    },

    // Offline
    offline: {
        isOnline: () => ipcRenderer.invoke('offline:isOnline'),
        queueAction: (type: string, payload: unknown) =>
            ipcRenderer.invoke('offline:queueAction', type, payload),
        getQueue: () => ipcRenderer.invoke('offline:getQueue'),
        removeFromQueue: (id: string) => ipcRenderer.send('offline:removeFromQueue', id),
    },

    // Updates
    updates: {
        checkForUpdates: () => ipcRenderer.send('updates:check'),
        downloadUpdate: () => ipcRenderer.send('updates:download'),
        installUpdate: () => ipcRenderer.send('updates:install'),
        onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
            ipcRenderer.on('updates:available', (_, info) => callback(info));
        },
        onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
            ipcRenderer.on('updates:downloadProgress', (_, progress) => callback(progress));
        },
        onUpdateDownloaded: (callback: () => void) => {
            ipcRenderer.on('updates:downloaded', () => callback());
        },
    },

    // Events
    on: (channel: string, callback: (...args: unknown[]) => void) => {
        // Whitelist of allowed channels
        const allowedChannels = [
            'network:online',
            'network:offline',
            'app:focus',
            'app:blur',
            'deep-link',
        ];
        if (allowedChannels.includes(channel)) {
            ipcRenderer.on(channel, (_, ...args) => callback(...args));
        }
    },
    off: (channel: string, callback: (...args: unknown[]) => void) => {
        ipcRenderer.removeListener(channel, callback);
    },
} as JiffooDesktopAPI);
