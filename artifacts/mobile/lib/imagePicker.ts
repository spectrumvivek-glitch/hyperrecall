/**
 * Shared image-picking helper.
 *
 * On Android 13+ with expo-image-picker v17, calling launchImageLibraryAsync
 * with `mediaTypes: ['images']` uses the system Photo Picker, which does NOT
 * require any runtime permission (READ_MEDIA_IMAGES). So we DO NOT request a
 * permission upfront — that was triggering a broken Android permission dialog
 * (and there was no way to grant it from app settings on some devices).
 *
 * If the picker truly fails (e.g. very old Android), we surface an Alert with
 * an "Open Settings" button so the user can grant access manually.
 */

import * as ImagePicker from "expo-image-picker";
import { Alert, Linking, Platform } from "react-native";

import { makePersistentUri } from "@/lib/imageUtils";
import { NoteImage, generateId } from "@/lib/storage";

export interface PickResult {
  images: NoteImage[];
  errorMessage?: string;
}

export async function pickImagesFromLibrary(): Promise<PickResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      base64: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { images: [] };
    }

    const persistentUris = await Promise.all(
      result.assets.map((asset) =>
        makePersistentUri(asset.uri).catch(() => asset.uri),
      ),
    );

    const images: NoteImage[] = result.assets.map((asset, i) => ({
      id: generateId(),
      noteId: "",
      uri: persistentUris[i],
      thumbnailUri: persistentUris[i],
    }));

    return { images };
  } catch (err: any) {
    // Most common cause on older Android: permission was denied permanently.
    // Offer to open the system settings page for this app.
    if (Platform.OS !== "web") {
      Alert.alert(
        "Couldn't open photo library",
        "If you previously denied photo access, you can enable it from system settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              Linking.openSettings().catch(() => {});
            },
          },
        ],
      );
    }
    return {
      images: [],
      errorMessage: err?.message ?? "Couldn't open photo library.",
    };
  }
}
