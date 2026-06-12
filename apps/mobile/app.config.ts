import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Zeno",
  slug: "subradar",
  scheme: "subradar",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "app.subradar.mobile",
    config: {
      usesNonExemptEncryption: false
    },
    infoPlist: {
      NSFaceIDUsageDescription: "Allow Zeno to unlock your private subscription dashboard with Face ID."
    }
  },
  android: {
    package: "app.subradar.mobile",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0A0F2C"
    },
    permissions: [
      "USE_BIOMETRIC",
      "USE_FINGERPRINT",
      "POST_NOTIFICATIONS"
    ]
  },
  web: {
    bundler: "metro",
    output: "static"
  },
  plugins: [
    "expo-router",
    "expo-notifications",
    [
      "expo-secure-store",
      {
        configureAndroidBackup: true,
        faceIDPermission: "Allow Zeno to unlock your private subscription dashboard with Face ID."
      }
    ],
    [
      "expo-sqlite",
      {
        enableFTS: true,
        useSQLCipher: true
      }
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 220,
        backgroundColor: "#0A0F2C"
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    apiBaseUrl: process.env.PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8787/api/v1",
    google: {
      expoClientId: process.env.GOOGLE_EXPO_CLIENT_ID,
      webClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
      androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID
    },
    revenueCat: {
      iosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      androidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
    }
  }
};

export default config;
