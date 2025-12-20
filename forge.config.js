const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');

module.exports = {
    packagerConfig: {
        name: 'Jiffoo Mall',
        executableName: 'jiffoo-mall',
        appBundleId: 'com.jiffoo.mall.desktop',
        appCategoryType: 'public.app-category.shopping',
        icon: path.join(__dirname, 'assets', 'icon'),
        asar: true,
        prune: true,
        // macOS specific
        osxSign: {
            identity: process.env.APPLE_IDENTITY,
            'hardened-runtime': true,
            entitlements: path.join(__dirname, 'entitlements.plist'),
            'entitlements-inherit': path.join(__dirname, 'entitlements.plist'),
            'gatekeeper-assess': false,
        },
        osxNotarize: {
            tool: 'notarytool',
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_ID_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID,
        },
        // Windows specific
        win32metadata: {
            CompanyName: 'Jiffoo',
            ProductName: 'Jiffoo Mall Desktop',
            FileDescription: 'Desktop applications for Jiffoo Mall',
            OriginalFilename: 'jiffoo-mall.exe',
        },
        // Ignore patterns
        ignore: [
            /^\/\.git/,
            /^\/\.vscode/,
            /^\/node_modules\/\.cache/,
            /^\/\.env/,
            /^\/\.eslintrc/,
            /^\/tsconfig\.json/,
            /\.map$/,
            /\.md$/,
            /\.test\./,
            /\.spec\./,
        ],
        // Extra resources
        extraResource: [
            path.join(__dirname, 'assets'),
        ],
    },
    rebuildConfig: {},
    makers: [
        // Windows - Squirrel
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: 'JiffooMall',
                authors: 'Jiffoo Team',
                description: 'Desktop applications for Jiffoo Mall',
                iconUrl: 'https://jiffoo.com/desktop/icon.ico',
                setupIcon: path.join(__dirname, 'assets', 'icon.ico'),
                loadingGif: path.join(__dirname, 'assets', 'loading.gif'),
                // Code signing
                certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
                certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
            },
        },
        // macOS - ZIP
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
        },
        // macOS - DMG
        {
            name: '@electron-forge/maker-dmg',
            config: {
                name: 'Jiffoo Mall',
                icon: path.join(__dirname, 'assets', 'icon.icns'),
                background: path.join(__dirname, 'assets', 'dmg-background.png'),
                format: 'ULFO',
                contents: [
                    { x: 130, y: 220, type: 'file', path: path.join(__dirname, 'out', 'Jiffoo Mall-darwin-arm64', 'Jiffoo Mall.app') },
                    { x: 410, y: 220, type: 'link', path: '/Applications' },
                ],
                window: {
                    size: { width: 540, height: 380 },
                },
            },
        },
        // Linux - DEB
        {
            name: '@electron-forge/maker-deb',
            config: {
                options: {
                    name: 'jiffoo-mall',
                    productName: 'Jiffoo Mall',
                    genericName: 'Shopping App',
                    description: 'Desktop applications for Jiffoo Mall',
                    maintainer: 'Jiffoo Team <team@jiffoo.com>',
                    homepage: 'https://jiffoo.com',
                    icon: path.join(__dirname, 'assets', 'icons'),
                    categories: ['Network', 'Office'],
                    mimeType: ['x-scheme-handler/jiffoo'],
                },
            },
        },
        // Linux - RPM
        {
            name: '@electron-forge/maker-rpm',
            config: {
                options: {
                    name: 'jiffoo-mall',
                    productName: 'Jiffoo Mall',
                    genericName: 'Shopping App',
                    description: 'Desktop applications for Jiffoo Mall',
                    homepage: 'https://jiffoo.com',
                    icon: path.join(__dirname, 'assets', 'icons'),
                    categories: ['Network', 'Office'],
                },
            },
        },
    ],
    plugins: [
        // Vite plugin
        {
            name: '@electron-forge/plugin-vite',
            config: {
                build: [
                    {
                        entry: 'src/main.ts',
                        config: 'vite.main.config.ts',
                        target: 'main',
                    },
                    {
                        entry: 'src/preload.ts',
                        config: 'vite.preload.config.ts',
                        target: 'preload',
                    },
                ],
                renderer: [
                    {
                        name: 'main_window',
                        config: 'vite.renderer.config.ts',
                    },
                ],
            },
        },
        // Auto-unpack native modules
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {},
        },
        // Security fuses
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
    publishers: [
        // GitHub Release
        {
            name: '@electron-forge/publisher-github',
            config: {
                repository: {
                    owner: 'thefreelight',
                    name: 'jiffoo-mall-core',
                },
                prerelease: false,
                draft: true,
            },
        },
    ],
    // Auto-updater configuration
    autoUpdater: {
        provider: 'github',
        owner: 'thefreelight',
        repo: 'jiffoo-mall-core',
        releaseType: 'release',
    },
};
