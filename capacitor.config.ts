import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.bonded.app',
    appName: 'Bonded',
    webDir: 'out',
    server: {
        // Use the live Vercel URL — this wraps the existing web app in a native shell
        url: 'https://bonded-beta.vercel.app',
        cleartext: true,
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: '#0a0a0f',
            showSpinner: false,
            androidSplashResourceName: 'splash',
            splashFullScreen: true,
            splashImmersive: true,
        },
        PushNotifications: {
            presentationOptions: ['badge', 'sound', 'alert'],
        },
        StatusBar: {
            style: 'DARK',
            backgroundColor: '#0a0a0f',
        },
    },
    android: {
        allowMixedContent: true,
        captureInput: true,
        webContentsDebuggingEnabled: false,
    },
};

export default config;
