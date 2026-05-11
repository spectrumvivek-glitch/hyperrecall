const { withAndroidManifest } = require("@expo/config-plugins");

const PERMISSIONS_TO_REMOVE = [
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
];

function withRemoveMediaPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (!manifest) return cfg;

    if (Array.isArray(manifest["uses-permission"])) {
      manifest["uses-permission"] = manifest["uses-permission"].filter((p) => {
        const name = p?.$?.["android:name"];
        return !PERMISSIONS_TO_REMOVE.includes(name);
      });
    }

    if (Array.isArray(manifest["uses-permission-sdk-23"])) {
      manifest["uses-permission-sdk-23"] = manifest["uses-permission-sdk-23"].filter((p) => {
        const name = p?.$?.["android:name"];
        return !PERMISSIONS_TO_REMOVE.includes(name);
      });
    }

    return cfg;
  });
}

module.exports = withRemoveMediaPermissions;
