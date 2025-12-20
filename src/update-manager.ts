/**
 * Update Manager Module
 * Handles automatic updates and hot reloading
 */

import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { getAllWindows } from './window-manager';

// Update state
let updateDownloaded = false;
let updateInfo: UpdateInfo | null = null;

interface UpdateInfo {
    version: string;
    releaseDate: string;
    releaseNotes?: string;
}

/**
 * Initialize auto updater
 */
export function initAutoUpdater(): void {
    // Configure auto updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for updates...');
        broadcastToWindows('updates:checking');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
        updateInfo = {
            version: info.version,
            releaseDate: info.releaseDate,
            releaseNotes: Array.isArray(info.releaseNotes)
                ? info.releaseNotes.map(n => n.note).join('\n')
                : info.releaseNotes,
        };
        broadcastToWindows('updates:available', updateInfo);
    });

    autoUpdater.on('update-not-available', () => {
        console.log('No updates available');
        broadcastToWindows('updates:not-available');
    });

    autoUpdater.on('download-progress', (progress) => {
        console.log(`Download progress: ${progress.percent}%`);
        broadcastToWindows('updates:downloadProgress', {
            percent: progress.percent,
            bytesPerSecond: progress.bytesPerSecond,
            total: progress.total,
            transferred: progress.transferred,
        });
    });

    autoUpdater.on('update-downloaded', () => {
        console.log('Update downloaded');
        updateDownloaded = true;
        broadcastToWindows('updates:downloaded');
    });

    autoUpdater.on('error', (error) => {
        console.error('Update error:', error);
        broadcastToWindows('updates:error', { message: error.message });
    });
}

/**
 * Broadcast message to all windows
 */
function broadcastToWindows(channel: string, data?: unknown): void {
    const windows = getAllWindows();
    for (const window of windows) {
        window.webContents.send(channel, data);
    }
}

/**
 * Check for updates
 */
export function checkForUpdates(): void {
    autoUpdater.checkForUpdates();
}

/**
 * Download update
 */
export function downloadUpdate(): void {
    autoUpdater.downloadUpdate();
}

/**
 * Install update and restart
 */
export function installUpdate(): void {
    if (updateDownloaded) {
        autoUpdater.quitAndInstall();
    }
}

/**
 * Get update info
 */
export function getUpdateInfo(): UpdateInfo | null {
    return updateInfo;
}

/**
 * Check if update is downloaded
 */
export function isUpdateDownloaded(): boolean {
    return updateDownloaded;
}

// ============================================
// Hot Update (for web content updates)
// ============================================

interface HotUpdateManifest {
    version: string;
    files: HotUpdateFile[];
    timestamp: number;
}

interface HotUpdateFile {
    path: string;
    hash: string;
    size: number;
}

let currentHotVersion: string | null = null;

/**
 * Check for hot updates
 */
export async function checkHotUpdate(manifestUrl: string): Promise<HotUpdateManifest | null> {
    try {
        const response = await fetch(manifestUrl);
        if (!response.ok) return null;

        const manifest: HotUpdateManifest = await response.json();

        // Compare versions
        if (currentHotVersion && manifest.version <= currentHotVersion) {
            return null;
        }

        return manifest;
    } catch (error) {
        console.error('Hot update check failed:', error);
        return null;
    }
}

/**
 * Apply hot update (reload web content)
 */
export function applyHotUpdate(window: BrowserWindow): void {
    // Clear cache and reload
    window.webContents.session.clearCache().then(() => {
        window.webContents.reload();
    });
}

/**
 * Compare semantic versions
 */
export function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;

        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }

    return 0;
}
