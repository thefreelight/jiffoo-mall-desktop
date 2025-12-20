/**
 * Storage Manager Module
 * Handles data persistence with encryption support for sensitive data
 */

import { safeStorage } from 'electron';
import Store from 'electron-store';

// Regular storage for non-sensitive data
const regularStore = new Store({
    name: 'app-data',
});

// Secure storage for sensitive data (uses OS keychain)
const secureStore = new Store({
    name: 'secure-data',
    encryptionKey: 'jiffoo-desktop-secure-key', // This is encrypted by electron-store
});

/**
 * Storage key prefixes
 */
const SECURE_PREFIX = 'secure:';

/**
 * Check if secure storage is available
 */
export function isSecureStorageAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
}

/**
 * Store regular data
 */
export function set<T>(key: string, value: T): void {
    regularStore.set(key, value);
}

/**
 * Get regular data
 */
export function get<T>(key: string, defaultValue?: T): T | undefined {
    return regularStore.get(key, defaultValue) as T | undefined;
}

/**
 * Delete regular data
 */
export function remove(key: string): void {
    regularStore.delete(key);
}

/**
 * Check if key exists
 */
export function has(key: string): boolean {
    return regularStore.has(key);
}

/**
 * Clear all regular data
 */
export function clear(): void {
    regularStore.clear();
}

/**
 * Store sensitive data securely
 */
export function setSecure(key: string, value: string): void {
    if (isSecureStorageAvailable()) {
        // Encrypt using OS keychain
        const encrypted = safeStorage.encryptString(value);
        secureStore.set(key, encrypted.toString('base64'));
    } else {
        // Fallback to regular encrypted store
        secureStore.set(key, value);
    }
}

/**
 * Get sensitive data
 */
export function getSecure(key: string): string | null {
    const value = secureStore.get(key);
    if (!value) return null;

    if (isSecureStorageAvailable()) {
        try {
            const encrypted = Buffer.from(value as string, 'base64');
            return safeStorage.decryptString(encrypted);
        } catch {
            return null;
        }
    }

    return value as string;
}

/**
 * Delete sensitive data
 */
export function removeSecure(key: string): void {
    secureStore.delete(key);
}

/**
 * Clear all sensitive data
 */
export function clearSecure(): void {
    secureStore.clear();
}

/**
 * Store authentication token securely
 */
export function storeAuthToken(appType: string, token: string): void {
    setSecure(`auth:${appType}:token`, token);
}

/**
 * Get authentication token
 */
export function getAuthToken(appType: string): string | null {
    return getSecure(`auth:${appType}:token`);
}

/**
 * Remove authentication token
 */
export function removeAuthToken(appType: string): void {
    removeSecure(`auth:${appType}:token`);
}

/**
 * Store user preferences
 */
export function setPreference<T>(key: string, value: T): void {
    set(`preferences:${key}`, value);
}

/**
 * Get user preference
 */
export function getPreference<T>(key: string, defaultValue?: T): T | undefined {
    return get<T>(`preferences:${key}`, defaultValue);
}

/**
 * Offline cache management
 */
const CACHE_PREFIX = 'cache:';
const CACHE_EXPIRY_PREFIX = 'cache:expiry:';

/**
 * Cache data with expiry
 */
export function cacheData<T>(key: string, data: T, ttlSeconds: number): void {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;
    const expiryTime = Date.now() + (ttlSeconds * 1000);

    set(cacheKey, data);
    set(expiryKey, expiryTime);
}

/**
 * Get cached data (returns null if expired)
 */
export function getCachedData<T>(key: string): T | null {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;

    const expiryTime = get<number>(expiryKey);
    if (!expiryTime || Date.now() > expiryTime) {
        // Expired, clean up
        remove(cacheKey);
        remove(expiryKey);
        return null;
    }

    return get<T>(cacheKey) ?? null;
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
    const store = regularStore.store;
    const now = Date.now();

    for (const key of Object.keys(store)) {
        if (key.startsWith(CACHE_EXPIRY_PREFIX)) {
            const expiryTime = store[key] as number;
            if (now > expiryTime) {
                const dataKey = key.replace(CACHE_EXPIRY_PREFIX, CACHE_PREFIX);
                remove(dataKey);
                remove(key);
            }
        }
    }
}

/**
 * Offline action queue
 */
interface OfflineAction {
    id: string;
    type: string;
    payload: unknown;
    timestamp: number;
    retries: number;
}

const OFFLINE_QUEUE_KEY = 'offline:queue';

/**
 * Add action to offline queue
 */
export function queueOfflineAction(type: string, payload: unknown): string {
    const queue = get<OfflineAction[]>(OFFLINE_QUEUE_KEY, []) || [];
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    queue.push({
        id,
        type,
        payload,
        timestamp: Date.now(),
        retries: 0,
    });

    set(OFFLINE_QUEUE_KEY, queue);
    return id;
}

/**
 * Get offline action queue
 */
export function getOfflineQueue(): OfflineAction[] {
    return get<OfflineAction[]>(OFFLINE_QUEUE_KEY, []) || [];
}

/**
 * Remove action from offline queue
 */
export function removeFromOfflineQueue(id: string): void {
    const queue = get<OfflineAction[]>(OFFLINE_QUEUE_KEY, []) || [];
    const filtered = queue.filter(action => action.id !== id);
    set(OFFLINE_QUEUE_KEY, filtered);
}

/**
 * Clear offline queue
 */
export function clearOfflineQueue(): void {
    set(OFFLINE_QUEUE_KEY, []);
}
