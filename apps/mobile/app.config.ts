import type { ExpoConfig } from "expo/config";

// P3.6: RevenueCat's SDK keys ship inside the app, which is fine for the
// PUBLIC (app-specific) keys. Its SECRET keys are "prefixed `sk_`" and must
// never be embedded (RevenueCat's authentication docs). A secret pasted into
// one of these variables would ship to every user, so the build refuses it,
// naming the variable, never the value.
for (const name of ["EXPO_PUBLIC_REVENUECAT_IOS_KEY", "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY"]) {
  if (process.env[name]?.trim().startsWith("sk_")) {
    throw new Error(`${name} holds a RevenueCat SECRET key (sk_…). Only the public app-specific SDK key may ship in the app.`);
  }
}

const config: ExpoConfig = {
  name: "Zeno",
  slug: "zeno",
  owner: "pratikk_expo",
  scheme: "zeno",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "app.zeno.mobile",
    config: {
      // Accurate export-compliance posture (P2.12). The app bundles SQLCipher
      // (OpenSSL AES-256) to encrypt the local database at rest — that is
      // non-exempt encryption beyond the HTTPS/TLS carve-out, so a blanket
      // `false` here would be a false declaration. We declare encryption use and
      // rely on the mass-market exemption for standard algorithms (ECCN 5D992.c,
      // EAR 740.17(b)(1)); this requires filing an annual self-classification
      // report to BIS/NSA before shipping — tracked as a release-checklist owner
      // action. Once Apple issues an ITSEncryptionExportComplianceCode from that
      // filing, add it under infoPlist to skip the per-submission questionnaire.
      usesNonExemptEncryption: true
    },
    infoPlist: {
      NSFaceIDUsageDescription: "Allow Zeno to unlock your private subscription dashboard with Face ID."
    }
  },
  android: {
    package: "app.zeno.mobile",
    // P3.1 (finding F92). Expo's default is true, and Android Auto Backup then
    // copied the app's data off the device (Google backup, device transfer):
    // the plaintext AsyncStorage file, with the widget snapshot naming the next
    // renewal and the monthly spend, and the SQLCipher database without its key.
    // expo-secure-store's backup rules (below) only ever excluded its own data.
    allowBackup: false,
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
    "expo-font",
    "expo-notifications",
    // Inert without EXPO_PUBLIC_SENTRY_DSN (see src/monitoring/report.ts) — the
    // plugin itself has no required config; source-map upload (org/project/
    // authToken) is opt-in and intentionally not configured until there's a
    // real Sentry project to upload to.
    "@sentry/react-native",
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
    // Real PBKDF2 for PIN hashing (src/security/app-lock.ts) — expo-crypto has
    // no PBKDF2/HMAC primitive, only plain digests. Native module, like
    // expo-sqlite's SQLCipher above: requires a prebuild + custom dev client,
    // not usable in Expo Go.
    "react-native-quick-crypto",
    [
      // react-native-quick-crypto and expo-sqlite's SQLCipher build both bundle
      // their own libcrypto.so for the same ABI, which fails Android's native
      // lib merge with a duplicate-path error unless one is picked explicitly.
      "expo-build-properties",
      {
        android: {
          packagingOptions: {
            pickFirst: ["**/libcrypto.so"]
          },
          // P3.1 (finding F93): R8 shrinks and obfuscates the release build
          // (it never ran: the template's default is off). Keep rules come
          // only from evidence (R8's missing_rules.txt, the on-device smoke).
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          // Explicit, not implied by the target SDK: release traffic is TLS
          // only. The debug manifest still allows cleartext for Metro.
          usesCleartextTraffic: false
        }
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
    eas: {
      projectId: "5de3240d-3fbf-4aa7-ae0b-492bfa5db627"
    },
    apiBaseUrl: process.env.PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8787/api/v1",
    // Public website origin for legal links / share copy. Default applied in
    // src/config/site.ts so the domain is spelled out in exactly one place.
    siteUrl: process.env.EXPO_PUBLIC_SITE_URL,
    google: {
      expoClientId: process.env.GOOGLE_EXPO_CLIENT_ID,
      webClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
      androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID
    },
    revenueCat: {
      iosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      androidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
    },
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN
  }
};

export default config;
