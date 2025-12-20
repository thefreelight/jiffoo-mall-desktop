/**
 * Super Admin App Features Module
 * Super Admin-specific desktop features
 */

import { ipcMain, shell, dialog, BrowserWindow } from 'electron';
import { getWindow } from './window-manager';
import { updateBadgeCount, flash } from './tray-manager';
import { showNotification } from './notification-manager';
import ElectronStore from 'electron-store';

// Super Admin store
const store = new ElectronStore<{
    pendingTenantRequests: number;
    systemAlerts: number;
    pendingPluginReviews: number;
    activeSessions: number;
}>({
    name: 'super-admin-data',
    defaults: {
        pendingTenantRequests: 0,
        systemAlerts: 0,
        pendingPluginReviews: 0,
        activeSessions: 0,
    },
});

// ============================================
// Tenant Management Features
// ============================================

/**
 * Update pending tenant requests
 */
export function updatePendingTenantRequests(count: number): void {
    const previous = store.get('pendingTenantRequests');
    store.set('pendingTenantRequests', count);

    // Calculate total badge
    const totalBadge = count + store.get('systemAlerts');
    updateBadgeCount(totalBadge);

    // Notify for new requests
    if (count > previous) {
        const newRequests = count - previous;
        showNotification({
            id: `tenant-requests-${Date.now()}`,
            type: 'system',
            title: `${newRequests} New Tenant Request${newRequests > 1 ? 's' : ''}`,
            body: 'New tenant registration requests pending approval.',
            data: { action: 'open-tenant-requests' },
        });
        flash();
    }
}

/**
 * Show new tenant notification
 */
export function showNewTenantNotification(
    tenantId: string,
    tenantName: string,
    email: string
): void {
    showNotification({
        id: `new-tenant-${tenantId}`,
        type: 'system',
        title: 'New Tenant Registration',
        body: `${tenantName} (${email}) has requested to join.`,
        data: { action: 'open-tenant', tenantId },
    });
    flash();
}

/**
 * Show tenant status change notification
 */
export function showTenantStatusNotification(
    tenantId: string,
    tenantName: string,
    status: 'approved' | 'suspended' | 'deleted'
): void {
    const messages = {
        approved: 'has been approved and is now active.',
        suspended: 'has been suspended.',
        deleted: 'has been removed from the platform.',
    };

    showNotification({
        id: `tenant-status-${tenantId}`,
        type: 'system',
        title: `Tenant ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        body: `${tenantName} ${messages[status]}`,
        data: { action: 'open-tenant', tenantId },
    });
}

// ============================================
// System Monitoring Features
// ============================================

/**
 * Update system alerts
 */
export function updateSystemAlerts(count: number): void {
    const previous = store.get('systemAlerts');
    store.set('systemAlerts', count);

    // Calculate total badge
    const totalBadge = store.get('pendingTenantRequests') + count;
    updateBadgeCount(totalBadge);

    // Critical alert notification
    if (count > previous) {
        showNotification({
            id: `system-alerts-${Date.now()}`,
            type: 'system',
            title: '⚠️ System Alert',
            body: `${count} system alert${count > 1 ? 's' : ''} require attention.`,
            data: { action: 'open-system-alerts' },
            urgency: 'critical',
        });
        flash();
    }
}

/**
 * Show critical system alert
 */
export function showCriticalAlert(
    alertId: string,
    title: string,
    message: string,
    severity: 'warning' | 'error' | 'critical'
): void {
    const icons = {
        warning: '⚠️',
        error: '❌',
        critical: '🚨',
    };

    showNotification({
        id: `critical-${alertId}`,
        type: 'system',
        title: `${icons[severity]} ${title}`,
        body: message,
        data: { action: 'open-alert', alertId },
        urgency: severity === 'critical' ? 'critical' : 'normal',
    });

    if (severity === 'critical') {
        flash();

        // Also show dialog for critical alerts
        const window = getWindow('super-admin');
        if (window) {
            dialog.showMessageBox(window, {
                type: 'error',
                title: `${icons[severity]} ${title}`,
                message: message,
                buttons: ['View Details', 'Dismiss'],
            }).then(({ response }) => {
                if (response === 0) {
                    window.webContents.send('navigate', `/alerts/${alertId}`);
                }
            });
        }
    }
}

/**
 * Show server health alert
 */
export function showServerHealthAlert(
    serverId: string,
    serverName: string,
    metric: string,
    value: number,
    threshold: number
): void {
    showNotification({
        id: `health-${serverId}-${metric}`,
        type: 'system',
        title: `Server Health Warning`,
        body: `${serverName}: ${metric} at ${value}% (threshold: ${threshold}%)`,
        data: { action: 'open-server', serverId },
    });
}

// ============================================
// Plugin Management Features
// ============================================

/**
 * Update pending plugin reviews
 */
export function updatePendingPluginReviews(count: number): void {
    store.set('pendingPluginReviews', count);
}

/**
 * Show plugin submission notification
 */
export function showPluginSubmissionNotification(
    pluginId: string,
    pluginName: string,
    developerName: string
): void {
    showNotification({
        id: `plugin-submission-${pluginId}`,
        type: 'system',
        title: 'New Plugin Submission',
        body: `${pluginName} by ${developerName} is pending review.`,
        data: { action: 'open-plugin', pluginId },
    });
}

/**
 * Show plugin status change notification
 */
export function showPluginStatusNotification(
    pluginId: string,
    pluginName: string,
    status: 'approved' | 'rejected' | 'suspended'
): void {
    const messages = {
        approved: 'has been approved and published.',
        rejected: 'has been rejected.',
        suspended: 'has been suspended.',
    };

    showNotification({
        id: `plugin-status-${pluginId}`,
        type: 'system',
        title: `Plugin ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        body: `${pluginName} ${messages[status]}`,
        data: { action: 'open-plugin', pluginId },
    });
}

