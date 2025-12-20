/**
 * Deep Link Handler Module
 * Handles custom protocol deep links (jiffoo://)
 */

import { app, BrowserWindow } from 'electron';
import { createWindow, getWindow, focusWindow, AppType } from './window-manager';

// Custom protocol name
const PROTOCOL_NAME = 'jiffoo';

// Deep link queue for when app is not ready
let pendingDeepLinks: string[] = [];
let isAppReady = false;

/**
 * Register custom protocol
 */
export function registerProtocol(): void {
    // Register protocol for development
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            app.setAsDefaultProtocolClient(PROTOCOL_NAME, process.execPath, [process.argv[1]]);
        }
    } else {
        app.setAsDefaultProtocolClient(PROTOCOL_NAME);
    }
}

/**
 * Mark app as ready to handle deep links
 */
export function setAppReady(): void {
    isAppReady = true;

    // Process any pending deep links
    while (pendingDeepLinks.length > 0) {
        const link = pendingDeepLinks.shift();
        if (link) {
            handleDeepLink(link);
        }
    }
}

/**
 * Queue deep link for later processing
 */
export function queueDeepLink(url: string): void {
    if (isAppReady) {
        handleDeepLink(url);
    } else {
        pendingDeepLinks.push(url);
    }
}

/**
 * Handle deep link URL
 * Format: jiffoo://[appType]/[path]?[params]
 * Examples:
 *   jiffoo://shop/product/123
 *   jiffoo://admin/orders/456
 *   jiffoo://super-admin/settings
 */
export function handleDeepLink(url: string): void {
    try {
        const parsed = new URL(url);

        // Get app type from host
        const appType = parsed.host as AppType;
        if (!['shop', 'admin', 'super-admin'].includes(appType)) {
            console.warn(`Unknown app type in deep link: ${appType}`);
            return;
        }

        // Get path
        const path = parsed.pathname || '/';

        // Get search params
        const params = Object.fromEntries(parsed.searchParams.entries());

        console.log(`Handling deep link: app=${appType}, path=${path}, params=`, params);

        // Create or focus window
        const window = createWindow(appType);

        // Wait for window to load, then navigate
        const navigateWhenReady = () => {
            window.webContents.send('deep-link', {
                path: path,
                params: params,
                fullUrl: url,
            });
        };

        if (window.webContents.isLoading()) {
            window.webContents.once('did-finish-load', navigateWhenReady);
        } else {
            navigateWhenReady();
        }
    } catch (error) {
        console.error('Failed to handle deep link:', error);
    }
}

/**
 * Parse deep link route
 */
export interface DeepLinkRoute {
    appType: AppType;
    path: string;
    params: Record<string, string>;
    action?: string;
}

export function parseDeepLink(url: string): DeepLinkRoute | null {
    try {
        const parsed = new URL(url);
        const appType = parsed.host as AppType;

        if (!['shop', 'admin', 'super-admin'].includes(appType)) {
            return null;
        }

        const path = parsed.pathname || '/';
        const params = Object.fromEntries(parsed.searchParams.entries());

        // Extract action from path (e.g., /product/123 -> action = 'product')
        const pathParts = path.split('/').filter(Boolean);
        const action = pathParts[0] || undefined;

        return {
            appType,
            path,
            params,
            action,
        };
    } catch {
        return null;
    }
}

/**
 * Build deep link URL
 */
export function buildDeepLink(
    appType: AppType,
    path: string,
    params?: Record<string, string>
): string {
    let url = `${PROTOCOL_NAME}://${appType}${path}`;

    if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }

    return url;
}

// ============================================
// Deep Link Actions
// ============================================

/**
 * Common deep link actions
 */
export const DeepLinkActions = {
    // Shop app actions
    openProduct: (productId: string) =>
        buildDeepLink('shop', `/product/${productId}`),

    openCategory: (categoryId: string) =>
        buildDeepLink('shop', `/category/${categoryId}`),

    openCart: () =>
        buildDeepLink('shop', '/cart'),

    openOrder: (orderId: string) =>
        buildDeepLink('shop', `/order/${orderId}`),

    openSearch: (query?: string) =>
        buildDeepLink('shop', '/search', query ? { q: query } : undefined),

    // Admin app actions
    openAdminOrder: (orderId: string) =>
        buildDeepLink('admin', `/orders/${orderId}`),

    openAdminProduct: (productId: string) =>
        buildDeepLink('admin', `/products/${productId}`),

    openAdminSettings: () =>
        buildDeepLink('admin', '/settings'),

    // Super admin actions
    openTenant: (tenantId: string) =>
        buildDeepLink('super-admin', `/tenants/${tenantId}`),

    openSystemSettings: () =>
        buildDeepLink('super-admin', '/settings'),
};
