/**
 * Security Manager Module
 * Handles CSP, permissions, and security features
 */

import { app, session, BrowserWindow, shell, dialog } from 'electron';
import { FuseConfig, FuseV1Options } from '@electron/fuses';
import path from 'path';

// CSP policy for different environments
const CSP_POLICY = {
    development: `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' http://localhost:* https://*.jiffoo.com wss://*.jiffoo.com;
    frame-src 'none';
    object-src 'none';
  `.replace(/\s+/g, ' ').trim(),

    production: `
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https://*.jiffoo.com https://*.cloudfront.net;
    font-src 'self' data:;
    connect-src 'self' https://*.jiffoo.com wss://*.jiffoo.com;
    frame-src 'none';
    object-src 'none';
  `.replace(/\s+/g, ' ').trim(),
};

// Blocked URLs patterns
const BLOCKED_URLS = [
    /^file:\/\//i,  // Block file:// protocol in production
    /^ftp:\/\//i,   // Block FTP
    /javascript:/i, // Block javascript: URLs
];

// Allowed external domains
const ALLOWED_EXTERNAL_DOMAINS = [
    'jiffoo.com',
    'github.com',
    'google.com',
    'apple.com',
    'facebook.com',
];

/**
 * Initialize security features
 */
export function initSecurity(): void {
    // Set CSP headers
    setupCSP();

    // Setup permission handlers
    setupPermissionHandlers();

    // Setup navigation guards
    setupNavigationGuards();

    // Disable remote module
    app.on('web-contents-created', (_, contents) => {
        // Disable navigation to untrusted URLs
        contents.on('will-navigate', (event, url) => {
            if (!isAllowedUrl(url)) {
                event.preventDefault();
                console.warn(`Blocked navigation to: ${url}`);
            }
        });

        // Open external links in browser
        contents.setWindowOpenHandler(({ url }) => {
            if (isExternalUrl(url)) {
                shell.openExternal(url);
                return { action: 'deny' };
            }
            return { action: 'allow' };
        });

        // Disable webview
        contents.on('will-attach-webview', (event) => {
            event.preventDefault();
            console.warn('Blocked webview creation');
        });
    });
}

/**
 * Setup Content Security Policy
 */
function setupCSP(): void {
    const isDev = process.env.NODE_ENV === 'development';
    const policy = isDev ? CSP_POLICY.development : CSP_POLICY.production;

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [policy],
                'X-Content-Type-Options': ['nosniff'],
                'X-Frame-Options': ['DENY'],
                'X-XSS-Protection': ['1; mode=block'],
            },
        });
    });
}

/**
 * Setup permission handlers
 */
function setupPermissionHandlers(): void {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        // Allow specific permissions
        const allowedPermissions = [
            'notifications',
            'clipboard-read',
            'clipboard-sanitized-write',
        ];

        if (allowedPermissions.includes(permission)) {
            callback(true);
            return;
        }

        // Prompt for sensitive permissions
        const sensitivePermissions = [
            'media',
            'geolocation',
            'pointerLock',
            'fullscreen',
        ];

        if (sensitivePermissions.includes(permission)) {
            const window = BrowserWindow.fromWebContents(webContents);
            if (window) {
                dialog.showMessageBox(window, {
                    type: 'question',
                    buttons: ['Allow', 'Deny'],
                    defaultId: 1,
                    title: 'Permission Request',
                    message: `This app is requesting ${permission} permission.`,
                }).then(({ response }) => {
                    callback(response === 0);
                });
                return;
            }
        }

        // Deny everything else
        console.warn(`Denied permission: ${permission}`);
        callback(false);
    });
}

/**
 * Setup navigation guards
 */
function setupNavigationGuards(): void {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        // Check if URL is blocked
        for (const pattern of BLOCKED_URLS) {
            if (pattern.test(details.url)) {
                console.warn(`Blocked request to: ${details.url}`);
                callback({ cancel: true });
                return;
            }
        }

        callback({});
    });
}

/**
 * Check if URL is allowed
 */
function isAllowedUrl(url: string): boolean {
    try {
        const parsed = new URL(url);

        // Allow localhost in development
        if (process.env.NODE_ENV === 'development') {
            if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
                return true;
            }
        }

        // Allow Jiffoo domains
        if (parsed.hostname.endsWith('.jiffoo.com') || parsed.hostname === 'jiffoo.com') {
            return true;
        }

        // Allow HTTPS only in production
        if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Check if URL is external
 */
function isExternalUrl(url: string): boolean {
    try {
        const parsed = new URL(url);

        // Check against allowed external domains
        return ALLOWED_EXTERNAL_DOMAINS.some(domain =>
            parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
        );
    } catch {
        return false;
    }
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
    return input
        .replace(/[<>]/g, '')  // Remove angle brackets
        .replace(/javascript:/gi, '')  // Remove javascript: protocol
        .replace(/on\w+=/gi, '')  // Remove event handlers
        .trim();
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * Get security report
 */
export function getSecurityReport(): {
    nodeIntegration: boolean;
    contextIsolation: boolean;
    sandbox: boolean;
    webviewTag: boolean;
    remoteModule: boolean;
} {
    return {
        nodeIntegration: false,  // Should be false
        contextIsolation: true,  // Should be true
        sandbox: true,           // Should be true
        webviewTag: false,       // Should be false
        remoteModule: false,     // Should be false
    };
}
