module.exports = {
  expo: {
    name: "HyperRecall",
    slug: "hyperrecall",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "mobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#0f172a",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.recallify.app",
    },
    android: {
      package: "com.recallify.app",
      versionCode: 10,
      permissions: [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.VIBRATE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.READ_MEDIA_IMAGES",
      ],
      blockedPermissions: [
        "android.permission.READ_PHONE_STATE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
      ],
    },
    web: {
      favicon: "./assets/images/icon.png",
    },
    plugins: [
      [
        "expo-router",
        {
          origin: "https://replit.com/",
        },
      ],
      "expo-font",
      "expo-web-browser",
      "expo-image-picker",
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#4f46e5",
          sounds: [],
        },
      ],
      "@react-native-google-signin/google-signin",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      firebaseApiKey: process.env.GOOGLE_API_KEY ?? "",
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
      eas: {
        projectId: "ae680483-bbab-41de-b831-f357934ee0ed",
      },
    },
    owner: "suyash0009",
  },
};
