/**
 * Shop App Features Module
 * Shop-specific desktop features
 */

import { BrowserWindow, ipcMain, Notification } from 'electron';
import { getWindow } from './window-manager';
import { updateBadgeCount } from './tray-manager';
import { showNotification } from './notification-manager';
import ElectronStore from 'electron-store';

// Shop store
const store = new ElectronStore<{
    cartItems: number;
    wishlistItems: number;
    pendingOrders: number;
    recentSearches: string[];
}>({
    name: 'shop-data',
    defaults: {
        cartItems: 0,
        wishlistItems: 0,
        pendingOrders: 0,
        recentSearches: [],
    },
});

// ============================================
// Cart Features
// ============================================

/**
 * Update cart badge
 */
export function updateCartBadge(count: number): void {
    store.set('cartItems', count);
    updateBadgeCount(count);

    // Notify shop window
    const window = getWindow('shop');
    if (window) {
        window.webContents.send('cart:updated', { count });
    }
}

/**
 * Get cart count
 */
export function getCartCount(): number {
    return store.get('cartItems');
}

/**
 * Show cart reminder notification
 */
export function showCartReminder(): void {
    const count = store.get('cartItems');
    if (count > 0) {
        showNotification({
            id: 'cart-reminder',
            type: 'promotion',
            title: 'Items in your cart!',
            body: `You have ${count} item${count > 1 ? 's' : ''} waiting in your cart.`,
            data: { action: 'open-cart' },
        });
    }
}

// ============================================
// Order Features
// ============================================

/**
 * Update pending orders
 */
export function updatePendingOrders(count: number): void {
    const previous = store.get('pendingOrders');
    store.set('pendingOrders', count);

    // Show notification for new orders
    if (count > previous) {
        showNotification({
            id: `order-update-${Date.now()}`,
            type: 'order',
            title: 'Order Update',
            body: `You have ${count} order${count > 1 ? 's' : ''} in progress.`,
            data: { action: 'open-orders' },
        });
    }
}

/**
 * Show order status notification
 */
export function showOrderStatusNotification(
    orderId: string,
    orderNumber: string,
    status: string
): void {
    const statusMessages: Record<string, string> = {
        confirmed: 'Your order has been confirmed!',
        processing: 'Your order is being prepared.',
        shipped: 'Your order has been shipped!',
        delivered: 'Your order has been delivered!',
        cancelled: 'Your order has been cancelled.',
    };

    showNotification({
        id: `order-${orderId}`,
        type: 'order',
        title: `Order #${orderNumber}`,
        body: statusMessages[status] || `Order status: ${status}`,
        data: { action: 'open-order', orderId },
    });
}

// ============================================
// Wishlist Features
// ============================================

/**
 * Update wishlist count
 */
export function updateWishlistCount(count: number): void {
    store.set('wishlistItems', count);
}

/**
 * Show wishlist price drop notification
 */
export function showPriceDropNotification(
    productId: string,
    productName: string,
    originalPrice: number,
    newPrice: number
): void {
    const discount = Math.round((1 - newPrice / originalPrice) * 100);

    showNotification({
        id: `price-drop-${productId}`,
        type: 'promotion',
        title: 'Price Drop Alert! 🔥',
        body: `${productName} is now ${discount}% off! Was $${originalPrice}, now $${newPrice}`,
        data: { action: 'open-product', productId },
    });
}

// ============================================
// Search Features
// ============================================

/**
 * Add to recent searches
 */
export function addRecentSearch(query: string): void {
    const searches = store.get('recentSearches');
    const updated = [query, ...searches.filter(s => s !== query)].slice(0, 10);
    store.set('recentSearches', updated);
}

/**
 * Get recent searches
 */
export function getRecentSearches(): string[] {
    return store.get('recentSearches');
}

/**
 * Clear recent searches
 */
export function clearRecentSearches(): void {
    store.set('recentSearches', []);
}

// ============================================
// Promotion Features
// ============================================

/**
 * Show promotion notification
 */
export function showPromotionNotification(
    promoId: string,
    title: string,
    description: string,
    url?: string
): void {
    showNotification({
        id: `promo-${promoId}`,
        type: 'promotion',
        title: `🎉 ${title}`,
        body: description,
        data: { action: 'open-url', url: url || '/promotions' },
    });
}

// ============================================
// IPC Handlers
// ============================================

/**
 * Register shop IPC handlers
 */
export function registerShopIPCHandlers(): void {
    // Cart
    ipcMain.handle('shop:updateCartBadge', (_, count: number) => {
        updateCartBadge(count);
    });

    ipcMain.handle('shop:getCartCount', () => {
        return getCartCount();
    });

    // Orders
    ipcMain.handle('shop:updatePendingOrders', (_, count: number) => {
        updatePendingOrders(count);
    });

    ipcMain.handle('shop:showOrderStatus', (_, orderId: string, orderNumber: string, status: string) => {
        showOrderStatusNotification(orderId, orderNumber, status);
    });

    // Wishlist
    ipcMain.handle('shop:updateWishlistCount', (_, count: number) => {
        updateWishlistCount(count);
    });

    ipcMain.handle('shop:showPriceDrop', (_, productId: string, name: string, originalPrice: number, newPrice: number) => {
        showPriceDropNotification(productId, name, originalPrice, newPrice);
    });

    // Search
    ipcMain.handle('shop:addRecentSearch', (_, query: string) => {
        addRecentSearch(query);
    });

    ipcMain.handle('shop:getRecentSearches', () => {
        return getRecentSearches();
    });

    ipcMain.handle('shop:clearRecentSearches', () => {
        clearRecentSearches();
    });

    // Promotions
    ipcMain.handle('shop:showPromotion', (_, promoId: string, title: string, description: string, url?: string) => {
        showPromotionNotification(promoId, title, description, url);
    });
}