// ============================================
// Session Management Features
// ============================================

/**
 * Update active sessions
 */
export function updateActiveSessions(count: number): void {
    store.set('activeSessions', count);
}

/**
 * Show suspicious login notification
 */
export function showSuspiciousLoginNotification(
    sessionId: string,
    userId: string,
    userName: string,
    location: string,
    reason: string
): void {
    showNotification({
        id: `suspicious-login-${sessionId}`,
        type: 'system',
        title: '🔒 Suspicious Login Detected',
        body: `${userName} from ${location}: ${reason}`,
        data: { action: 'open-session', sessionId, userId },
        urgency: 'critical',
    });
    flash();
}

// ============================================
// Report & Analytics Features
// ============================================

/**
 * Open analytics in browser
 */
export function openAnalyticsDashboard(dashboardId: string): void {
    shell.openExternal(`https://analytics.jiffoo.com/dashboard/${dashboardId}`);
}

/**
 * Export system report
 */
export async function exportSystemReport(
    reportType: 'tenants' | 'revenue' | 'plugins' | 'audit'
): Promise<string | null> {
    const window = getWindow('super-admin');
    if (!window) return null;

    const result = await dialog.showSaveDialog(window, {
        title: 'Export Report',
        defaultPath: `jiffoo-${reportType}-report-${Date.now()}.csv`,
        filters: [
            { name: 'CSV', extensions: ['csv'] },
            { name: 'Excel', extensions: ['xlsx'] },
            { name: 'PDF', extensions: ['pdf'] },
        ],
    });

    return result.canceled ? null : (result.filePath || null);
}

// ============================================
// IPC Handlers
// ============================================

/**
 * Register super admin IPC handlers
 */
export function registerSuperAdminIPCHandlers(): void {
    // Tenants
    ipcMain.handle('superadmin:updatePendingTenantRequests', (_, count: number) => {
        updatePendingTenantRequests(count);
    });

    ipcMain.handle('superadmin:showNewTenant', (_, tenantId: string, tenantName: string, email: string) => {
        showNewTenantNotification(tenantId, tenantName, email);
    });

    ipcMain.handle('superadmin:showTenantStatus', (_, tenantId: string, tenantName: string, status: 'approved' | 'suspended' | 'deleted') => {
        showTenantStatusNotification(tenantId, tenantName, status);
    });

    // System
    ipcMain.handle('superadmin:updateSystemAlerts', (_, count: number) => {
        updateSystemAlerts(count);
    });

    ipcMain.handle('superadmin:showCriticalAlert', (_, alertId: string, title: string, message: string, severity: 'warning' | 'error' | 'critical') => {
        showCriticalAlert(alertId, title, message, severity);
    });

    ipcMain.handle('superadmin:showServerHealth', (_, serverId: string, serverName: string, metric: string, value: number, threshold: number) => {
        showServerHealthAlert(serverId, serverName, metric, value, threshold);
    });

    // Plugins
    ipcMain.handle('superadmin:updatePendingPluginReviews', (_, count: number) => {
        updatePendingPluginReviews(count);
    });

    ipcMain.handle('superadmin:showPluginSubmission', (_, pluginId: string, pluginName: string, developerName: string) => {
        showPluginSubmissionNotification(pluginId, pluginName, developerName);
    });

    ipcMain.handle('superadmin:showPluginStatus', (_, pluginId: string, pluginName: string, status: 'approved' | 'rejected' | 'suspended') => {
        showPluginStatusNotification(pluginId, pluginName, status);
    });

    // Sessions
    ipcMain.handle('superadmin:updateActiveSessions', (_, count: number) => {
        updateActiveSessions(count);
    });

    ipcMain.handle('superadmin:showSuspiciousLogin', (_, sessionId: string, userId: string, userName: string, location: string, reason: string) => {
        showSuspiciousLoginNotification(sessionId, userId, userName, location, reason);
    });

    // Reports
    ipcMain.handle('superadmin:openAnalytics', (_, dashboardId: string) => {
        openAnalyticsDashboard(dashboardId);
    });

    ipcMain.handle('superadmin:exportReport', (_, reportType: 'tenants' | 'revenue' | 'plugins' | 'audit') => {
        return exportSystemReport(reportType);
    });
}
