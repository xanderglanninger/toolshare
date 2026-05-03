import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'za.co.toolshare.app',
  appName: 'ToolShare',
  webDir: 'out',
  server: {
    url: 'https://www.toolshare.co.za/login',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
