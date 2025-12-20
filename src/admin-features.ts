/**
 * Admin App Features Module
 * Admin-specific desktop features
 */

import { ipcMain, Notification, shell } from 'electron';
import { getWindow } from './window-manager';
import { updateBadgeCount, flash } from './tray-manager';
import { showNotification } from './notification-manager';
import ElectronStore from 'electron-store';

// Admin store
const store = new ElectronStore<{
    pendingOrders: number;
    lowStockProducts: number;
    unreadMessages: number;
    dashboardRefreshInterval: number;
}>({
    name: 'admin-data',
    defaults: {
        pendingOrders: 0,
        lowStockProducts: 0,
        unreadMessages: 0,
        dashboardRefreshInterval: 300000, // 5 minutes
    },
});

// Dashboard refresh timer
let dashboardRefreshTimer: NodeJS.Timeout | null = null;

// ============================================
// Order Management Features
// ============================================

/**
 * Update pending orders count
 */
export function updateAdminPendingOrders(count: number): void {
    const previous = store.get('pendingOrders');
    store.set('pendingOrders', count);

    // Calculate total badge
    const totalBadge = count + store.get('lowStockProducts');
    updateBadgeCount(totalBadge);

    // Flash tray for new orders
    if (count > previous) {
        flash();
        const newOrders = count - previous;
        showNotification({
            id: `new-orders-${Date.now()}`,
            type: 'order',
            title: `${newOrders} New Order${newOrders > 1 ? 's' : ''}!`,
            body: `You have ${count} pending order${count > 1 ? 's' : ''} to process.`,
            data: { action: 'open-orders' },
        });
    }
}

/**
 * Get pending orders count
 */
export function getAdminPendingOrders(): number {
    return store.get('pendingOrders');
}

/**
 * Show new order notification
 */
export function showNewOrderNotification(
    orderId: string,
    orderNumber: string,
    customerName: string,
    total: number
): void {
    showNotification({
        id: `order-${orderId}`,
        type: 'order',
        title: `New Order #${orderNumber}`,
        body: `${customerName} placed an order for $${total.toFixed(2)}`,
        data: { action: 'open-order', orderId },
    });

    flash();
}

// ============================================
// Inventory Features
// ============================================

/**
 * Update low stock products count
 */
export function updateLowStockProducts(count: number): void {
    const previous = store.get('lowStockProducts');
    store.set('lowStockProducts', count);

    // Calculate total badge
    const totalBadge = store.get('pendingOrders') + count;
    updateBadgeCount(totalBadge);

    // Notify if low stock increased
    if (count > previous) {
        showNotification({
            id: `low-stock-${Date.now()}`,
            type: 'system',
            title: 'Low Stock Warning ⚠️',
            body: `${count} product${count > 1 ? 's are' : ' is'} running low on stock.`,
            data: { action: 'open-inventory' },
        });
    }
}

/**
 * Show out of stock notification
 */
export function showOutOfStockNotification(
    productId: string,
    productName: string
): void {
    showNotification({
        id: `out-of-stock-${productId}`,
        type: 'system',
        title: 'Out of Stock! 🚨',
        body: `${productName} is now out of stock.`,
        data: { action: 'open-product', productId },
    });
}

// ============================================
// Customer Features
// ============================================

/**
 * Update unread messages count
 */
export function updateUnreadMessages(count: number): void {
    const previous = store.get('unreadMessages');
    store.set('unreadMessages', count);

    if (count > previous) {
        const newMessages = count - previous;
        showNotification({
            id: `messages-${Date.now()}`,
            type: 'message',
            title: `${newMessages} New Message${newMessages > 1 ? 's' : ''}`,
            body: 'You have new customer messages to respond to.',
            data: { action: 'open-messages' },
        });
    }
}

/**
 * Show customer inquiry notification
 */
export function showCustomerInquiryNotification(
    customerId: string,
    customerName: string,
    subject: string
): void {
    showNotification({
        id: `inquiry-${customerId}-${Date.now()}`,
        type: 'message',
        title: `Message from ${customerName}`,
        body: subject,
        data: { action: 'open-customer', customerId },
    });
}

// ============================================
// Dashboard Features
// ============================================

/**
 * Start dashboard auto-refresh
 */
export function startDashboardRefresh(): void {
    stopDashboardRefresh();

    const interval = store.get('dashboardRefreshInterval');
    dashboardRefreshTimer = setInterval(() => {
        const window = getWindow('admin');
        if (window) {
            window.webContents.send('dashboard:refresh');
        }
    }, interval);
}

/**
 * Stop dashboard auto-refresh
 */
export function stopDashboardRefresh(): void {
    if (dashboardRefreshTimer) {
        clearInterval(dashboardRefreshTimer);
        dashboardRefreshTimer = null;
    }
}

/**
 * Set dashboard refresh interval
 */
export function setDashboardRefreshInterval(ms: number): void {
    store.set('dashboardRefreshInterval', ms);
    startDashboardRefresh();
}

// ============================================
// Report Features
// ============================================

/**
 * Open report in default app
 */
export function openReport(filePath: string): void {
    shell.openPath(filePath);
}

/**
 * Show report ready notification
 */
export function showReportReadyNotification(
    reportId: string,
    reportName: string,
    filePath: string
): void {
    showNotification({
        id: `report-${reportId}`,
        type: 'system',
        title: 'Report Ready 📊',
        body: `${reportName} is ready to download.`,
        data: { action: 'open-report', filePath },
    });
}

// ============================================
// IPC Handlers
// ============================================

/**
 * Register admin IPC handlers
 */
export function registerAdminIPCHandlers(): void {
    // Orders
    ipcMain.handle('admin:updatePendingOrders', (_, count: number) => {
        updateAdminPendingOrders(count);
    });

    ipcMain.handle('admin:getPendingOrders', () => {
        return getAdminPendingOrders();
    });

    ipcMain.handle('admin:showNewOrder', (_, orderId: string, orderNumber: string, customerName: string, total: number) => {
        showNewOrderNotification(orderId, orderNumber, customerName, total);
    });

    // Inventory
    ipcMain.handle('admin:updateLowStock', (_, count: number) => {
        updateLowStockProducts(count);
    });

    ipcMain.handle('admin:showOutOfStock', (_, productId: string, productName: string) => {
        showOutOfStockNotification(productId, productName);
    });

    // Messages
    ipcMain.handle('admin:updateUnreadMessages', (_, count: number) => {
        updateUnreadMessages(count);
    });

    ipcMain.handle('admin:showCustomerInquiry', (_, customerId: string, customerName: string, subject: string) => {
        showCustomerInquiryNotification(customerId, customerName, subject);
    });

    // Dashboard
    ipcMain.handle('admin:startDashboardRefresh', () => {
        startDashboardRefresh();
    });

    ipcMain.handle('admin:stopDashboardRefresh', () => {
        stopDashboardRefresh();
    });

    ipcMain.handle('admin:setDashboardRefreshInterval', (_, ms: number) => {
        setDashboardRefreshInterval(ms);
    });

    // Reports
    ipcMain.handle('admin:openReport', (_, filePath: string) => {
        openReport(filePath);
    });

    ipcMain.handle('admin:showReportReady', (_, reportId: string, reportName: string, filePath: string) => {
        showReportReadyNotification(reportId, reportName, filePath);
    });
}
