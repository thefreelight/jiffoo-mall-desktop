/**
 * Tray Manager Module
 * Manages system tray icon and menu for Jiffoo Mall Desktop
 */

import { app, Menu, Tray, nativeImage } from 'electron';
import path from 'path';
import { AppType, createWindow, focusWindow, getAllWindows, toggleWindow } from './window-manager';

let tray: Tray | null = null;
let badgeCount = 0;

// Tray icon paths
const TRAY_ICON_PATH = path.join(__dirname, '..', 'assets', 'tray-icon.png');
const TRAY_ICON_TEMPLATE_PATH = path.join(__dirname, '..', 'assets', 'tray-iconTemplate.png');

/**
 * Create system tray
 */
export function createTray(): Tray {
    if (tray) {
        return tray;
    }

    // Use template image on macOS for dark mode support
    const iconPath = process.platform === 'darwin'
        ? TRAY_ICON_TEMPLATE_PATH
        : TRAY_ICON_PATH;

    // Create tray with default icon if custom icon doesn't exist
    let icon;
    try {
        icon = nativeImage.createFromPath(iconPath);
        if (icon.isEmpty()) {
            // Create a simple default icon
            icon = nativeImage.createEmpty();
        }
    } catch {
        icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);
    tray.setToolTip('Jiffoo Mall Desktop');

    // Update context menu
    updateTrayMenu();

    // Click behavior
    tray.on('click', () => {
        const windows = getAllWindows();
        if (windows.length > 0) {
            const firstWindow = windows[0];
            if (firstWindow.isVisible()) {
                firstWindow.hide();
            } else {
                firstWindow.show();
                firstWindow.focus();
            }
        }
    });

    // Double click to show all windows
    tray.on('double-click', () => {
        const windows = getAllWindows();
        for (const window of windows) {
            window.show();
            window.focus();
        }
    });

    return tray;
}

/**
 * Update tray context menu
 */
export function updateTrayMenu(): void {
    if (!tray) return;

    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: 'Jiffoo Mall Desktop',
            enabled: false,
        },
        { type: 'separator' },
        {
            label: 'Shop',
            click: () => createWindow('shop'),
        },
        {
            label: 'Admin',
            click: () => createWindow('admin'),
        },
        {
            label: 'Super Admin',
            click: () => createWindow('super-admin'),
        },
        { type: 'separator' },
        {
            label: 'Show All Windows',
            click: () => {
                const windows = getAllWindows();
                for (const window of windows) {
                    window.show();
                    window.focus();
                }
            },
        },
        {
            label: 'Hide All Windows',
            click: () => {
                const windows = getAllWindows();
                for (const window of windows) {
                    window.hide();
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Alt+F4',
            click: () => {
                app.quit();
            },
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    tray.setContextMenu(menu);
}

/**
 * Set badge count on tray icon
 */
export function setBadgeCount(count: number): void {
    badgeCount = count;

    if (!tray) return;

    // On macOS, use dock badge
    if (process.platform === 'darwin') {
        app.dock?.setBadge(count > 0 ? String(count) : '');
    }

    // Update tooltip with count
    if (count > 0) {
        tray.setToolTip(`Jiffoo Mall Desktop (${count} notifications)`);
    } else {
        tray.setToolTip('Jiffoo Mall Desktop');
    }
}

/**
 * Get current badge count
 */
export function getBadgeCount(): number {
    return badgeCount;
}

/**
 * Destroy tray
 */
export function destroyTray(): void {
    if (tray) {
        tray.destroy();
        tray = null;
    }
}

/**
 * Flash tray icon (Windows only)
 */
export function flashTray(): void {
    const windows = getAllWindows();
    for (const window of windows) {
        window.flashFrame(true);
    }
}

// Alias exports for backward compatibility
export const updateBadgeCount = setBadgeCount;
export const flash = flashTray;

