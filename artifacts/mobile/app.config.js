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
      versionCode: 39,
      permissions: [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.VIBRATE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.CAMERA",
      ],
      blockedPermissions: [
        "android.permission.READ_PHONE_STATE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.RECORD_AUDIO",
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
      [
        "expo-image-picker",
        {
          // Do NOT set photosPermission — that auto-adds READ_MEDIA_IMAGES /
          // READ_MEDIA_VIDEO / READ_EXTERNAL_STORAGE to the manifest, which
          // Google Play rejects. We use Android Photo Picker (system UI) which
          // requires no permission. cameraPermission is kept since the user
          // can also capture a fresh photo for a note.
          photosPermission: false,
          cameraPermission: "HyperRecall uses the camera so you can capture photos of your notes, textbooks, or whiteboards and add them to a note.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#4f46e5",
          sounds: [],
        },
      ],
      "@react-native-google-signin/google-signin",
      "./plugins/withRemoveMediaPermissions",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: false,
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
