/**
 * Network Monitor Module
 * Monitors online/offline status and network quality
 */

import { BrowserWindow, net } from 'electron';
import { getAllWindows } from './window-manager';

// Network state
let isOnline = true;
let checkInterval: NodeJS.Timeout | null = null;
const PING_INTERVAL = 30000; // 30 seconds
const PING_TIMEOUT = 5000; // 5 seconds

// Ping endpoints
const PING_ENDPOINTS = [
    'https://www.google.com/generate_204',
    'https://www.cloudflare.com/cdn-cgi/trace',
    'https://connectivity.jiffoo.com/ping',
];

/**
 * Start network monitoring
 */
export function startNetworkMonitor(): void {
    // Initial check
    checkNetworkStatus();

    // Periodic check
    checkInterval = setInterval(checkNetworkStatus, PING_INTERVAL);
}

/**
 * Stop network monitoring
 */
export function stopNetworkMonitor(): void {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
}

/**
 * Check network status
 */
async function checkNetworkStatus(): Promise<void> {
    const wasOnline = isOnline;

    // Try to reach any of the ping endpoints
    for (const endpoint of PING_ENDPOINTS) {
        try {
            const online = await pingEndpoint(endpoint);
            if (online) {
                isOnline = true;
                break;
            }
        } catch {
            // Continue to next endpoint
        }
    }

    // If all endpoints failed, we're offline
    if (!PING_ENDPOINTS.some(async (ep) => await pingEndpoint(ep).catch(() => false))) {
        isOnline = false;
    }

    // Notify windows if status changed
    if (wasOnline !== isOnline) {
        notifyNetworkChange(isOnline);
    }
}

/**
 * Ping an endpoint
 */
async function pingEndpoint(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        const request = net.request({
            method: 'HEAD',
            url,
        });

        const timeout = setTimeout(() => {
            request.abort();
            resolve(false);
        }, PING_TIMEOUT);

        request.on('response', (response) => {
            clearTimeout(timeout);
            resolve(response.statusCode >= 200 && response.statusCode < 400);
        });

        request.on('error', () => {
            clearTimeout(timeout);
            resolve(false);
        });

        request.end();
    });
}

/**
 * Notify all windows of network change
 */
function notifyNetworkChange(online: boolean): void {
    const channel = online ? 'network:online' : 'network:offline';
    const windows = getAllWindows();

    for (const window of windows) {
        window.webContents.send(channel);
    }

    console.log(`Network status changed: ${online ? 'online' : 'offline'}`);
}

/**
 * Get current online status
 */
export function getOnlineStatus(): boolean {
    return isOnline;
}

/**
 * Force network check
 */
export async function forceNetworkCheck(): Promise<boolean> {
    await checkNetworkStatus();
    return isOnline;
}

// ============================================
// Network Quality Measurement
// ============================================

interface NetworkQuality {
    latency: number; // ms
    jitter: number;  // ms
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
}

let qualityHistory: number[] = [];
const MAX_HISTORY = 10;

/**
 * Measure network quality
 */
export async function measureNetworkQuality(): Promise<NetworkQuality> {
    if (!isOnline) {
        return { latency: 0, jitter: 0, quality: 'offline' };
    }

    const latencies: number[] = [];

    // Measure latency to multiple endpoints
    for (const endpoint of PING_ENDPOINTS.slice(0, 3)) {
        const start = Date.now();
        const success = await pingEndpoint(endpoint);
        const latency = Date.now() - start;

        if (success) {
            latencies.push(latency);
        }
    }

    if (latencies.length === 0) {
        return { latency: 0, jitter: 0, quality: 'offline' };
    }

    // Calculate average latency
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    // Add to history
    qualityHistory.push(avgLatency);
    if (qualityHistory.length > MAX_HISTORY) {
        qualityHistory.shift();
    }

    // Calculate jitter (variation in latency)
    const jitter = qualityHistory.length > 1
        ? calculateStandardDeviation(qualityHistory)
        : 0;

    // Determine quality level
    const quality = getQualityLevel(avgLatency, jitter);

    return {
        latency: Math.round(avgLatency),
        jitter: Math.round(jitter),
        quality,
    };
}

/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
}

/**
 * Determine quality level based on latency and jitter
 */
function getQualityLevel(latency: number, jitter: number): NetworkQuality['quality'] {
    if (latency < 50 && jitter < 10) return 'excellent';
    if (latency < 150 && jitter < 30) return 'good';
    if (latency < 300 && jitter < 50) return 'fair';
    return 'poor';
}

/**
 * Get network quality description
 */
export function getQualityDescription(quality: NetworkQuality['quality']): string {
    switch (quality) {
        case 'excellent':
            return 'Excellent connection - Fast and stable';
        case 'good':
            return 'Good connection - Suitable for all activities';
        case 'fair':
            return 'Fair connection - Some activities may be slow';
        case 'poor':
            return 'Poor connection - Performance may be degraded';
        case 'offline':
            return 'No internet connection';
        default:
            return 'Unknown';
    }
}
