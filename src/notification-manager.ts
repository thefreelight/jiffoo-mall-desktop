/**
 * Notification Manager Module
 * Handles native notifications for Jiffoo Mall Desktop
 */

import { Notification, nativeImage, shell } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { setBadgeCount, getBadgeCount, flashTray } from './tray-manager';
import { focusWindow, AppType } from './window-manager';

// Notification preferences store
const store = new Store<NotificationPreferences>({
    name: 'notification-preferences',
    defaults: {
        enabled: true,
        sound: true,
        orderNotifications: true,
        promotionNotifications: true,
        systemNotifications: true,
    },
});

interface NotificationPreferences {
    enabled: boolean;
    sound: boolean;
    orderNotifications: boolean;
    promotionNotifications: boolean;
    systemNotifications: boolean;
}

export type NotificationType = 'order' | 'promotion' | 'system' | 'message';

interface NotificationOptions {
    id?: string;
    type: NotificationType;
    title: string;
    body: string;
    icon?: string;
    appType?: AppType;
    url?: string;
    data?: Record<string, unknown>;
    urgency?: 'low' | 'normal' | 'critical';
}

// Icon path
const NOTIFICATION_ICON_PATH = path.join(__dirname, '..', 'assets', 'notification-icon.png');

/**
 * Check if notification type is enabled
 */
function isNotificationTypeEnabled(type: NotificationType): boolean {
    const prefs = getPreferences();

    if (!prefs.enabled) return false;

    switch (type) {
        case 'order':
            return prefs.orderNotifications;
        case 'promotion':
            return prefs.promotionNotifications;
        case 'system':
            return prefs.systemNotifications;
        default:
            return true;
    }
}

/**
 * Show a native notification
 */
export function showNotification(options: NotificationOptions): Notification | null {
    // Check if notifications are enabled
    if (!isNotificationTypeEnabled(options.type)) {
        return null;
    }

    // Check if notifications are supported
    if (!Notification.isSupported()) {
        console.warn('Notifications are not supported on this system');
        return null;
    }

    // Create notification icon
    let icon;
    try {
        icon = options.icon
            ? nativeImage.createFromPath(options.icon)
            : nativeImage.createFromPath(NOTIFICATION_ICON_PATH);
    } catch {
        icon = undefined;
    }

    const notification = new Notification({
        title: options.title,
        body: options.body,
        icon,
        silent: !store.get('sound'),
    });

    // Handle click
    notification.on('click', () => {
        if (options.url) {
            shell.openExternal(options.url);
        } else if (options.appType) {
            focusWindow(options.appType);
        }
    });

    // Update badge count
    const currentCount = getBadgeCount();
    setBadgeCount(currentCount + 1);

    // Flash tray
    flashTray();

    notification.show();
    return notification;
}

/**
 * Show order notification
 */
export function showOrderNotification(
    title: string,
    body: string,
    orderId?: string
): Notification | null {
    return showNotification({
        type: 'order',
        title,
        body,
        appType: 'admin',
        data: { orderId },
    });
}

/**
 * Show promotion notification
 */
export function showPromotionNotification(
    title: string,
    body: string,
    url?: string
): Notification | null {
    return showNotification({
        type: 'promotion',
        title,
        body,
        appType: 'shop',
        url,
    });
}

/**
 * Show system notification
 */
export function showSystemNotification(
    title: string,
    body: string
): Notification | null {
    return showNotification({
        type: 'system',
        title,
        body,
        appType: 'super-admin',
    });
}

/**
 * Get notification preferences
 */
export function getPreferences(): NotificationPreferences {
    return {
        enabled: store.get('enabled'),
        sound: store.get('sound'),
        orderNotifications: store.get('orderNotifications'),
        promotionNotifications: store.get('promotionNotifications'),
        systemNotifications: store.get('systemNotifications'),
    };
}

/**
 * Update notification preferences
 */
export function updatePreferences(prefs: Partial<NotificationPreferences>): void {
    if (prefs.enabled !== undefined) store.set('enabled', prefs.enabled);
    if (prefs.sound !== undefined) store.set('sound', prefs.sound);
    if (prefs.orderNotifications !== undefined) store.set('orderNotifications', prefs.orderNotifications);
    if (prefs.promotionNotifications !== undefined) store.set('promotionNotifications', prefs.promotionNotifications);
    if (prefs.systemNotifications !== undefined) store.set('systemNotifications', prefs.systemNotifications);
}

/**
 * Clear badge count
 */
export function clearBadge(): void {
    setBadgeCount(0);
}
