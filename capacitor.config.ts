import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rami.educational',
  appName: 'Rami',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
