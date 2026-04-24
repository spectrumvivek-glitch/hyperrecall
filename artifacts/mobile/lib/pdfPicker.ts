import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";

import { NoteAttachment, generateId } from "@/lib/storage";

export interface PdfPickResult {
  attachments: NoteAttachment[];
  errorMessage?: string;
}

async function copyPdfToDocumentsDir(
  uri: string,
  fallbackName: string,
): Promise<string> {
  if (Platform.OS === "web") return uri;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const FileSystem = require("expo-file-system");
    const dir: string | null = FileSystem.documentDirectory;
    if (!dir) return uri;
    const safeName = fallbackName.replace(/[^a-zA-Z0-9._-]/g, "_") || "doc.pdf";
    const filename = `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
    const folder = `${dir}recallify_pdfs`;
    const dest = `${folder}/${filename}`;
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

export async function pickPdfFromDevice(): Promise<PdfPickResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { attachments: [] };
    }

    const persistent = await Promise.all(
      result.assets.map(async (asset) => {
        const uri = await copyPdfToDocumentsDir(asset.uri, asset.name ?? "document.pdf").catch(
          () => asset.uri,
        );
        const att: NoteAttachment = {
          id: generateId(),
          noteId: "",
          uri,
          name: asset.name ?? "document.pdf",
          mimeType: asset.mimeType ?? "application/pdf",
          sizeBytes: asset.size ?? undefined,
        };
        return att;
      }),
    );

    return { attachments: persistent };
  } catch (err: any) {
    return {
      attachments: [],
      errorMessage: err?.message ?? "Couldn't pick PDF.",
    };
  }
}

export async function deleteLocalPdf(uri: string): Promise<void> {
  if (Platform.OS === "web") return;
  if (!uri.startsWith("file://")) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const FileSystem = require("expo-file-system");
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
