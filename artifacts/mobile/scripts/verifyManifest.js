#!/usr/bin/env node
/**
 * Verify that the built Android AAB / APK does NOT contain disallowed media permissions.
 *
 * Usage:
 *   pnpm --filter @workspace/mobile run verify:manifest -- path/to/app.aab
 *
 * Requires `bundletool` (for AAB) or `aapt2` (for APK) on PATH.
 *
 * Exits with code 0 if clean, 1 if any disallowed permission is present.
 */
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const DISALLOWED = [
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
];

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: verify:manifest <path-to-aab-or-apk>");
  process.exit(2);
}
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(2);
}

const ext = path.extname(filePath).toLowerCase();
let manifestText;

try {
  if (ext === ".aab") {
    manifestText = execSync(
      `bundletool dump manifest --bundle="${filePath}"`,
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
    );
  } else if (ext === ".apk") {
    manifestText = execSync(`aapt2 dump xmltree "${filePath}" --file AndroidManifest.xml`, {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
  } else {
    console.error(`Unsupported file type: ${ext}. Pass an .aab or .apk.`);
    process.exit(2);
  }
} catch (err) {
  console.error("Failed to dump manifest. Is bundletool / aapt2 installed?");
  console.error(err?.message || err);
  process.exit(2);
}

const found = DISALLOWED.filter((p) => manifestText.includes(p));

if (found.length > 0) {
  console.error("\n❌ Manifest still contains disallowed permissions:\n");
  for (const p of found) console.error(`   - ${p}`);
  console.error("\nFix the config plugin and rebuild.\n");
  process.exit(1);
}

console.log("\n✅ Manifest is clean — none of the disallowed media permissions are present.\n");
for (const p of DISALLOWED) console.log(`   ✓ ${p} absent`);
console.log("");
process.exit(0);
